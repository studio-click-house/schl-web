'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';

import NoData, { Type } from '@/components/NoData';
import { type ShiftType } from '@repo/common/constants/shift.constant';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import CreateButton from './Create';
import DeleteButton from './Delete';
import EditButton from './Edit';

export interface ShiftDataType {
    _id?: string;
    type: ShiftType;
    name: string;
    start_time: string;
    end_time: string;
    grace_minutes: number;
    crosses_midnight: boolean;
    is_active: boolean;
}

type ShiftsState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: ShiftDataType[];
};

const ShiftConfigTable: React.FC = () => {
    const [shifts, setShifts] = useState<ShiftsState>({
        pagination: { count: 0, pageCount: 0 },
        items: [],
    });

    const { data: session } = useSession();
    const authedFetchApi = useAuthedFetchApi();

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const [loading, setLoading] = useState<boolean>(true);

    const getAllShifts = useCallback(async () => {
        try {
            setLoading(true);
            const response = await authedFetchApi<ShiftDataType[]>(
                { path: '/v1/shift/list' },
                { method: 'GET' },
            );

            if (response.ok) {
                setShifts({
                    pagination: { count: response.data.length, pageCount: 1 },
                    items: response.data,
                });
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving shifts data');
        } finally {
            setLoading(false);
        }
    }, [authedFetchApi]);

    useEffect(() => {
        getAllShifts();
    }, [getAllShifts]);

    const deleteShift = useCallback(
        async (shiftData: ShiftDataType) => {
            try {
                if (!hasPerm('admin:manage_shifts', userPermissions)) {
                    toast.error("You don't have permission to delete shifts");
                    return;
                }

                const response = await authedFetchApi<{ message: string }>(
                    { path: `/v1/shift/delete/${shiftData._id}` },
                    { method: 'DELETE' },
                );

                if (response.ok) {
                    toast.success('Deleted the shift successfully');
                    await getAllShifts();
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while deleting the shift');
            }
        },
        [authedFetchApi, getAllShifts, userPermissions],
    );

    const editShift = useCallback(
        async (
            editedShiftData: ShiftDataType,
            previousShiftData: ShiftDataType,
        ) => {
            try {
                if (!hasPerm('admin:manage_shifts', userPermissions)) {
                    toast.error("You don't have permission to edit shifts");
                    return;
                }

                setLoading(true);

                const response = await authedFetchApi<{ message: string }>(
                    { path: `/v1/shift/update/${editedShiftData._id}` },
                    {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(editedShiftData),
                    },
                );

                if (response.ok) {
                    toast.success('Updated the shift data');
                    await getAllShifts();
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while updating the shift');
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi, getAllShifts, userPermissions],
    );

    const createShift = useCallback(
        async (shiftData: ShiftDataType) => {
            try {
                if (!hasPerm('admin:manage_shifts', userPermissions)) {
                    toast.error("You don't have permission to create shifts");
                    return;
                }

                setLoading(true);

                const response = await authedFetchApi<{ message: string }>(
                    { path: '/v1/shift/create' },
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(shiftData),
                    },
                );

                if (response.ok) {
                    toast.success('Created new shift successfully');
                    await getAllShifts();
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while creating the shift');
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi, getAllShifts, userPermissions],
    );

    return (
        <>
            <div
                className={cn(
                    'flex flex-col mb-4 gap-2',
                    hasPerm('admin:manage_shifts', userPermissions)
                        ? 'sm:flex-row sm:justify-between'
                        : 'sm:justify-end sm:flex-row',
                )}
            >
                <h2 className="text-xl font-semibold uppercase underline underline-offset-4">
                    Shift Configurations
                </h2>
                {hasPerm('admin:manage_shifts', userPermissions) && (
                    <CreateButton
                        loading={loading}
                        submitHandler={createShift}
                    />
                )}
            </div>

            {loading ? (
                <p className="text-center">Loading...</p>
            ) : (
                <div className="table-responsive text-nowrap text-base">
                    {shifts?.items?.length !== 0 ? (
                        <table className="table border table-bordered table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th>S/N</th>
                                    <th>Type</th>
                                    <th>Name</th>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                    <th>Grace (min)</th>
                                    <th>Status</th>
                                    {hasPerm(
                                        'admin:manage_shifts',
                                        userPermissions,
                                    ) && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {shifts?.items?.map((shift, index) => (
                                    <tr key={String(shift._id)}>
                                        <td>{index + 1}</td>
                                        <td className="capitalize">
                                            {shift.type}
                                        </td>
                                        <td>{shift.name}</td>
                                        <td>{shift.start_time}</td>
                                        <td>{shift.end_time}</td>
                                        <td>{shift.grace_minutes}</td>
                                        <td>
                                            <span
                                                className={cn(
                                                    'px-2 py-1 rounded text-xs',
                                                    shift.is_active
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800',
                                                )}
                                            >
                                                {shift.is_active
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </span>
                                        </td>
                                        {hasPerm(
                                            'admin:manage_shifts',
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
                                                            shiftData={shift}
                                                            submitHandler={
                                                                deleteShift
                                                            }
                                                        />
                                                        <EditButton
                                                            shiftData={shift}
                                                            submitHandler={
                                                                editShift
                                                            }
                                                            loading={loading}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <NoData
                            text="No shifts configured yet"
                            type={Type.info}
                        />
                    )}
                </div>
            )}

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

export default ShiftConfigTable;
