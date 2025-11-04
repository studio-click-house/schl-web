'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';

import Badge from '@/components/Badge';
import ExtendableTd from '@/components/ExtendableTd';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { hasAnyPerm, hasPerm } from '@repo/common/utils/permission-check';

import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import type { RoleDocument } from '@repo/common/models/role.schema';
import type { FullyPopulatedUser } from '@repo/common/types/populated-user.type';
import { cn } from '@repo/common/utils/general-utils';

import { CirclePlus, ClipboardCopy } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { populatedUserSchema, ZodPopulatedUserDataType } from '../schema';
import DeleteButton from './Delete';
import EditButton from './Edit';
import FilterButton from './Filter';

type UsersState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: FullyPopulatedUser[];
};

const Table: React.FC<{
    employeesData: EmployeeDocument[];
    rolesData: RoleDocument[];
}> = props => {
    const authedFetchApi = useAuthedFetchApi();
    const [users, setUsers] = useState<UsersState>({
        pagination: {
            count: 0,
            pageCount: 0,
        },
        items: [] as FullyPopulatedUser[],
    });

    const router = useRouter();

    const [isFiltered, setIsFiltered] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [itemPerPage, setItemPerPage] = useState<number>(30);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchVersion, setSearchVersion] = useState<number>(0);

    const { data: session } = useSession();

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const [filters, setFilters] = useState({
        generalSearchString: '',
    });

    const getAllUsers = useCallback(
        async (page: number, itemPerPage: number) => {
            setLoading(true);
            try {
                const response = await authedFetchApi(
                    {
                        path: '/v1/user/search-users',
                        query: {
                            page,
                            itemsPerPage: itemPerPage,
                            paginated: true,
                            // filtered: false,
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
                    const payload = response.data as UsersState;
                    setUsers(payload);
                    setPageCount(payload.pagination.pageCount);
                    setIsFiltered(false);
                } else {
                    const message =
                        typeof response.data === 'string'
                            ? response.data
                            : response.data?.message ||
                              'Unable to retrieve users';
                    toast.error(message);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while retrieving users data');
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi],
    );

    const getAllUsersFiltered = useCallback(
        async (page: number, itemPerPage: number) => {
            setLoading(true);
            try {
                const filterPayload = {
                    ...(filters.generalSearchString.trim()
                        ? {
                              generalSearchString:
                                  filters.generalSearchString.trim(),
                          }
                        : {}),
                };

                const response = await authedFetchApi(
                    {
                        path: '/v1/user/search-users',
                        query: {
                            page,
                            itemsPerPage: itemPerPage,
                            paginated: true,
                            // filtered: true,
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
                    const payload = response.data as UsersState;
                    setUsers(payload);
                    setIsFiltered(true);
                    setPageCount(payload.pagination.pageCount);
                } else {
                    const message =
                        typeof response.data === 'string'
                            ? response.data
                            : response.data?.message ||
                              'Unable to retrieve users';
                    toast.error(message);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while retrieving users data');
            } finally {
                setLoading(false);
            }
            return;
        },
        [authedFetchApi, filters.generalSearchString],
    );

    const deleteUser = async (userData: FullyPopulatedUser) => {
        try {
            const response = await authedFetchApi(
                { path: '/v1/approval/new-request' },
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        target_model: 'User',
                        action: 'delete',
                        object_id: userData._id,
                        deleted_data: userData,
                    }),
                },
            );

            if (response.ok) {
                toast.success('Request sent for approval');
            } else {
                const message =
                    typeof response.data === 'string'
                        ? response.data
                        : response.data?.message ||
                          'Unable to submit approval request';
                toast.error(message);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while sending request for approval');
        }
        return;
    };

    const editUser = async (
        editedUserData: ZodPopulatedUserDataType,
        previousUserData: ZodPopulatedUserDataType,
    ) => {
        try {
            const parsed = populatedUserSchema.safeParse(editedUserData);

            if (!parsed.success) {
                console.error(parsed.error.issues.map(issue => issue.message));
                toast.error('Invalid form data');
                return;
            }

            const targetId = (previousUserData as unknown as FullyPopulatedUser)
                ?._id;

            if (!targetId) {
                toast.error('Unable to determine user to update');
                return;
            }

            setLoading(true);

            const userData = {
                username: parsed.data.username,
                password: parsed.data.password,
                employee: parsed.data.employee._id,
                role: parsed.data.role._id,
                ...(parsed.data.comment !== undefined
                    ? { comment: parsed.data.comment }
                    : {}),
            };

            const response = await authedFetchApi(
                { path: `/v1/user/update-user/${targetId}` },
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(userData),
                },
            );

            if (response.ok) {
                toast.success('Updated the user data');

                await fetchUsers();
            } else {
                const message =
                    typeof response.data === 'string'
                        ? response.data
                        : response.data?.message || 'Unable to update user';
                toast.error(message);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while updating the user');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = useCallback(async () => {
        if (!isFiltered) {
            await getAllUsers(page, itemPerPage);
        } else {
            await getAllUsersFiltered(page, itemPerPage);
        }
    }, [isFiltered, getAllUsers, getAllUsersFiltered, page, itemPerPage]);

    usePaginationManager({
        page,
        itemPerPage,
        pageCount,
        setPage,
        triggerFetch: fetchUsers,
    });

    useEffect(() => {
        if (searchVersion > 0 && page === 1) {
            fetchUsers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchVersion, page]);

    const handleSearch = useCallback(() => {
        const hasFilter = filters.generalSearchString.trim().length > 0;
        setIsFiltered(hasFilter);
        setPage(1);
        setSearchVersion(v => v + 1);
    }, [filters.generalSearchString, setPage]);

    return (
        <>
            <div
                className={cn(
                    'flex flex-col mb-4 gap-2',
                    hasAnyPerm(
                        ['admin:create_user_approval', 'admin:create_user'],
                        userPermissions,
                    )
                        ? 'sm:flex-row sm:justify-between'
                        : 'sm:justify-end sm:flex-row',
                )}
            >
                {hasAnyPerm(
                    ['admin:create_user_approval', 'admin:create_user'],
                    userPermissions,
                ) && (
                    <button
                        onClick={() =>
                            router.push(
                                process.env.NEXT_PUBLIC_BASE_URL +
                                    '/admin/users/create-user',
                            )
                        }
                        className="flex justify-between items-center gap-2 rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                    >
                        Add new user
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
                        // defaultValue={30}
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
                    (users?.items?.length !== 0 ? (
                        <table className="table border table-bordered table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th>S/N</th>
                                    <th>Full Name</th>
                                    <th>Username</th>
                                    <th>Role</th>
                                    <th>Comment</th>
                                    {hasAnyPerm(
                                        [
                                            'admin:edit_user',
                                            'admin:delete_user_approval',
                                        ],
                                        userPermissions,
                                    ) && <th>Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {users?.items
                                    ?.filter(u => {
                                        // Defense-in-depth: hide super-admin users from non–super-admin viewers
                                        const perms =
                                            (u as any)?.role_id?.permissions ||
                                            (u as any)?.role?.permissions ||
                                            [];
                                        const isTargetSuper = Array.isArray(
                                            perms,
                                        )
                                            ? perms.includes(
                                                  'settings:the_super_admin',
                                              )
                                            : false;
                                        return (
                                            hasPerm(
                                                'settings:the_super_admin',
                                                userPermissions,
                                            ) || !isTargetSuper
                                        );
                                    })
                                    .map((user, index) => (
                                        <tr key={String(user._id)}>
                                            <td>
                                                {index +
                                                    1 +
                                                    itemPerPage * (page - 1)}
                                            </td>
                                            <td className="text-wrap">
                                                {user.employee.real_name}
                                            </td>
                                            <td className="text-wrap">
                                                {user.username}
                                            </td>
                                            <td
                                                // className="text-center"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {/* Show role name if available from aggregation/populate; fallback to unknown */}
                                                <Badge
                                                    value={
                                                        ((user as any)?.role
                                                            ?.name ||
                                                            (user as any)
                                                                ?.role_id
                                                                ?.name ||
                                                            'unknown') as any
                                                    }
                                                    className="text-sm uppercase"
                                                />
                                            </td>
                                            <ExtendableTd
                                                data={user?.comment || ''}
                                            />

                                            {hasAnyPerm(
                                                [
                                                    'admin:edit_user',
                                                    'admin:delete_user_approval',
                                                ],
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
                                                            {/* Delete allowed only with approval perm, and not on super-admin unless viewer is super */}
                                                            {hasPerm(
                                                                'admin:delete_user_approval',
                                                                userPermissions,
                                                            ) && (
                                                                <DeleteButton
                                                                    userData={
                                                                        user
                                                                    }
                                                                    submitHandler={
                                                                        deleteUser
                                                                    }
                                                                />
                                                            )}

                                                            {/* Edit allowed only with edit perm, and not on super-admin unless viewer is super */}
                                                            {hasPerm(
                                                                'admin:edit_user',
                                                                userPermissions,
                                                            ) && (
                                                                <EditButton
                                                                    userData={
                                                                        user
                                                                    }
                                                                    employeesData={
                                                                        props.employeesData
                                                                    }
                                                                    rolesData={
                                                                        props.rolesData
                                                                    }
                                                                    submitHandler={
                                                                        editUser
                                                                    }
                                                                    loading={
                                                                        loading
                                                                    }
                                                                />
                                                            )}

                                                            {/* Copy credentials: block when masked (non–super) */}
                                                            {hasPerm(
                                                                'settings:the_super_admin',
                                                                userPermissions,
                                                            ) ||
                                                            (user as any)
                                                                ?.password !==
                                                                '******' ? (
                                                                <button
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(
                                                                            `${user.username} ${(user as any).password}`,
                                                                        );
                                                                        toast.info(
                                                                            'Copied to clipboard',
                                                                            {
                                                                                position:
                                                                                    'bottom-right',
                                                                            },
                                                                        );
                                                                    }}
                                                                    className={cn(
                                                                        'rounded-md bg-orange-600 hover:opacity-90 hover:ring-2 hover:ring-orange-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2 items-center',
                                                                    )}
                                                                >
                                                                    <ClipboardCopy
                                                                        size={
                                                                            18
                                                                        }
                                                                    />
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    ) : (
                        <NoData text="No Users Found" type={Type.danger} />
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
