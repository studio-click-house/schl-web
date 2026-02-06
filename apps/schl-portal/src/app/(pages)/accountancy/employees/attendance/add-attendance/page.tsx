import NoData, { Type } from '@/components/NoData';
import { fetchApiWithServerAuth } from '@/lib/api-server';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { Undo2 } from 'lucide-react';
import Link from 'next/link';
import React, { Suspense } from 'react';
import Form from './components/Form';

type DeviceUserInfo = {
    employeeId: string;
    userId: string;
};

const getEmployee = async (employeeId: string) => {
    try {
        const response = await fetchApiWithServerAuth<EmployeeDocument>(
            {
                path: `/v1/employee/get-employee/${employeeId}`,
            },
            {
                method: 'GET',
                headers: {
                    Accept: '*/*',
                    'Content-Type': 'application/json',
                },
                cache: 'no-store',
            },
        );

        if (response.ok) {
            return response.data;
        }
    } catch (e) {
        console.error('Failed to fetch employee', e);
    }

    return null;
};

const getEmployeeDeviceUser = async (employeeId: string) => {
    try {
        const response = await fetchApiWithServerAuth<DeviceUserInfo>(
            {
                path: `/v1/attendance/employee-device-user/${employeeId}`,
            },
            {
                method: 'GET',
                headers: {
                    Accept: '*/*',
                    'Content-Type': 'application/json',
                },
                cache: 'no-store',
            },
        );

        if (response.ok) {
            return response.data;
        }
    } catch (e) {
        console.error('Failed to fetch device user by employee', e);
    }

    return null;
};

const AddAttendancePage = async ({
    searchParams,
}: {
    searchParams: { employeeId?: string };
}) => {
    const employeeId = searchParams.employeeId
        ? decodeURIComponent(searchParams.employeeId)
        : '';

    if (!employeeId) {
        return (
            <div className="px-4 mt-8 mb-4 flex flex-col justify-center md:w-[70vw] mx-auto">
                <h1 className="text-2xl font-semibold text-left mb-8 underline underline-offset-4 uppercase">
                    Add attendance
                </h1>
                <div className="flex flex-col gap-4">
                    <NoData text="No employee selected" type={Type.danger} />
                    <Link
                        href="/accountancy/employees"
                        className="flex justify-between items-center gap-2 rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2 w-fit"
                    >
                        Go back to employees
                    </Link>
                </div>
            </div>
        );
    }

    const [employee, deviceUser] = await Promise.all([
        getEmployee(employeeId),
        getEmployeeDeviceUser(employeeId),
    ]);

    if (!employee) {
        return (
            <div className="px-4 mt-8 mb-4 flex flex-col justify-center md:w-[70vw] mx-auto">
                <h1 className="text-2xl font-semibold text-left mb-8 underline underline-offset-4 uppercase">
                    Add attendance
                </h1>
                <div className="flex flex-col gap-4">
                    <NoData text="Employee not found" type={Type.danger} />
                    <Link
                        href="/accountancy/employees"
                        className="flex justify-between items-center gap-2 rounded-md bg-blue-600 hover:opacity-90 hover:ring-4 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2 w-fit"
                    >
                        Go back to employees <Undo2 size={18} />
                    </Link>
                </div>
            </div>
        );
    }

    if (!deviceUser?.userId) {
        return (
            <div className="px-4 mt-8 mb-4 flex flex-col justify-center md:w-[70vw] mx-auto">
                <h1 className="text-2xl font-semibold text-left mb-8 underline underline-offset-4 uppercase">
                    Add attendance
                </h1>
                <div className="flex flex-col gap-4">
                    <NoData
                        text="No device user mapping found for this employee"
                        type={Type.danger}
                    />
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/admin/device-users/create"
                            className="flex justify-between items-center gap-2 rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2 w-fit"
                        >
                            Create device user
                        </Link>
                        <Link
                            href="/accountancy/employees"
                            className="flex justify-between items-center gap-2 rounded-md bg-blue-600 hover:opacity-90 hover:ring-4 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2 w-fit"
                        >
                            Go back to employees
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const employeeName =
        employee.real_name || employee.company_provided_name || 'Employee';

    return (
        <div className="px-4 mt-8 mb-4 flex flex-col justify-center md:w-[70vw] mx-auto">
            <h1 className="text-2xl font-semibold text-left mb-8 underline underline-offset-4 uppercase">
                Add attendance
            </h1>
            <Suspense fallback={<p className="text-center">Loading...</p>}>
                <Form
                    employeeId={employeeId}
                    employeeName={employeeName}
                    userId={deviceUser.userId}
                />
            </Suspense>
        </div>
    );
};

export default AddAttendancePage;
