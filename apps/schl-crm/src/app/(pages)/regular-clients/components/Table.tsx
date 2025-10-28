'use client';
import Pagination from '@/components/Pagination';
import { YYYY_MM_DD_to_DD_MM_YY as convertToDDMMYYYY } from '@/utility/date';
import fetchData from '@/utility/fetch';
import { ReportDocument } from '@repo/schemas/report.schema';
import { useSession } from 'next-auth/react';
import React, { useEffect, useRef, useState } from 'react';
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
    items: ReportDocument[];
};

const Table = () => {
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

    const prevPageCount = useRef<number>(0);
    const prevPage = useRef<number>(1);

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

    async function getAllClients() {
        try {
            // setIsLoading(true);

            let url: string =
                process.env.NEXT_PUBLIC_BASE_URL +
                '/api/report?action=get-all-reports';
            let options: {} = {
                method: 'POST',
                headers: {
                    filtered: false,
                    paginated: true,
                    item_per_page: itemPerPage,
                    page,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    show: 'mine',
                    regularClient: true,
                }),
            };

            let response = await fetchData(url, options);

            if (response.ok) {
                setClients(response.data);
                setIsFiltered(false);
            } else {
                toast.error(response.data);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving clients data');
        } finally {
            setIsLoading(false);
        }
    }

    async function getAllClientsFiltered() {
        try {
            // setIsLoading(true);

            let url: string =
                process.env.NEXT_PUBLIC_BASE_URL +
                '/api/report?action=get-all-reports';
            let options: {} = {
                method: 'POST',
                headers: {
                    filtered: true,
                    paginated: true,
                    item_per_page: itemPerPage,
                    page: !isFiltered ? 1 : page,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...filters,
                    regularClient: true,
                }),
            };

            let response = await fetchData(url, options);

            if (response.ok) {
                setClients(response.data);
                setIsFiltered(true);
            } else {
                toast.error(response.data);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving clients data');
        } finally {
            setIsLoading(false);
        }
        return;
    }

    async function deleteClient(clientData: ReportDocument) {
        try {
            if (clientData.marketer_name !== session?.user.provided_name) {
                toast.error('You are not allowed to delete this client');
                return;
            }

            let url: string =
                process.env.NEXT_PUBLIC_PORTAL_URL +
                '/api/approval?action=new-request';
            let options: {} = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    target_model: 'Report',
                    action: 'delete',
                    object_id: clientData._id,
                    deleted_data: clientData,
                    req_by: session?.user.db_id,
                }),
            };

            let response = await fetchData(url, options);

            if (response.ok) {
                toast.success('Request sent for approval');
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while sending request for approval');
        }
        return;
    }

    async function editClient(
        originalClientData: { [key: string]: any },
        editedData: { [key: string]: any },
        setEditedData: React.Dispatch<
            React.SetStateAction<{ [key: string]: any }>
        >,
    ) {
        try {
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
                    ...originalClientData,
                    updated_by: session?.user.real_name || '',
                });
                return;
            }

            // setIsLoading(true);

            const editReportUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/report?action=edit-report`;
            const editOptions = {
                method: 'POST',
                body: JSON.stringify(editedData),
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            const response = await fetchData(editReportUrl, editOptions);

            if (response.ok) {
                if (!isFiltered) await getAllClients();
                else await getAllClientsFiltered();

                toast.success('Edited the client data successfully');
            } else {
                toast.error(response.data);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while editing the client data');
        } finally {
            setEditedData({
                ...originalClientData,
                updated_by: session?.user.real_name || '',
            });
            setIsLoading(false);
        }
    }

    async function removeClient(
        originalClientData: { [key: string]: any },
        clientId: string,
        reqBy: string,
    ) {
        try {
            console.log(originalClientData.marketer_name, reqBy);

            // block withdraw action if the client is others and the user is not the one who created the report
            if (originalClientData.marketer_name !== reqBy) {
                toast.error('You are not allowed to remove this client');
                return;
            }

            let url: string =
                process.env.NEXT_PUBLIC_BASE_URL +
                '/api/report?action=remove-client';
            let options: {} = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: clientId,
                    req_by: reqBy,
                }),
            };

            let response = await fetchData(url, options);

            if (response.ok) {
                if (!isFiltered) await getAllClients();
                else await getAllClientsFiltered();

                toast.success('The client has been removed successfully');
            } else {
                toast.error(response.data);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while removing the client');
        }
    }

    useEffect(() => {
        getAllClients();
    }, []);

    useEffect(() => {
        if (prevPage.current !== 1 || page > 1) {
            if (clients?.pagination?.pageCount == 1) return;
            if (!isFiltered) getAllClients();
            else getAllClientsFiltered();
        }
        prevPage.current = page;
    }, [page]);

    useEffect(() => {
        if (clients?.pagination?.pageCount !== undefined) {
            setPage(1);
            if (prevPageCount.current !== 0) {
                if (!isFiltered) getAllClientsFiltered();
            }
            if (clients) setPageCount(clients?.pagination?.pageCount);
            prevPageCount.current = clients?.pagination?.pageCount;
            prevPage.current = 1;
        }
    }, [clients?.pagination?.pageCount]);

    useEffect(() => {
        // Reset to first page when itemPerPage changes
        prevPageCount.current = 0;
        prevPage.current = 1;
        setPage(1);

        if (!isFiltered) getAllClients();
        else getAllClientsFiltered();
    }, [itemPerPage]);

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
                        submitHandler={getAllClientsFiltered}
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
                                    <th>Country</th>
                                    <th>Company Name</th>
                                    <th>Contact Person</th>
                                    <th>Email Address</th>
                                    <th>Manage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients?.items?.map((client, index) => {
                                    return (
                                        <tr key={String(client._id)}>
                                            <td>
                                                {index +
                                                    1 +
                                                    itemPerPage * (page - 1)}
                                            </td>

                                            <td>
                                                {client.onboard_date &&
                                                    convertToDDMMYYYY(
                                                        client.onboard_date,
                                                    )}
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
                    <tr key={0}>
                        <td colSpan={16} className=" align-center text-center">
                            No Clients To Show.
                        </td>
                    </tr>
                ))}
            <style jsx>
                {`
                    th,
                    td {
                        padding: 2.5px 10px;
                    }
                `}
            </style>
        </>
    );
};

export default Table;
