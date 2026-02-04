'use client';

import Badge from '@/components/Badge';
import ExtendableTd from '@/components/ExtendableTd';
import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import { CirclePlus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import DeleteButton from './Delete';
import EditButton from './Edit';
import FilterButton from './Filter';

type DeviceUsersState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: any[];
};

interface TableProps {
    employeesData: EmployeeDocument[];
}

const Table: React.FC<TableProps> = ({ employeesData }) => {
    const [deviceUsers, setDeviceUsers] = useState<DeviceUsersState>({
        pagination: {
            count: 0,
            pageCount: 0,
        },
        items: [],
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [isFiltered, setIsFiltered] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [itemPerPage, setItemPerPage] = useState<number>(30);
    const [searchVersion, setSearchVersion] = useState<number>(0);

    const { data: session } = useSession();
    const authedFetchApi = useAuthedFetchApi();
    const router = useRouter();

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const [filters, setFilters] = useState({
        searchString: '',
    });

    const getAllDeviceUsers = useCallback(
        async (page: number, itemPerPage: number) => {
            setLoading(true);
            try {
                const response = await authedFetchApi<DeviceUsersState>(
                    {
                        path: '/v1/device-user/search',
                        query: {
                            page,
                            itemsPerPage: itemPerPage,
                            paginated: true,
                        },
                    },
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({}),
                    },
                );

                if (response.ok) {
                    const payload = response.data;
                    setDeviceUsers(payload);
                    setPageCount(payload.pagination.pageCount);
                    setIsFiltered(false);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error(
                    'An error occurred while retrieving device users data',
                );
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi],
    );

    const getAllDeviceUsersFiltered = useCallback(
        async (page: number, itemPerPage: number) => {
            setLoading(true);
            try {
                const filterPayload = {
                    ...(filters.searchString.trim()
                        ? { searchString: filters.searchString.trim() }
                        : {}),
                };

                const response = await authedFetchApi<DeviceUsersState>(
                    {
                        path: '/v1/device-user/search',
                        query: {
                            page,
                            itemsPerPage: itemPerPage,
                            paginated: true,
                        },
                    },
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(filterPayload),
                    },
                );

                if (response.ok) {
                    const payload = response.data;
                    setDeviceUsers(payload);
                    setPageCount(payload.pagination.pageCount);
                    setIsFiltered(true);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error(
                    'An error occurred while retrieving device users data',
                );
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi, filters.searchString],
    );

    async function deleteDeviceUser(deviceUserData: any) {
        try {
            const response = await authedFetchApi(
                {
                    path: `/v1/device-user/delete-user/${deviceUserData._id}`,
                },
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            );

            if (response.ok) {
                toast.success('Deleted the device user');
                await fetchDeviceUsers();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while deleting the device user');
        }
    }

    async function editDeviceUser(editedDeviceUserData: Partial<any>) {
        try {
            setLoading(true);

            if (!editedDeviceUserData._id) {
                toast.error('Missing device user identifier');
                return;
            }

            const { _id, createdAt, updatedAt, ...rest } = editedDeviceUserData;

            const payload = Object.fromEntries(
                Object.entries(rest).filter(([, value]) => value !== undefined),
            );

            const response = await authedFetchApi(
                {
                    path: `/v1/device-user/update-user/${_id}`,
                },
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (response.ok) {
                toast.success('Updated the device user data');
                await fetchDeviceUsers();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while updating the device user');
        } finally {
            setLoading(false);
        }
    }

    const fetchDeviceUsers = useCallback(async () => {
        if (!isFiltered) {
            await getAllDeviceUsers(page, itemPerPage);
        } else {
            await getAllDeviceUsersFiltered(page, itemPerPage);
        }
    }, [
        isFiltered,
        getAllDeviceUsers,
        getAllDeviceUsersFiltered,
        page,
        itemPerPage,
    ]);

    usePaginationManager({
        page,
        itemPerPage,
        pageCount,
        setPage,
        triggerFetch: fetchDeviceUsers,
    });

    useEffect(() => {
        if (searchVersion > 0 && page === 1) {
            fetchDeviceUsers();
        }
    }, [searchVersion, page]);

    const handleSearch = useCallback(() => {
        const hasFilter = filters.searchString.trim().length > 0;
        setIsFiltered(hasFilter);
        setPage(1);
        setSearchVersion(v => v + 1);
    }, [filters.searchString, setPage]);

    return (
        <>
            <div
                className={cn(
                    'flex flex-col mb-4 gap-2',
                    hasPerm('admin:create_device_user', userPermissions)
                        ? 'sm:flex-row sm:justify-between'
                        : 'sm:justify-end sm:flex-row',
                )}
            >
                {hasPerm('admin:create_device_user', userPermissions) && (
                    <button
                        onClick={() =>
                            router.push(
                                process.env.NEXT_PUBLIC_BASE_URL +
                                    '/admin/device-users/create',
                            )
                        }
                        className="flex justify-between items-center gap-2 rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                    >
                        Add Device User
                        <CirclePlus size={18} />
                    </button>
                )}

                <div className="items-center flex gap-2">
                    <Pagination
                        page={page}
                        pageCount={pageCount}
                        setPage={setPage}
                        isLoading={loading}
                    />

                    <select
                        value={itemPerPage}
                        onChange={e => setItemPerPage(parseInt(e.target.value))}
                        required
                        className="appearance-none cursor-pointer px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-md leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    >
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>

                    <FilterButton
                        loading={loading}
                        submitHandler={handleSearch}
                        setFilters={setFilters}
                        filters={filters}
                        className="w-full justify-between sm:w-auto"
                    />
                </div>
            </div>

            {loading ? <p className="text-center">Loading...</p> : <></>}

            <div className="table-responsive text-nowrap text-base">
                {!loading &&
                    (deviceUsers?.items?.length !== 0 ? (
                        <table className="table border table-bordered table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th>S/N</th>
                                    <th>User ID</th>
                                    <th>Card Number</th>
                                    <th>Employee ID</th>
                                    <th>Employee Name</th>
                                    <th>Comment</th>
                                    {hasPerm(
                                        'admin:edit_device_user',
                                        userPermissions,
                                    ) && <th>Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {deviceUsers?.items?.map(
                                    (deviceUser: any, index: number) => (
                                        <tr key={String(deviceUser._id)}>
                                            <td>
                                                {(page - 1) * itemPerPage +
                                                    index +
                                                    1}
                                            </td>
                                            <td className="text-wrap">
                                                {deviceUser.user_id}
                                            </td>
                                            <td className="text-wrap">
                                                {deviceUser.card_number ? (
                                                    <Badge
                                                        value={
                                                            deviceUser.card_number
                                                        }
                                                        className="bg-blue-100 text-blue-800 border-blue-400"
                                                    />
                                                ) : (
                                                    <span className="text-gray-500">
                                                        -
                                                    </span>
                                                )}
                                            </td>
                                            <td className="text-wrap">
                                                {deviceUser.employee?.e_id ||
                                                    '-'}
                                            </td>
                                            <td className="text-wrap">
                                                {hasPerm(
                                                    'admin:view_device_user',
                                                    userPermissions,
                                                ) ? (
                                                    <Link
                                                        className="hover:underline underline-offset-2"
                                                        href={`/accountancy/employees/employee-profile/?code=${encodeURIComponent(String(deviceUser.employee?.e_id))}`}
                                                    >
                                                        {deviceUser.employee
                                                            ?.real_name || '-'}
                                                    </Link>
                                                ) : (
                                                    <span>
                                                        {deviceUser.employee
                                                            ?.real_name || '-'}
                                                    </span>
                                                )}
                                            </td>
                                            <ExtendableTd
                                                data={deviceUser.comment}
                                            />

                                            {hasPerm(
                                                'admin:edit_device_user',
                                                userPermissions,
                                            ) && (
                                                <td
                                                    className="text-center"
                                                    style={{
                                                        verticalAlign: 'middle',
                                                    }}
                                                >
                                                    <div className="inline-block">
                                                        <div className="flex gap-2">
                                                            <DeleteButton
                                                                deviceUserData={
                                                                    deviceUser
                                                                }
                                                                submitHandler={
                                                                    deleteDeviceUser
                                                                }
                                                            />

                                                            <EditButton
                                                                loading={
                                                                    loading
                                                                }
                                                                deviceUserData={
                                                                    deviceUser
                                                                }
                                                                employeesData={
                                                                    employeesData
                                                                }
                                                                submitHandler={
                                                                    editDeviceUser
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <NoData
                            text="No Device Users Found"
                            type={Type.danger}
                        />
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
