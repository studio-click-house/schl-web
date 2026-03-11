'use client';

import ExtendableTd from '@/components/ExtendableTd';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { cn } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';

import {
    validationSchema,
    EmployeeDataType as zod_EmployeeDataType,
} from '@/app/(pages)/admin/employees/schema';
import Badge from '@/components/Badge';
import HiddenText from '@/components/HiddenText';
import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { formatDate } from '@repo/common/utils/date-helpers';
import { Calendar, CirclePlus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import DeleteButton from './Delete';
import EditButton from './Edit';
import FilterButton from './Filter';

type EmployeesState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: EmployeeDocument[];
};

const Table = () => {
    const authedFetchApi = useAuthedFetchApi();
    const [employees, setEmployees] = useState<EmployeesState>({
        pagination: {
            count: 0,
            pageCount: 0,
        },
        items: [],
    });

    const { data: session } = useSession();

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
    const [searchVersion, setSearchVersion] = useState<number>(0);

    const [filters, setFilters] = useState({
        bloodGroup: '',
        serviceTime: '',
        generalSearchString: '',
    });

    const getAllEmployees = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                const response = await authedFetchApi<EmployeesState>(
                    {
                        path: '/v1/employee/search-employees',
                        query: {
                            page,
                            itemsPerPage: itemPerPage,
                            paginated: true,
                        },
                    },
                    {
                        method: 'POST',
                        headers: {
                            Accept: '*/*',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({}),
                        cache: 'no-store',
                    },
                );

                if (response.ok) {
                    setEmployees(response.data);
                    setIsFiltered(false);
                    setPageCount(response.data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error(
                    'An error occurred while retrieving employees data',
                );
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi],
    );

    const getAllEmployeesFiltered = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                const response = await authedFetchApi<EmployeesState>(
                    {
                        path: '/v1/employee/search-employees',
                        query: {
                            page,
                            itemsPerPage: itemPerPage,
                            paginated: true,
                        },
                    },
                    {
                        method: 'POST',
                        headers: {
                            Accept: '*/*',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            ...filters,
                        }),
                        cache: 'no-store',
                    },
                );

                if (response.ok) {
                    setEmployees(response.data);
                    setIsFiltered(true);
                    setPageCount(response.data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error(
                    'An error occurred while retrieving employees data',
                );
            } finally {
                setLoading(false);
            }
            return;
        },
        [authedFetchApi, filters],
    );

    async function deleteEmployee(employeeData: EmployeeDocument) {
        try {
            const response = await authedFetchApi(
                { path: '/v1/approval/new-request' },
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        target_model: 'Employee',
                        action: 'delete',
                        object_id: employeeData._id,
                        deleted_data: employeeData,
                    }),
                },
            );

            if (response.ok) {
                toast.success('Request sent for approval');
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while sending request for approval');
        }
        return;
    }

    const fetchEmployees = useCallback(async () => {
        if (!isFiltered) {
            await getAllEmployees(page, itemPerPage);
        } else {
            await getAllEmployeesFiltered(page, itemPerPage);
        }
    }, [
        isFiltered,
        getAllEmployees,
        getAllEmployeesFiltered,
        page,
        itemPerPage,
    ]);

    async function editEmployee(
        editedEmployeeData: zod_EmployeeDataType,
        previousEmployeeData: zod_EmployeeDataType,
    ) {
        try {
            console.log('EMPLOYEE DATA: ', editedEmployeeData);

            setLoading(true);
            const parsed = validationSchema.safeParse(editedEmployeeData);

            if (!parsed.success) {
                console.error(parsed.error.issues.map(issue => issue.message));
                toast.error('Invalid form data');
                return;
            }

            const { _id, createdAt, updatedAt, __v, pf_history, ...rest } =
                parsed.data;

            if (!_id) {
                toast.error('Missing employee identifier');
                return;
            }

            const payload = Object.fromEntries(
                Object.entries(rest).filter(([, value]) => value !== undefined),
            );

            const response = await authedFetchApi(
                {
                    path: `/v1/employee/update-employee/${_id}`,
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
                toast.success('Updated the employee data');

                await fetchEmployees();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while updating the employee');
        } finally {
            setLoading(false);
        }
    }

    usePaginationManager({
        page,
        itemPerPage,
        pageCount,
        setPage,
        triggerFetch: fetchEmployees,
    });

    useEffect(() => {
        if (searchVersion > 0 && isFiltered && page === 1) {
            fetchEmployees();
        }
    }, [searchVersion, isFiltered, page, fetchEmployees]);

    const handleSearch = useCallback(() => {
        setIsFiltered(true);
        setPage(1);
        setSearchVersion(v => v + 1);
    }, []);

    return (
        <>
            <div
                className={cn(
                    'flex flex-col mb-4 gap-2',
                    hasPerm('admin:create_employee', userPermissions)
                        ? 'sm:flex-row sm:justify-between'
                        : 'sm:justify-end sm:flex-row',
                )}
            >
                {hasPerm('admin:create_employee', userPermissions) && (
                    <button
                        onClick={() =>
                            router.push(
                                process.env.NEXT_PUBLIC_BASE_URL +
                                    '/admin/employees',
                            )
                        }
                        className="flex justify-between items-center gap-2 rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                    >
                        Create new employee
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
                        onChange={e =>
                            setItemPerPage(parseInt(e.target.value, 10))
                        }
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

            <div className="table-responsive text-nowrap text-base overflow-x-auto">
                {!loading &&
                    (employees?.items?.length !== 0 ? (
                        <table className="table border table-bordered table-striped min-w-full">
                            <thead className="table-dark">
                                <tr>
                                    <th>S/N</th>
                                    <th>EID</th>
                                    <th>Full Name</th>
                                    <th>Joining Date</th>
                                    <th>Blood Group</th>
                                    <th>Designation</th>
                                    <th>Department</th>
                                    <th>Gross Salary</th>
                                    <th>Status</th>
                                    <th>Note</th>
                                    {hasPerm(
                                        'accountancy:manage_employee',
                                        userPermissions,
                                    ) && <th>Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {employees?.items?.map((employee, index) => (
                                    <tr key={String(employee._id)}>
                                        <td>
                                            {index +
                                                1 +
                                                itemPerPage * (page - 1)}
                                        </td>
                                        <td className="text-wrap">
                                            {employee.e_id}
                                        </td>
                                        <td className="text-wrap">
                                            {hasPerm(
                                                'accountancy:manage_employee',
                                                userPermissions,
                                            ) ? (
                                                <Link
                                                    className="hover:underline underline-offset-2"
                                                    href={`/accountancy/employees/employee-profile/?code=${encodeURIComponent(String(employee.e_id))}`}
                                                >
                                                    {employee.real_name}
                                                </Link>
                                            ) : (
                                                <span>
                                                    {employee.real_name}
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-wrap">
                                            {formatDate(employee.joining_date)}
                                        </td>
                                        <td className="text-wrap">
                                            {employee.blood_group?.toUpperCase()}
                                        </td>
                                        <td className="text-wrap">
                                            {employee.designation}
                                        </td>
                                        <td className="text-wrap">
                                            {employee.department}
                                        </td>
                                        <td className="text-wrap">
                                            <HiddenText>
                                                {employee.gross_salary.toLocaleString()}{' '}
                                                BDT
                                            </HiddenText>
                                        </td>
                                        <td
                                            className="uppercase text-wrap"
                                            style={{ verticalAlign: 'middle' }}
                                        >
                                            <Badge
                                                value={employee.status}
                                                className={cn(
                                                    employee.status == 'active'
                                                        ? 'bg-green-100 text-green-800 border-green-400'
                                                        : 'bg-red-100 text-red-800 border-red-400',
                                                )}
                                            />
                                        </td>
                                        <ExtendableTd data={employee.note} />

                                        {hasPerm(
                                            'accountancy:manage_employee',
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
                                                            employeeData={
                                                                employee
                                                            }
                                                            submitHandler={
                                                                deleteEmployee
                                                            }
                                                        />

                                                        <EditButton
                                                            loading={loading}
                                                            employeeData={
                                                                employee as unknown as zod_EmployeeDataType
                                                            }
                                                            submitHandler={
                                                                editEmployee
                                                            }
                                                        />
                                                        <button
                                                            onClick={() =>
                                                                router.push(
                                                                    `/accountancy/employees/attendance/?employeeId=${employee._id}`,
                                                                )
                                                            }
                                                            className="px-3 py-1 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-sm transition-colors"
                                                            title="View Attendance"
                                                        >
                                                            <Calendar
                                                                size={18}
                                                            />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <NoData text="No Employees Found" type={Type.danger} />
                    ))}
            </div>

            <style jsx>
                {`
                    th,
                    td {
                        padding: 2.5px 10px;
                        // border: 1px solid #9ca3af;
                    }
                `}
            </style>
        </>
    );
};

export default Table;
