import { fetchApiWithServerAuth } from '@/lib/api-server';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import React from 'react';
import Table from './components/Table';

const getAllEmployees = async () => {
    try {
        const response = await fetchApiWithServerAuth(
            {
                path: '/v1/employee/search-employees',
                query: {
                    paginated: false,
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
            const data = response.data as EmployeeDocument[];
            return data;
        } else {
            console.error('Unable to fetch employees');
        }
    } catch (e) {
        console.error(e);
        console.log('An error occurred while fetching employees');
    }
};

const DeviceUsersPage = async () => {
    const employees = await getAllEmployees();

    return (
        <>
            <div className="px-4 mt-8 mb-4">
                <Table employeesData={employees || []} />
            </div>
        </>
    );
};

export default DeviceUsersPage;
