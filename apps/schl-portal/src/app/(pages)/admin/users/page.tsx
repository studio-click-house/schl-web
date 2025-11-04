import { fetchApiWithServerAuth } from '@/lib/api-server';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { RoleDocument } from '@repo/common/models/role.schema';
import React from 'react';
import Table from './components/Table';

export const getAllEmployees = async () => {
    try {
        const response = await fetchApiWithServerAuth(
            {
                path: '/v1/employee/search-employees',
                query: {
                    paginated: false,
                    // filtered: false
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
            // console.log('Employees data:', data);
            return data;
        } else {
            console.error('Unable to fetch employees');
        }
    } catch (e) {
        console.error(e);
        console.log('An error occurred while fetching employees');
    }
};

export const getAllRoles = async () => {
    try {
        const response = await fetchApiWithServerAuth(
            {
                path: '/v1/role/search-roles',
                query: {
                    paginated: false,
                    // filtered: false
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
            const data = response.data as RoleDocument[];
            return data;
        } else {
            console.error('Unable to fetch roles');
        }
    } catch (e) {
        console.error(e);
        console.log('An error occurred while fetching roles');
    }
};

const UsersPage = async () => {
    const employees = await getAllEmployees();
    const roles = await getAllRoles();

    return (
        <>
            <div className="px-4 mt-8 mb-4 container">
                <Table
                    employeesData={employees || []}
                    rolesData={roles || []}
                />
            </div>
        </>
    );
};

export default UsersPage;
