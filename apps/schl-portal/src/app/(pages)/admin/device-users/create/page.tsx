import { fetchApiWithServerAuth } from '@/lib/api-server';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import React, { Suspense } from 'react';
import Form from './components/Form';

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

const CreateDeviceUserPage = async () => {
    const employees = await getAllEmployees();

    return (
        <>
            <div className="px-4 mt-8 mb-4 flex flex-col justify-center md:w-[70vw] mx-auto">
                <h1 className="text-2xl font-semibold text-left mb-8 underline underline-offset-4 uppercase">
                    Add a new device user
                </h1>
                <Suspense fallback={<p className="text-center">Loading...</p>}>
                    <Form employeesData={employees || []} />
                </Suspense>
            </div>
        </>
    );
};

export default CreateDeviceUserPage;
