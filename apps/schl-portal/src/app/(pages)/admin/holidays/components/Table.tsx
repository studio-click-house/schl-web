'use client';

import NoData, { Type } from '@/components/NoData';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { Holiday } from '@repo/common/models/holiday.schema';
import { formatDate } from '@repo/common/utils/date-helpers';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import { ClockCheck } from 'lucide-react';
import moment from 'moment-timezone';
import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { HolidayData } from '../schema';
import CreateButton from './Create';
import DeleteButton from './Delete';
import EditButton from './Edit';
import FilterButton from './Filter';

interface HolidayWithId extends Omit<Holiday, 'flag'> {
    _id: string;
}

const getDefaultFilters = () => {
    const today = moment.tz('Asia/Dhaka');
    const startOfYear = today.clone().startOf('year').format('YYYY-MM-DD');
    const endOfYear = today.clone().endOf('year').format('YYYY-MM-DD');
    return {
        name: '',
        fromDate: startOfYear,
        toDate: endOfYear,
    };
};

const Table: React.FC = () => {
    const [holidays, setHolidays] = useState<HolidayWithId[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchVersion, setSearchVersion] = useState<number>(0);
    const authedFetchApi = useAuthedFetchApi();

    const { data: session } = useSession();
    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const [filters, setFilters] = useState(getDefaultFilters);
    const [appliedFilters, setAppliedFilters] = useState(getDefaultFilters);

    const fetchHolidays = useCallback(async () => {
        setLoading(true);
        try {
            const cleanedFilters = Object.entries(appliedFilters).reduce(
                (acc, [key, value]) => {
                    if (value && value !== '') {
                        acc[key] = value;
                    }
                    return acc;
                },
                {} as Record<string, any>,
            );

            const response = await authedFetchApi<HolidayWithId[]>(
                {
                    path: '/v1/holidays',
                    query: cleanedFilters,
                },
                { method: 'GET' },
            );

            if (response.ok) {
                setHolidays(response.data);
            } else {
                toast.error('Failed to fetch holidays');
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving holidays');
        } finally {
            setLoading(false);
        }
    }, [authedFetchApi, appliedFilters]);

    useEffect(() => {
        fetchHolidays();
    }, [fetchHolidays, searchVersion]);

    const handleSearch = useCallback(
        (overrideFilters?: any) => {
            setAppliedFilters(overrideFilters || filters);
            setSearchVersion(v => v + 1);
        },
        [filters],
    );

    const createHoliday = async (data: HolidayData) => {
        try {
            const response = await authedFetchApi(
                { path: '/v1/holidays' },
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                },
            );

            if (response.ok) {
                toast.success('Holiday added successfully');
                fetchHolidays();
                return true;
            } else {
                toastFetchError(response);
                return false;
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while adding holiday');
            return false;
        }
    };

    const editHoliday = async (id: string, data: HolidayData) => {
        try {
            const response = await authedFetchApi(
                { path: `/v1/holidays/${id}` },
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                },
            );

            if (response.ok) {
                toast.success('Holiday updated successfully');
                fetchHolidays();
                return true;
            } else {
                toastFetchError(response);
                return false;
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while updating holiday');
            return false;
        }
    };

    const deleteHoliday = async (id: string) => {
        try {
            const response = await authedFetchApi(
                { path: `/v1/holidays/${id}` },
                { method: 'DELETE' },
            );
            if (response.ok) {
                toast.success('Holiday deleted successfully');
                fetchHolidays();
                return true;
            } else {
                toastFetchError(response);
                return false;
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while deleting holiday');
            return false;
        }
    };

    const canEdit = hasPerm('admin:edit_holiday', userPermissions);
    const canCreate = hasPerm('admin:create_holiday', userPermissions);

    return (
        <>
            <div className="flex flex-col sm:flex-row mb-4 gap-4 sm:gap-2 items-center justify-between">
                <div className="flex-none sm:min-w-[150px] w-full sm:w-auto flex justify-center sm:justify-start">
                    {canCreate && (
                        <CreateButton
                            submitHandler={createHoliday}
                            className="w-full sm:w-auto"
                        />
                    )}
                </div>

                {(appliedFilters.fromDate || appliedFilters.toDate) && (
                    <div className="flex flex-1 justify-center items-center text-xl text-gray-900 font-semibold sm:whitespace-nowrap px-4 text-center">
                        {appliedFilters.fromDate && (
                            <span className="flex items-center">
                                <ClockCheck
                                    size={23}
                                    className="mr-2 flex-shrink-0"
                                />
                                <span className="flex-wrap">
                                    {formatDate(appliedFilters.fromDate)}
                                </span>
                                {appliedFilters.toDate && (
                                    <span className="mx-1 mt-0.5">–</span>
                                )}
                            </span>
                        )}
                        {appliedFilters.toDate && (
                            <span className="flex-wrap">
                                {formatDate(appliedFilters.toDate)}
                            </span>
                        )}
                    </div>
                )}

                <div className="flex flex-none sm:min-w-[150px] w-full sm:w-auto justify-center sm:justify-end">
                    <FilterButton
                        loading={loading}
                        submitHandler={handleSearch}
                        setFilters={setFilters}
                        filters={filters}
                        className="w-full sm:w-auto"
                    />
                </div>
            </div>

            {loading ? (
                <p className="text-center text-gray-500 mb-4 font-semibold">
                    Loading...
                </p>
            ) : null}

            <div className="table-responsive text-nowrap text-base">
                {!loading &&
                    (holidays.length > 0 ? (
                        <table className="table border table-bordered table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th className="text-center">S/N</th>
                                    <th>Name</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Comment</th>
                                    {canEdit && (
                                        <th className="text-center">Action</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {holidays.map((holiday, index) => {
                                    return (
                                        <tr key={holiday._id}>
                                            <td
                                                className="text-center"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {index + 1}
                                            </td>
                                            <td
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {holiday.name}
                                            </td>
                                            <td
                                                className="text-wrap"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {formatDate(
                                                    String(holiday.dateFrom),
                                                )}
                                            </td>
                                            <td
                                                className="text-wrap"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {holiday.dateTo
                                                    ? formatDate(
                                                          String(
                                                              holiday.dateTo,
                                                          ),
                                                      )
                                                    : '-'}
                                            </td>
                                            <td
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {holiday.comment
                                                    ? String(holiday.comment)
                                                    : '-'}
                                            </td>
                                            {canEdit && (
                                                <td
                                                    className="text-center"
                                                    style={{
                                                        verticalAlign: 'middle',
                                                    }}
                                                >
                                                    <div className="flex gap-2 justify-center">
                                                        <EditButton
                                                            holiday={holiday}
                                                            submitHandler={
                                                                editHoliday
                                                            }
                                                        />
                                                        <DeleteButton
                                                            holiday={holiday}
                                                            submitHandler={
                                                                deleteHoliday
                                                            }
                                                        />
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <NoData text="No Holidays Found" type={Type.danger} />
                    ))}
            </div>

            <style jsx>
                {`
                    th,
                    td {
                        padding: 2.5px 10px;
                    }
                `}
            </style>
        </>
    );
};

export default Table;
