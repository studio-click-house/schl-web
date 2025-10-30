import Badge from '@/components/Badge';
import ClickToCopy from '@/components/CopyText';
import ExtendableTd from '@/components/ExtendableTd';
import type { OrderDocument } from '@repo/common/models/order.schema';
import { formatDate, formatTime } from '@repo/common/utils/date-helpers';
import { fetchApi } from '@repo/common/utils/general-utils';
import { hasPerm } from '@repo/common/utils/permission-check';
import 'flowbite';
import { initFlowbite } from 'flowbite';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

function TestAndCorrection() {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<OrderDocument[]>([]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            initFlowbite();
        }
    }, []);

    const { data: session } = useSession();
    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    async function getAllOrders() {
        try {
            setLoading(true);

            const response = await fetchApi(
                { path: '/v1/order/rework-orders' },
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            );

            if (response.ok) {
                setOrders(response.data as OrderDocument[]);
                console.log(response.data);
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
                                <th>Task</th>
                                <th>E.T</th>
                                <th>Production</th>
                                <th>QC1</th>
                                <th>QC2</th>
                                <th>Folder Location</th>
                                <th>Priority</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Comments</th>
                            </tr>
                        </thead>
                        <tbody className="text-base">
                            {orders?.map((order, index) => {
                                return (
                                    <tr key={String(order._id)}>
                                        <td>{index + 1}</td>
                                        <td>
                                            {hasPerm(
                                                'browse:edit_task',
                                                userPermissions,
                                            ) ? (
                                                <Link
                                                    className="hover:underline cursor-pointer"
                                                    href={
                                                        '/browse/single-task?id=' +
                                                        encodeURIComponent(
                                                            String(order._id),
                                                        )
                                                    }
                                                >
                                                    {order.client_code}
                                                </Link>
                                            ) : (
                                                order.client_code
                                            )}
                                        </td>

                                        <td className="text-nowrap">
                                            {order.folder}
                                        </td>
                                        <td>{order.quantity}</td>
                                        <td className="text-nowrap">
                                            {order.download_date
                                                ? formatDate(
                                                      order.download_date,
                                                  )
                                                : null}
                                        </td>
                                        <td className="text-nowrap">
                                            {order.delivery_date
                                                ? formatDate(
                                                      order.delivery_date,
                                                  )
                                                : null}
                                            {' | '}
                                            {order.delivery_bd_time
                                                ? formatTime(
                                                      order.delivery_bd_time,
                                                  )
                                                : null}
                                        </td>

                                        <td
                                            className="uppercase text-wrap"
                                            style={{ verticalAlign: 'middle' }}
                                        >
                                            {order.task
                                                ?.split('+')
                                                .map((task, index) => {
                                                    return (
                                                        <Badge
                                                            key={index}
                                                            value={task}
                                                        />
                                                    );
                                                })}
                                        </td>
                                        <td>{order.et}</td>
                                        <td>{order.production}</td>
                                        <td>{order.qc1}</td>
                                        <td>{order.qc2}</td>
                                        <td>
                                            <ClickToCopy
                                                text={
                                                    order.folder_path ||
                                                    'Folder path is not provided for this task'
                                                }
                                            />
                                        </td>

                                        <td
                                            className="uppercase text-nowrap"
                                            style={{ verticalAlign: 'middle' }}
                                        >
                                            {order.priority && (
                                                <Badge
                                                    value={order.priority}
                                                    className={
                                                        order.priority == 'high'
                                                            ? 'bg-orange-600 text-white border-orange-600'
                                                            : order.priority ==
                                                                'medium'
                                                              ? 'bg-yellow-600 text-white border-yellow-600'
                                                              : 'bg-green-600 text-white border-green-600'
                                                    }
                                                />
                                            )}
                                        </td>

                                        <td
                                            className="uppercase text-wrap"
                                            style={{ verticalAlign: 'middle' }}
                                        >
                                            {order.type && (
                                                <Badge value={order.type} />
                                            )}
                                        </td>
                                        <td
                                            className="uppercase text-wrap"
                                            style={{ verticalAlign: 'middle' }}
                                        >
                                            {order.status && (
                                                <Badge
                                                    value={order.status}
                                                    className="bg-amber-600 text-white border-amber-600"
                                                />
                                            )}
                                        </td>
                                        <ExtendableTd data={order.comment} />
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <table className="table border">
                        <tbody>
                            <tr key={0}>
                                <td className="align-center capitalize text-center text-wrap">
                                    No Test or Correction To Show.
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
                        padding: 8px 6px;
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

export default TestAndCorrection;
