'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React from 'react';
import Table from './components/Table';

const EmployeeAttendancePage = () => {
    const searchParams = useSearchParams();
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
        return (
            <div className="px-4 mt-8 mb-4 container">
                <div className="text-center text-red-600">
                    <p className="mb-4">No employee selected</p>
                    <Link
                        href="/accountancy/employees"
                        className="text-blue-600 hover:underline"
                    >
                        Go back to employees
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="px-4 mt-8 mb-4 container">
                <Table employeeId={employeeId} />
            </div>
        </>
    );
};

export default EmployeeAttendancePage;
