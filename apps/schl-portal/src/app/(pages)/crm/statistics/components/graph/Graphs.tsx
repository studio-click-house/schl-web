'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import ClientsOnboardGraph from './ClientsOnboardGraph';
import ReportsCountGraph from './ReportsCountGraph';
import TestOrdersTrendGraph from './TestOrdersTrendGraph';

const Graphs = () => {
    const [isLoading, setIsLoading] = useState({
        reportsCount: false,
        clientsOnboard: false,
        testOrdersTrend: false,
    });

    const [reportsCount, setReportsCount] = useState<Record<string, number>>(
        {},
    );
    const [clientsOnboard, setClientsOnboard] = useState<
        Record<string, number>
    >({});
    const [testOrdersTrend, setTestOrdersTrend] = useState<
        Record<string, number>
    >({});
    const authedFetchApi = useAuthedFetchApi();

    const getReportsCount = useCallback(async () => {
        try {
            setIsLoading(prevData => ({ ...prevData, reportsCount: true }));

            const response = await authedFetchApi<Record<string, number>>({
                path: '/v1/report/call-reports-trend',
            });

            if (response.ok) {
                setReportsCount(response.data);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error(
                'An error occurred while retrieving reports count data',
            );
        } finally {
            setIsLoading(prevData => ({ ...prevData, reportsCount: false }));
        }
    }, [authedFetchApi]);

    const getClientsOnboard = useCallback(async () => {
        try {
            setIsLoading(prevData => ({
                ...prevData,
                clientsOnboard: true,
            }));

            const response = await authedFetchApi<Record<string, number>>({
                path: '/v1/report/clients-onboard-trend',
            });

            if (response.ok) {
                setClientsOnboard(response.data);
            } else {
                toastFetchError(response);
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
    }, [authedFetchApi]);

    const getTestOrdersTrend = useCallback(async () => {
        try {
            setIsLoading(prevData => ({
                ...prevData,
                testOrdersTrend: true,
            }));

            const response = await authedFetchApi<Record<string, number>>({
                path: '/v1/report/test-orders-trend',
            });

            if (response.ok) {
                setTestOrdersTrend(response.data);
            } else {
                toastFetchError(response);
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
    }, [authedFetchApi]);

    useEffect(() => {
        getReportsCount();
        getClientsOnboard();
        getTestOrdersTrend();
    }, [getClientsOnboard, getReportsCount, getTestOrdersTrend]);

    return (
        <div className="px-2 space-y-4">
            <div className="p-2 bg-gray-50 border-2">
                <p className="text-center mt-4 text-lg underline font-semibold uppercase">
                    Reports Count (last 12 month)
                </p>
                <ReportsCountGraph
                    isLoading={isLoading.reportsCount}
                    data={reportsCount}
                    className="h-80"
                />
            </div>
            <div className="p-2 bg-gray-50 border-2">
                <p className="text-center mt-4 text-lg underline font-semibold uppercase">
                    Clients Onboard (last 12 month)
                </p>

                <ClientsOnboardGraph
                    isLoading={isLoading.clientsOnboard}
                    data={clientsOnboard}
                    className="h-80"
                />
            </div>
            <div className="p-2 bg-gray-50 border-2">
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
