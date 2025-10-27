import { fetchApi } from '@/lib/utils';
import { ClientDocument } from '@repo/schemas/client.schema';
import { OrderDocument } from '@repo/schemas/order.schema';
import React from 'react';
import Table from './components/Table';

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

const BrowsePage = async () => {
    await getAllClients();
    return (
        <>
            <div className="px-4 mt-8 mb-4">
                <Table clientsData={clients} />
            </div>
        </>
    );
};

export default BrowsePage;
