'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';

import moment from 'moment-timezone';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FiltersContext } from '../FiltersContext';
import type { CountryData, OrderData } from '../types/graph-data.type';
import CountryDataHeatMap from './CountryDataTable';
import FilterButton from './Filter';
import FlowDataGraph from './FlowDataGraph';
import StatusDataGraph from './StatusDataGraph';

const Graphs = () => {
    const authedFetchApi = useAuthedFetchApi();
    const [isLoading, setIsLoading] = useState({
        flowData: false,
        statusData: false,
        countryData: false,
    });

    const filtersCtx = React.useContext(FiltersContext);
    const filters = filtersCtx?.filters;

    const [flowData, setFlowData] = useState<OrderData[]>([]);
    const [statusData, setStatusData] = useState<OrderData[]>([]);
    const [countryData, setCountryData] = useState<CountryData>({});

    const getFlowData = useCallback(async () => {
        try {
            setIsLoading(prevData => ({ ...prevData, flowData: true }));

            const fromDate = filters?.fromDate;
            const toDate = filters?.toDate;
            const dateRange =
                fromDate && toDate
                    ? Math.max(
                          1,
                          moment(toDate).diff(moment(fromDate), 'days') + 1,
                      )
                    : undefined;

            const response = await authedFetchApi<OrderData[]>(
                {
                    path: '/v1/order/orders-qp',
                    query: {
                        dateRange,
                    },
                },
                {
                    method: 'GET',
                },
            );

            if (response.ok) {
                setFlowData(response.data);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving flow data');
        } finally {
            setIsLoading(prevData => ({ ...prevData, flowData: false }));
        }
    }, [authedFetchApi, filters?.fromDate, filters?.toDate]);

    const getStatusData = useCallback(async () => {
        const daysOfData = 14;

        try {
            setIsLoading(prevData => ({ ...prevData, statusData: true }));

            const response = await authedFetchApi<OrderData[]>(
                {
                    path: '/v1/order/orders-qp',
                    query: {
                        dateRange: daysOfData,
                    },
                },
                {
                    method: 'GET',
                },
            );

            if (response.ok) {
                setStatusData(response.data);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving status data');
        } finally {
            setIsLoading(prevData => ({ ...prevData, statusData: false }));
        }
    }, [authedFetchApi]);

    const getCountryData = useCallback(async () => {
        const daysOfData = 30;
        try {
            setIsLoading(prevData => ({
                ...prevData,
                countryData: true,
            }));

            const response = await authedFetchApi<CountryData>(
                {
                    path: '/v1/order/orders-cd',
                    query: {
                        dateRange: daysOfData,
                    },
                },
                {
                    method: 'GET',
                },
            );

            if (response.ok) {
                setCountryData(response.data);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving country data');
        } finally {
            setIsLoading(prevData => ({
                ...prevData,
                countryData: false,
            }));
        }
    }, [authedFetchApi]);

    useEffect(() => {
        getFlowData();
        getStatusData();
        getCountryData();
    }, [getCountryData, getFlowData, getStatusData]);

    const handleFilterChange = useCallback(() => {
        getFlowData();
    }, [getFlowData]);

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-end mb-4 gap-2">
                <div className="items-center flex gap-2">
                    {/* pagination controls removed for this page */}

                    <FilterButton
                        className="w-full justify-between sm:w-auto"
                        loading={
                            isLoading.flowData ||
                            isLoading.statusData ||
                            isLoading.countryData
                        }
                        submitHandler={handleFilterChange}
                    />
                </div>
            </div>
            <div className="px-2">
                <div className="mb-4 p-2 bg-gray-50 border-2">
                    <p className="text-center mt-4 text-lg underline underline-offset-2 font-semibold uppercase">
                        {`${
                            filtersCtx?.filters.flowType == 'files'
                                ? 'Files Flow'
                                : 'Orders Flow'
                        } Period: ${moment(flowData[0]?.date).format('DD MMM')} – ${moment(
                            flowData[flowData.length - 1]?.date,
                        ).format('DD MMM')}`}
                    </p>
                    <FlowDataGraph
                        isLoading={isLoading.flowData}
                        data={flowData}
                        className="h-80"
                    />
                </div>

                <div className="mb-4 p-2 bg-gray-50 border-2">
                    <p className="text-center mt-4 mb-10 text-lg underline underline-offset-2 font-semibold uppercase">
                        {`Production Overview Period: ${moment(countryData['Others']?.[0]?.date).format('DD MMM')} – ${moment(
                            countryData['Others']?.[
                                countryData['Others']?.length - 1
                            ]?.date,
                        ).format('DD MMM')} (Last 30 days)`}
                    </p>
                    <CountryDataHeatMap
                        isLoading={isLoading.countryData}
                        data={countryData}
                    />
                </div>

                <div className="mb-4 p-2 bg-gray-50 border-2">
                    <p className="text-center mt-4 text-lg underline underline-offset-2 font-semibold uppercase">
                        {`House Status Period: ${moment(statusData[0]?.date).format('DD MMM')} – ${moment(
                            statusData[statusData.length - 1]?.date,
                        ).format('DD MMM')} (Last 14 days)`}
                    </p>
                    <StatusDataGraph
                        isLoading={isLoading.statusData}
                        data={statusData.slice(-14)}
                        className="h-80"
                    />
                </div>
            </div>
        </>
    );
};

export default Graphs;
