'use client';

import { fetchApi } from '@repo/common/utils/general-utils';
import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import ClientsOnboardGraph from './ClientsOnboardGraph';
import ReportsCountGraph from './ReportsCountGraph';
import TestOrdersTrendGraph from './TestOrdersTrendGraph';

const Graphs = () => {
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState({
        reportsCount: false,
        clientsOnboard: false,
        testOrdersTrend: false,
    });

    const [reportsCount, setReportsCount] = useState({});
    const [clientsOnboard, setClientsOnboard] = useState({});
    const [testOrdersTrend, setTestOrdersTrend] = useState({});

    const getReportsCount = useCallback(async () => {
        try {
            setIsLoading(prevData => ({ ...prevData, reportsCount: true }));

            const response = await fetchApi(
                {
                    path: '/v1/report/get-reports-count',
                    query: {
                        name: session?.user.provided_name,
                    },
                },
                {
                    method: 'GET',
                },
            );

            if (response.ok) {
                setReportsCount(response.data);
            } else {
                toast.error(response.data);
            }
        } catch (error) {
            console.error(error);
            toast.error(
                'An error occurred while retrieving reports count data',
            );
        } finally {
            setIsLoading(prevData => ({ ...prevData, reportsCount: false }));
        }
    }, [session]);

    const getClientsOnboard = useCallback(async () => {
        try {
            setIsLoading(prevData => ({
                ...prevData,
                clientsOnboard: true,
            }));

            const response = await fetchApi(
                {
                    path: '/v1/report/get-clients-onboard',
                    query: {
                        name: session?.user.provided_name,
                    },
                },
                {
                    method: 'GET',
                },
            );

            if (response.ok) {
                setClientsOnboard(response.data);
            } else {
                toast.error(response.data);
            }
        } catch (error) {
            console.error(error);
            toast.error(
                'An error occurred while retrieving clients onboard data',
            );
        } finally {
            setIsLoading(prevData => ({
                ...prevData,
                clientsOnboard: false,
            }));
        }
    }, [session]);

    const getTestOrdersTrend = useCallback(async () => {
        try {
            setIsLoading(prevData => ({
                ...prevData,
                testOrdersTrend: true,
            }));

            const response = await fetchApi(
                {
                    path: '/v1/report/get-test-orders-trend',
                    query: {
                        name: session?.user.provided_name,
                    },
                },
                {
                    method: 'GET',
                },
            );

            if (response.ok) {
                setTestOrdersTrend(response.data);
            } else {
                toast.error(response.data);
            }
        } catch (error) {
            console.error(error);
            toast.error(
                'An error occurred while retrieving test orders trend data',
            );
        } finally {
            setIsLoading(prevData => ({
                ...prevData,
                testOrdersTrend: false,
            }));
        }
    }, [session]);

    useEffect(() => {
        getReportsCount();
        getClientsOnboard();
        getTestOrdersTrend();
    }, [getReportsCount, getClientsOnboard, getTestOrdersTrend]);

    return (
        <div className="px-2">
            <div className="mb-4 p-2 bg-gray-50 border-2">
                <p className="text-center mt-4 text-lg underline font-semibold uppercase">
                    Reports Count (last 12 month)
                </p>
                <ReportsCountGraph
                    isLoading={isLoading.reportsCount}
                    data={reportsCount}
                    className="h-80"
                />
            </div>
            <div className="mb-4 p-2 bg-gray-50 border-2">
                <p className="text-center mt-4 text-lg underline font-semibold uppercase">
                    Clients Onboard (last 12 month)
                </p>

                <ClientsOnboardGraph
                    isLoading={isLoading.clientsOnboard}
                    data={clientsOnboard}
                    className="h-80"
                />
            </div>
            <div className="mb-4 p-2 bg-gray-50 border-2">
                <p className="text-center mt-4 text-lg underline font-semibold uppercase">
                    Test Orders Trend (last 12 month)
                </p>
                <TestOrdersTrendGraph
                    isLoading={isLoading.testOrdersTrend}
                    data={testOrdersTrend}
                    className="h-80"
                />
            </div>
        </div>
    );
};

export default Graphs;
