import { fetchApiWithServerAuth } from '@/lib/api-server';
import { OrderDocument } from '@repo/common/models/order.schema';
import React from 'react';
import Table from './components/Table';

let clients: OrderDocument[];

const getAllClients = async () => {
    try {
        const response = await fetchApiWithServerAuth(
            {
                path: '/v1/client/search-clients',
                query: {
                    paginated: false,
                    // filtered: false,
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

        // console.log('response', response);

        if (response.ok) {
            const data = response.data as OrderDocument[];
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
    console.log('clients', clients);
    return (
        <>
            <div className="px-4 mt-8 mb-4">
                <Table clientsData={clients} />
            </div>
        </>
    );
};

export default BrowsePage;
