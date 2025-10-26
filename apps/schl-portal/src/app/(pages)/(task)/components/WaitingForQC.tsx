import { fetchApi } from '@/lib/utils';
import type { OrderDocument } from '@repo/schemas/order.schema';
import 'flowbite';
import { initFlowbite } from 'flowbite';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import OrderRenderer from './OrderRenderer';

function WaitingForQC() {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<OrderDocument[]>([]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            initFlowbite();
        }
    }, []);

    async function getAllOrders() {
        try {
            setLoading(true);
            const response = await fetchApi(
                { path: '/v1/order/qc-orders' },
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                },
            );

            console.log(response.data);
            if (response.ok) {
                setOrders(response.data as OrderDocument[]);
            } else {
                toast.error(response.data as string);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving orders');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        getAllOrders();
    }, []);

    if (loading) {
        return <p className="text-center">Loading...</p>;
    }

    return (
        <>
            <div className="table-responsive text-md">
                {orders?.length !== 0 ? (
                    <table className="table border-gray-300 table-bordered">
                        <thead>
                            <tr className="bg-gray-50 text-nowrap">
                                <th>S/N</th>
                                <th>Client Code</th>
                                <th>Folder</th>
                                <th>NOF</th>
                                <th>Download</th>
                                <th>Delivery</th>
                                <th>Remaining</th>
                                <th>Task</th>
                                <th>E.T</th>
                                <th>Production</th>
                                <th>QC1</th>
                                <th>QC2</th>
                                <th>Folder Location</th>
                                <th>Priority</th>
                                <th>Type</th>
                                <th>Comments</th>
                            </tr>
                        </thead>
                        <tbody className="text-base">
                            {orders?.map((order, index) => (
                                <OrderRenderer
                                    order={order}
                                    index={index}
                                    key={String(order._id)}
                                />
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table className="table border">
                        <tbody>
                            <tr key={0}>
                                <td className="align-center capitalize text-center text-wrap text-gray-400">
                                    No Task Waiting For QC
                                </td>
                            </tr>
                        </tbody>
                    </table>
                )}
            </div>
            <style jsx>
                {`
                    .table {
                        font-size: 15px;
                    }

                    th,
                    td {
                        padding: 3px 6px;
                        // border: 1px solid #9ca3af;
                    }

                    // .table-bordered td,
                    // .table-bordered th {
                    //   border: 1px solid #9ca3af;
                    // }
                `}
            </style>
        </>
    );
}

export default WaitingForQC;
