import { fetchApiWithServerAuth } from '@/lib/api-server';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { removeDuplicates } from '@repo/common/utils/general-utils';
import React, { Suspense } from 'react';
import InputForm from './components/Form';

let marketerNames: string[] = [];

async function getAllMarketers() {
    try {
        const response = await fetchApiWithServerAuth(
            {
                path: '/v1/employee/search-employees',
                query: {
                    paginated: false,
                    // filtered: true
                },
            },
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ department: 'Marketing' }),
            },
        );

        if (response.ok) {
            const marketers = Array.isArray(response.data)
                ? (response.data as EmployeeDocument[])
                : ((response.data as { items?: EmployeeDocument[] })?.items ??
                  []);
            marketerNames = removeDuplicates(
                marketers
                    .map(marketer => marketer.company_provided_name)
                    .filter((name): name is string => Boolean(name)),
            );
        } else {
            console.error('Unable to fetch marketers');
        }
    } catch (e) {
        console.error(e);
        console.log('An error occurred while fetching marketer names');
    }
}

const CreateClientPage = async () => {
    await getAllMarketers();
    return (
        <>
            <div className="px-4 mt-8 mb-4 flex flex-col justify-center md:w-[70vw] mx-auto">
                <h1 className="text-2xl font-semibold text-left mb-8 underline underline-offset-4 uppercase">
                    Add a new client
                </h1>
                <Suspense fallback={<p className="text-center">Loading...</p>}>
                    <InputForm marketerNames={marketerNames} />
                </Suspense>
            </div>
        </>
    );
};

export default CreateClientPage;
