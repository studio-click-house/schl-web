import { fetchApi } from '@/lib/utils';
import { EmployeeDocument } from '@repo/schemas/employee.schema';
import { RoleDocument } from '@repo/schemas/role.schema';
import React from 'react';
import Table from './components/Table';

type EmployeesResponseState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: EmployeeDocument[];
};

type RolesResponseState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: RoleDocument[];
};

export const getAllEmployees = async () => {
    try {
        const response = await fetchApi(
            {
                path: '/v1/employee/search-employees',
                query: { paginated: false, filtered: false },
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
            const data: EmployeesResponseState =
                response.data as EmployeesResponseState;
            return data.items;
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
        const response = await fetchApi(
            {
                path: '/v1/role/search-roles',
                query: { paginated: false, filtered: false },
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
            const data: RolesResponseState =
                response.data as RolesResponseState;
            return data.items;
        } else {
            console.error('Unable to fetch roles');
        }
    } catch (e) {
        console.error(e);
        console.log('An error occurred while fetching roles');
    }
};

const BrowsePage = async () => {
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

export default BrowsePage;
