import { fetchApiWithServerAuth } from '@/lib/api-server';
import { formatDate } from '@repo/common/utils/date-helpers';
import { capitalize } from 'lodash';
import {
    CalendarDays,
    FolderOpen,
    Home,
    Layers,
    Tag,
    User,
    Zap,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import React from 'react';
import Cards from '../components/Cards';
import Table from '../components/Table';

export interface OrderLog {
    _id: string;
    order: string;
    action: 'Create' | 'Update' | 'Finish' | 'Redo' | 'Delete';
    user: {
        _id: string;
        employee: {
            real_name: string;
        };
    };
    createdAt: string;
}

const getOrderLogs = async (orderId: string) => {
    try {
        const response = await fetchApiWithServerAuth<OrderLog[]>(
            { path: `/v1/order/${orderId}/logs` },
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store',
            },
        );
        if (response.ok) return response.data ?? [];
        return [];
    } catch (e) {
        console.error(e);
        return [];
    }
};

const getOrderData = async (orderId: string): Promise<any> => {
    try {
        const response = await fetchApiWithServerAuth(
            { path: `/v1/order/${orderId}` },
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store',
            },
        );
        if (response.ok) return response.data;
        return null;
    } catch (e) {
        console.error(e);
        return null;
    }
};

export default async function OrderLogsPage({
    params,
}: {
    params: { id: string };
}) {
    const orderId = params.id;
    const [order, logs] = await Promise.all([
        getOrderData(orderId),
        getOrderLogs(orderId),
    ]);

    if (!order && logs.length === 0) {
        notFound();
    }

    const infoCards = order
        ? [
              {
                  label: 'Client Code',
                  value: order.client_code,
                  icon: <Tag size={20} className="text-primary" />,
              },
              ...(order.client_name
                  ? [
                        {
                            label: 'Client Name',
                            value: order.client_name,
                            icon: <User size={20} className="text-primary" />,
                        },
                    ]
                  : []),
              ...(order.folder
                  ? [
                        {
                            label: 'Folder',
                            value: order.folder,
                            icon: (
                                <FolderOpen
                                    size={20}
                                    className="text-primary"
                                />
                            ),
                        },
                    ]
                  : []),
              ...(order.task
                  ? [
                        {
                            label: 'Task',
                            value: order.task.replace(/\+/g, ', '),
                            icon: <Layers size={20} className="text-primary" />,
                        },
                    ]
                  : []),
              ...(order.download_date
                  ? [
                        {
                            label: 'Download Date',
                            value: formatDate(order.download_date),
                            icon: (
                                <CalendarDays
                                    size={20}
                                    className="text-primary"
                                />
                            ),
                        },
                    ]
                  : []),
              ...(order.status
                  ? [
                        {
                            label: 'Status',
                            value: capitalize(order.status),
                            icon: <Zap size={20} className="text-primary" />,
                        },
                    ]
                  : []),
          ]
        : [];

    return (
        <div className="px-4 mt-8 mb-4 container">
            <div className="flex flex-col sm:flex-row justify-between mb-4 gap-2">
                <h1 className="text-2xl font-semibold text-left  underline underline-offset-4 uppercase">
                    Order Audit Log
                </h1>
                <Link
                    href="/"
                    className="flex justify-between items-center gap-2 rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                >
                    Go To Home
                    <Home size={18} />
                </Link>
            </div>

            {order && <Cards cards={infoCards} />}

            <Table logs={logs} />
        </div>
    );
}

export const dynamic = 'force-dynamic';
