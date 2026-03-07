'use client';

import Badge from '@/components/Badge';
import NoData, { Type } from '@/components/NoData';
import {
    formatDate,
    formatTime,
    formatTimestamp,
} from '@repo/common/utils/date-helpers';
import React from 'react';
import { type OrderLog } from '../[id]/page';

interface Props {
    logs: OrderLog[];
}

const Table: React.FC<Props> = ({ logs }) => {
    return (
        <>
            <div className="table-responsive text-md overflow-x-auto">
                {logs?.length !== 0 ? (
                    <table className="table table-bordered table-striped min-w-full">
                        <colgroup>
                            <col className="min-w-[40px]" />
                            <col className="whitespace-nowrap min-w-[120px]" />
                            <col className="whitespace-nowrap min-w-[120px]" />
                            <col className="whitespace-nowrap min-w-[150px]" />
                        </colgroup>
                        <thead className="table-dark">
                            <tr className="whitespace-nowrap">
                                <th className="whitespace-nowrap">S/N</th>
                                <th className="whitespace-nowrap">Name</th>
                                <th className="whitespace-nowrap">Action</th>
                                <th className="whitespace-nowrap">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log, index) => (
                                <tr key={log._id}>
                                    <td className="whitespace-nowrap">
                                        {index + 1}
                                    </td>
                                    <td className="whitespace-nowrap">
                                        {log.user?.employee?.real_name ||
                                            'Unknown'}
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <Badge
                                            value={log.action}
                                            className={
                                                log.action === 'Create'
                                                    ? 'bg-green-600 text-white border-green-600'
                                                    : log.action === 'Finish'
                                                      ? 'bg-blue-600 text-white border-blue-600'
                                                      : log.action === 'Redo'
                                                        ? 'bg-yellow-600 text-dark border-yellow-600'
                                                        : log.action ===
                                                            'Update'
                                                          ? 'bg-purple-600 text-white border-purple-600'
                                                          : log.action ===
                                                              'Delete'
                                                            ? 'bg-red-600 text-white border-red-600'
                                                            : ''
                                            }
                                        />
                                    </td>
                                    <td className="whitespace-nowrap">
                                        {`${formatDate(log.createdAt)} | ${formatTime(
                                            formatTimestamp(log.createdAt).time,
                                        )}`}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <NoData
                        text="No logs found for this order."
                        type={Type.danger}
                    />
                )}
            </div>
            <style jsx>
                {`
                    th,
                    td {
                        padding: 8px 6px;
                    }
                `}
            </style>
        </>
    );
};

export default Table;
