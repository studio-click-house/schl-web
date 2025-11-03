'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';

import ExtendableTd from '@/components/ExtendableTd';
import Pagination from '@/components/Pagination';
import { RoleDocument } from '@repo/common/models/role.schema';
import type { Permissions } from '@repo/common/types/permission.type';
import { cn } from '@repo/common/utils/general-utils';

import { hasAnyPerm, hasPerm } from '@repo/common/utils/permission-check';
import { CirclePlus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'nextjs-toploader/app';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { toast } from 'sonner';
import { validationSchema, RoleDataType as zod_RoleDataType } from '../schema';
import DeleteButton from './Delete';
import EditButton from './Edit';
import FilterButton from './Filter';

type RolesState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: RoleDocument[];
};

const Table: React.FC = () => {
    const [roles, setRules] = useState<RolesState>({
        pagination: {
            count: 0,
            pageCount: 0,
        },
        items: [] as RoleDocument[],
    });

    const { data: session } = useSession();
    const authedFetchApi = useAuthedFetchApi();

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const router = useRouter();

    const [isFiltered, setIsFiltered] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [itemPerPage, setItemPerPage] = useState<number>(30);
    const [loading, setLoading] = useState<boolean>(true);

    const prevPageCount = useRef<number>(0);
    const prevPage = useRef<number>(1);

    const [filters, setFilters] = useState({
        name: '',
    });

    const getAllRoles = useCallback(async () => {
        try {
            // setLoading(true);

            const response = await authedFetchApi<RolesState>(
                {
                    path: '/v1/role/search-roles',
                    query: {
                        paginated: true,
                        filtered: false,
                        itemsPerPage: itemPerPage,
                        page,
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
                setRules(response.data);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving roles data');
        } finally {
            setLoading(false);
        }
    }, [authedFetchApi, itemPerPage, page]);

    const getAllRolesFiltered = useCallback(async () => {
        try {
            // setLoading(true);

            const response = await authedFetchApi<RolesState>(
                {
                    path: '/v1/role/search-roles',
                    query: {
                        paginated: true,
                        filtered: true,
                        itemsPerPage: itemPerPage,
                        page: isFiltered ? page : 1,
                    },
                },
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...filters,
                    }),
                },
            );

            if (response.ok) {
                setRules(response.data);
                setIsFiltered(true);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving roles data');
        } finally {
            setLoading(false);
        }
        return;
    }, [authedFetchApi, filters, isFiltered, itemPerPage, page]);

    const deleteRole = useCallback(
        async (roleData: RoleDocument) => {
            try {
                if (
                    !session?.user?.permissions?.includes('admin:delete_role')
                ) {
                    toast.error(
                        "You don't have the permission to delete roles",
                    );
                    return;
                }

                const response = await authedFetchApi<{ message: string }>(
                    { path: `/v1/role/delete-role/${roleData._id}` },
                    {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    },
                );

                if (response.ok) {
                    toast.success('Deleted the role successfully');
                    if (!isFiltered) {
                        await getAllRoles();
                    } else {
                        await getAllRolesFiltered();
                    }
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while deleting the role');
            }
            return;
        },
        [
            authedFetchApi,
            getAllRoles,
            getAllRolesFiltered,
            isFiltered,
            session?.user?.permissions,
        ],
    );

    const editRole = useCallback(
        async (
            editedRoleData: zod_RoleDataType,
            previousRoleData: zod_RoleDataType,
        ) => {
            try {
                const parsed = validationSchema.safeParse(editedRoleData);

                if (!parsed.success) {
                    console.error(
                        parsed.error.issues.map(issue => issue.message),
                    );
                    toast.error('Invalid form data');
                    return;
                }

                const userPerms = session?.user?.permissions || [];
                const superAdminPerm = 'settings:the_super_admin';

                // Cannot touch a role containing super-admin permission unless you have it
                if (
                    !userPerms.includes(superAdminPerm) &&
                    (previousRoleData.permissions.includes(superAdminPerm) ||
                        parsed.data.permissions.includes(superAdminPerm))
                ) {
                    toast.error("You can't modify a super admin role");
                    return;
                }

                // Detect newly added permissions (those not originally on the role)
                const addedPermissions = parsed.data.permissions.filter(
                    p => !previousRoleData.permissions.includes(p),
                ) as Permissions[];

                // Any newly added permission must already be possessed by the editor
                const invalidAdds = addedPermissions.filter(
                    p => !userPerms.includes(p),
                );
                if (invalidAdds.length > 0) {
                    toast.error(
                        `You can't assign permissions you don't have: ${invalidAdds.join(', ')}`,
                    );
                    return;
                }

                setLoading(true);

                const response = await authedFetchApi<{ message: string }>(
                    { path: `/v1/role/update-role/${parsed.data._id}` },
                    {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(parsed.data),
                    },
                );

                if (response.ok) {
                    toast.success('Updated the role data');

                    if (!isFiltered) {
                        await getAllRoles();
                    } else {
                        await getAllRolesFiltered();
                    }
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while updating the role');
            } finally {
                setLoading(false);
            }
        },
        [
            authedFetchApi,
            getAllRoles,
            getAllRolesFiltered,
            isFiltered,
            session?.user?.permissions,
        ],
    );

    useEffect(() => {
        getAllRoles();
    }, [getAllRoles]);

    useEffect(() => {
        if (prevPage.current !== 1 || page > 1) {
            if (roles?.pagination?.pageCount == 1) return;
            if (!isFiltered) getAllRoles();
            else getAllRolesFiltered();
        }
        prevPage.current = page;
    }, [
        getAllRoles,
        getAllRolesFiltered,
        isFiltered,
        page,
        roles?.pagination?.pageCount,
    ]);

    useEffect(() => {
        if (roles?.pagination?.pageCount !== undefined) {
            setPage(1);
            if (prevPageCount.current !== 0) {
                if (!isFiltered) getAllRolesFiltered();
            }
            if (roles) setPageCount(roles?.pagination?.pageCount);
            prevPageCount.current = roles?.pagination?.pageCount;
            prevPage.current = 1;
        }
    }, [getAllRolesFiltered, isFiltered, roles]);

    useEffect(() => {
        // Reset to first page when itemPerPage changes
        prevPageCount.current = 0;
        prevPage.current = 1;
        setPage(1);

        if (!isFiltered) getAllRoles();
        else getAllRolesFiltered();
    }, [getAllRoles, getAllRolesFiltered, isFiltered, itemPerPage]);

    return (
        <>
            <div
                className={cn(
                    'flex flex-col mb-4 gap-2',
                    hasPerm('admin:create_role', userPermissions)
                        ? 'sm:flex-row sm:justify-between'
                        : 'sm:justify-end sm:flex-row',
                )}
            >
                {hasPerm('admin:create_role', userPermissions) && (
                    <button
                        onClick={() =>
                            router.push(
                                process.env.NEXT_PUBLIC_BASE_URL +
                                    '/admin/roles/create-role',
                            )
                        }
                        className="flex justify-between items-center gap-2 rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                    >
                        Add new role
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
                        submitHandler={getAllRolesFiltered}
                        setFilters={setFilters}
                        filters={filters}
                        className="w-full justify-between sm:w-auto"
                    />
                </div>
            </div>

            {loading ? <p className="text-center">Loading...</p> : <></>}

            <div className="table-responsive text-nowrap text-base">
                {!loading &&
                    (roles?.items?.length !== 0 ? (
                        <table className="table border table-bordered table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th>S/N</th>
                                    <th>Role Name</th>
                                    <th>Description</th>
                                    {hasAnyPerm(
                                        [
                                            'admin:delete_role',
                                            'admin:edit_role',
                                        ],
                                        userPermissions,
                                    ) && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {roles?.items?.map((role, index) => (
                                    <tr key={String(role._id)}>
                                        <td>
                                            {index +
                                                1 +
                                                itemPerPage * (page - 1)}
                                        </td>
                                        <td className="text-wrap">
                                            {role.name}
                                        </td>
                                        <ExtendableTd
                                            data={role?.description || ''}
                                        />
                                        {hasAnyPerm(
                                            [
                                                'admin:delete_role',
                                                'admin:edit_role',
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
                                                        {hasPerm(
                                                            'admin:delete_role',
                                                            userPermissions,
                                                        ) &&
                                                            (!role.permissions.includes(
                                                                'settings:the_super_admin',
                                                            ) ||
                                                                hasPerm(
                                                                    'settings:the_super_admin',
                                                                    userPermissions,
                                                                )) && (
                                                                <DeleteButton
                                                                    roleData={
                                                                        role
                                                                    }
                                                                    submitHandler={
                                                                        deleteRole
                                                                    }
                                                                />
                                                            )}

                                                        {hasPerm(
                                                            'admin:edit_role',
                                                            userPermissions,
                                                        ) && (
                                                            <EditButton
                                                                roleData={
                                                                    role as unknown as zod_RoleDataType
                                                                }
                                                                submitHandler={
                                                                    editRole
                                                                }
                                                                loading={
                                                                    loading
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="table border table-bordered table-striped">
                            <tbody>
                                <tr key={0}>
                                    <td className="align-center text-center text-wrap">
                                        No Roles To Show.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
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
