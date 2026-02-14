'use client';

import { useSearchParams } from 'next/navigation';
import React from 'react';
import Table from './components/Table';

const EmployeeAttendancePage = () => {
    const searchParams = useSearchParams();
    const employeeId = searchParams.get('employeeId') || undefined;

    return (
        <>
            <div className="px-4 mt-8 mb-4 container">
                <Table queryEmployeeId={employeeId} />
            </div>
        </>
    );
};

export default EmployeeAttendancePage;
