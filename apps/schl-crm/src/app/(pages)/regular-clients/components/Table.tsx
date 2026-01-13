'use client';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { ReportDocument } from '@repo/common/models/report.schema';
import {
    YYYY_MM_DD_to_DD_MM_YY as convertToDDMMYYYY,
    formatDate,
    getRowColorByLastOrderDate,
} from '@repo/common/utils/date-helpers';
import { hasPerm } from '@repo/common/utils/permission-check';
import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import DeleteButton from './Delete';
import EditButton from './Edit';
import FilterButton from './Filter';
import RemoveClientButton from './Remove';

type ClientsState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: Array<
        ReportDocument & {
            last_order_date?: string | null;
            order_update?: string | null;
        }
    >;
};

const Table = () => {
    const authedFetchApi = useAuthedFetchApi();
    const [clients, setClients] = useState<ClientsState>({
        pagination: {
            count: 0,
            pageCount: 0,
        },
        items: [],
    });

    const [isFiltered, setIsFiltered] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [itemPerPage, setItemPerPage] = useState<number>(30);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchVersion, setSearchVersion] = useState<number>(0);

    const { data: session } = useSession();

    const [filters, setFilters] = useState({
        country: '',
        companyName: '',
        category: '',
        fromDate: '',
        toDate: '',
        test: false,
        generalSearchString: '',
        show: 'mine' as 'all' | 'mine' | 'others',
    });

    const getAllClients = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                // setIsLoading(true);

                const response = await authedFetchApi<ClientsState>(
                    {
                        path: '/v1/report/search-reports',
                        query: {
                            paginated: true,
                            page,
                            itemsPerPage: itemPerPage,
                        },
                    },
                    {
                        headers: { 'Content-Type': 'application/json' },
                        method: 'POST',
                        body: JSON.stringify({
                            show: 'mine',
                            regularClient: true,
                        }),
                    },
                );

                if (response.ok) {
                    const data = response.data as ClientsState;
                    setClients(data);
                    setIsFiltered(false);
                    setPageCount(data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while retrieving clients data');
            } finally {
                setIsLoading(false);
            }
        },
        [authedFetchApi],
    );

    const getAllClientsFiltered = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                // setIsLoading(true);

                const response = await authedFetchApi<ClientsState>(
                    {
                        path: '/v1/report/search-reports',
                        query: {
                            paginated: true,
                            page,
                            itemsPerPage: itemPerPage,
                        },
                    },
                    {
                        headers: { 'Content-Type': 'application/json' },
                        method: 'POST',
                        body: JSON.stringify({
                            ...filters,
                            regularClient: true,
                        }),
                    },
                );

                if (response.ok) {
                    const data = response.data as ClientsState;
                    setClients(data);
                    setIsFiltered(true);
                    setPageCount(data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while retrieving clients data');
            } finally {
                setIsLoading(false);
            }
            return;
        },
        [authedFetchApi, filters],
    );

    const fetchReports = useCallback(async () => {
        if (!isFiltered) {
            await getAllClients(page, itemPerPage);
        } else {
            await getAllClientsFiltered(page, itemPerPage);
        }
    }, [isFiltered, getAllClients, getAllClientsFiltered, page, itemPerPage]);

    const handleSearch = useCallback(() => {
        setIsFiltered(true);
        setPage(1);
        setSearchVersion(v => v + 1);
    }, [setIsFiltered, setPage]);

    async function deleteClient(clientData: ReportDocument) {
        try {
            if (
                session?.user.permissions &&
                !hasPerm('crm:delete_report_approval', session.user.permissions)
            ) {
                toast.error('You do not have permission to delete reports');
                return;
            }

            if (clientData.marketer_name !== session?.user.provided_name) {
                toast.error('You are not allowed to delete this client');
                return;
            }

            const response = await authedFetchApi(
                { path: '/v1/approval/new-request' },
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        target_model: 'Report',
                        action: 'delete',
                        object_id: clientData._id,
                        deleted_data: clientData,
                        // req_by: session?.user.db_id,
                    }),
                },
            );

            if (response.ok) {
                toast.success('Request sent for approval');
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while sending request for approval');
        }
        return;
    }

    async function editClient(
        originalClientData: ReportDocument,
        editedData: Partial<ReportDocument>,
        setEditedData: React.Dispatch<
            React.SetStateAction<Partial<ReportDocument>>
        >,
    ) {
        try {
            if (
                session?.user.permissions &&
                !hasPerm('crm:edit_report', session.user.permissions)
            ) {
                toast.error('You do not have permission to edit reports');
                return;
            }

            if (
                originalClientData.marketer_name !== session?.user.provided_name
            ) {
                toast.error("You are not allowed to edit this client's data");
                return;
            }

            if (!editedData.followup_done && editedData.followup_date === '') {
                toast.error(
                    'Followup date is required because followup is set as pending for this client',
                );
                setEditedData({
                    ...(originalClientData as Partial<ReportDocument>),
                    updated_by: session?.user.real_name || '',
                });
                return;
            }

            // setIsLoading(true);

            const response = await authedFetchApi(
                { path: `/v1/report/update-report/${editedData._id}` },
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editedData),
                },
            );

            if (response.ok) {
                await fetchReports();

                toast.success('Edited the client data successfully');
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while editing the client data');
        } finally {
            setEditedData({
                ...(originalClientData as Partial<ReportDocument>),
                updated_by: session?.user.real_name || '',
            });
            setIsLoading(false);
        }
    }

    async function removeClient(
        originalClientData: ReportDocument,
        clientId: string,
        reqBy: string,
    ) {
        try {
            console.log(originalClientData.marketer_name, reqBy);

            if (
                session?.user.permissions &&
                !hasPerm('crm:remove_client', session.user.permissions)
            ) {
                toast.error('You do not have permission to remove clients');
                return;
            }

            // block withdraw action if the client is others and the user is not the one who created the report
            if (originalClientData.marketer_name !== reqBy) {
                toast.error('You are not allowed to remove this client');
                return;
            }

            const response = await authedFetchApi(
                {
                    path: `/v1/report/remove-client-from-report/${clientId}/${reqBy}`,
                },
                {
                    method: 'POST',
                    body: JSON.stringify({}),
                },
            );

            if (response.ok) {
                await fetchReports();

                toast.success('The client has been removed successfully');
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while removing the client');
        }
    }

    usePaginationManager({
        page,
        itemPerPage,
        pageCount,
        setPage,
        triggerFetch: fetchReports,
    });

    useEffect(() => {
        if (searchVersion > 0 && isFiltered && page === 1) {
            fetchReports();
        }
    }, [searchVersion, isFiltered, page]);

    return (
        <>
            <div className="flex flex-col justify-center sm:flex-row sm:justify-end mb-4 gap-2">
                <div className="items-center flex gap-2">
                    <Pagination
                        pageCount={pageCount}
                        page={page}
                        setPage={setPage}
                        isLoading={isLoading}
                    />
                    <select
                        value={itemPerPage}
                        onChange={e => setItemPerPage(parseInt(e.target.value))}
                        // defaultValue={30}
                        required
                        className="appearance-none bg-gray-50 text-gray-700 border border-gray-200 rounded-md leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    >
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <FilterButton
                        isLoading={isLoading}
                        submitHandler={handleSearch}
                        setFilters={setFilters}
                        filters={filters}
                        className="w-full justify-between sm:w-auto"
                    />
                </div>
            </div>

            {isLoading ? <p className="text-center">Loading...</p> : <></>}

            {!isLoading &&
                (clients?.items?.length !== 0 ? (
                    <div className="table-responsive text-nowrap text-md">
                        <table className="table table-striped table-bordered">
                            <thead className="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Onboard Date</th>
                                    <th>Last Order Date</th>
                                    <th>Order Update</th>
                                    <th>Country</th>
                                    <th>Company Name</th>
                                    <th>Contact Person</th>
                                    <th>Email Address</th>
                                    <th>Manage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients?.items?.map((client, index) => {
                                    const rowStyle = getRowColorByLastOrderDate(
                                        client.last_order_date,
                                    );
                                    return (
                                        <tr
                                            key={String(client._id)}
                                            style={rowStyle}
                                        >
                                            <td>
                                                {index +
                                                    1 +
                                                    itemPerPage * (page - 1)}
                                            </td>

                                            <td>
                                                {(client.onboard_date &&
                                                    formatDate(
                                                        client.onboard_date,
                                                    )) ||
                                                    'N/A'}
                                            </td>

                                            <td>
                                                {client.last_order_date
                                                    ? formatDate(
                                                          client.last_order_date,
                                                      )
                                                    : 'N/A'}
                                            </td>

                                            <td className="text-wrap">
                                                {client.order_update || 'N/A'}
                                            </td>

                                            <td>{client.country}</td>

                                            <td className="text-wrap">
                                                {client.company_name}
                                            </td>
                                            <td className="text-wrap">
                                                {client.contact_person}
                                            </td>
                                            <td className="text-wrap">
                                                {client.email_address}
                                            </td>

                                            <td
                                                className="text-center"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                <div className="inline-block">
                                                    <div className="flex gap-2">
                                                        <EditButton
                                                            isLoading={
                                                                isLoading
                                                            }
                                                            submitHandler={
                                                                editClient
                                                            }
                                                            clientData={client}
                                                        />
                                                        <DeleteButton
                                                            submitHandler={
                                                                deleteClient
                                                            }
                                                            clientData={client}
                                                        />
                                                        <RemoveClientButton
                                                            submitHandler={
                                                                removeClient
                                                            }
                                                            clientData={client}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center">No Clients To Show.</div>
                ))}
        </>
    );
};

export default Table;
