import { fetchApi } from '@/lib/utils';
import { ClientDocument } from '@repo/schemas/client.schema';
import { OrderDocument } from '@repo/schemas/order.schema';
import React, { Suspense } from 'react';
import InputForm from './components/Form';

let clients: ClientDocument[];

const getAllClients = async () => {
    try {
        const response = await fetchApi(
            {
                path: '/v1/client/search-clients',
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
            const data = response.data as ClientDocument[];
            clients = data;
        } else {
            console.error('Unable to fetch clients');
        }
    } catch (e) {
        console.error(e);
        console.log('An error occurred while fetching clients');
    }
};

const CreateSchedulePage = async () => {
    await getAllClients();
    return (
        <>
            <div className="px-4 mt-8 mb-4 flex flex-col justify-center md:w-[70vw] mx-auto">
                <h1 className="text-2xl font-semibold text-left mb-8 underline underline-offset-4 uppercase">
                    Create Schedule
                </h1>
                <Suspense fallback={<p className="text-center">Loading...</p>}>
                    <InputForm clientsData={clients} />
                </Suspense>
            </div>
        </>
    );
};

export default CreateSchedulePage;
