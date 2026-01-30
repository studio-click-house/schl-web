'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';

import ExtendableTd from '@/components/ExtendableTd';
import { cn, removeDuplicates } from '@repo/common/utils/general-utils';

import { hasPerm } from '@repo/common/utils/permission-check';

import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { ClientDocument } from '@repo/common/models/client.schema';
import type { EmployeeDocument } from '@repo/common/models/employee.schema';
import {
    YYYY_MM_DD_to_DD_MM_YY as convertToDDMMYYYY,
    formatDate,
    getRowColorByLastOrderDate,
} from '@repo/common/utils/date-helpers';
import { CirclePlus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    validationSchema,
    ClientDataType as zod_ClientDataType,
} from '../schema';
import DeleteButton from './Delete';
import EditButton from './Edit';
import FilterButton from './Filter';

type ClientsState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: Array<
        ClientDocument & {
            last_order_date?: string | null;
            order_update?: string | null;
        }
    >;
};

const Table: React.FC = () => {
    const [clients, setClients] = useState<ClientsState>({
        pagination: {
            count: 0,
            pageCount: 0,
        },
        items: [] as Array<
            ClientDocument & { last_order_date?: string | null }
        >,
    });

    const { data: session } = useSession();
    const authedFetchApi = useAuthedFetchApi();

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const router = useRouter();

    const [isFiltered, setIsFiltered] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [itemPerPage, setItemPerPage] = useState<number>(30);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchVersion, setSearchVersion] = useState(0);

    const [filters, setFilters] = useState({
        marketerName: '',
        clientCode: '',
        contactPerson: '',
        countryName: '',
        category: '',
        generalSearchString: '',
        orderFrequency: '' as '' | 'consistent' | 'regular' | 'irregular',
    });

    const [marketerNames, setMarketerNames] = useState<string[]>([]);

    const getAllClients = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                // setLoading(true);

                const response = await authedFetchApi<ClientsState>(
                    {
                        path: '/v1/client/search-clients',
                        query: {
                            paginated: true,
                            // filtered: false,
                            page,
                            itemsPerPage: itemPerPage,
                        },
                    },
                    {
                        method: 'POST',
                        headers: {
                            Accept: '*/*',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({}),
                    },
                );

                if (response.ok) {
                    setClients(response.data);
                    setPageCount(response.data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while retrieving clients data');
            } finally {
                setLoading(false);
            }
        },
        [authedFetchApi],
    );

    const getAllClientsFiltered = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                // setLoading(true);

                const response = await authedFetchApi<ClientsState>(
                    {
                        path: '/v1/client/search-clients',
                        query: {
                            paginated: true,
                            // filtered: true,
                            page,
                            itemsPerPage: itemPerPage,
                        },
                    },
                    {
                        method: 'POST',
                        headers: {
                            Accept: '*/*',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            ...filters,
                        }),
                    },
                );

                if (response.ok) {
                    setClients(response.data);
                    setIsFiltered(true);
                    setPageCount(response.data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while retrieving clients data');
            } finally {
                setLoading(false);
            }
            return;
        },
        [authedFetchApi, filters],
    );

    const deleteClient = useCallback(
        async (clientData: ClientDocument) => {
            try {
                const response = await authedFetchApi<{ message: string }>(
                    { path: '/v1/approval/new-request' },
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            target_model: 'Client',
                            action: 'delete',
                            object_id: clientData._id,
                            deleted_data: clientData,
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
                toast.error(
                    'An error occurred while sending request for approval',
                );
            }
            return;
        },
        [authedFetchApi],
    );

    const getAllMarketers = useCallback(async () => {
        try {
            const response = await authedFetchApi<
                EmployeeDocument[] | { items?: EmployeeDocument[] }
            >(
                {
                    path: '/v1/employee/search-employees',
                    query: {
                        paginated: false,
                        // filtered: true
                    },
                },
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ department: 'Marketing' }),
                },
            );

            if (response.ok) {
                const marketers = Array.isArray(response.data)
                    ? response.data
                    : Array.isArray(response.data?.items)
                      ? response.data.items
                      : [];
                const marketerNames = removeDuplicates(
                    marketers
                        .map(marketer => marketer.company_provided_name?.trim())
                        .filter((name): name is string => Boolean(name)),
                    name => name.toLowerCase(),
                );

                setMarketerNames(marketerNames);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving marketers data');
        }
    }, [authedFetchApi]);

    const editClient = async (editedClientData: zod_ClientDataType) => {
        try {
            setLoading(true);
            const parsed = validationSchema.safeParse(editedClientData);

            if (!parsed.success) {
                console.error(parsed.error.issues.map(issue => issue.message));
                toast.error('Invalid form data');
                return;
            }

            const { _id, ...rest } = parsed.data;

            if (!_id) {
                toast.error('Missing client identifier');
                return;
            }

            const payload = Object.fromEntries(
                Object.entries(rest).filter(([, value]) => value !== undefined),
            );

            const response = await authedFetchApi(
                {
                    path: `/v1/client/update-client/${_id}`,
                },
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (response.ok) {
                toast.success('Updated the client data');
                await fetchClients();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while updating the client');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getAllMarketers();
    }, [getAllMarketers]);

    const fetchClients = useCallback(async () => {
        if (!isFiltered) {
            await getAllClients(page, itemPerPage);
        } else {
            await getAllClientsFiltered(page, itemPerPage);
        }
    }, [isFiltered, getAllClients, getAllClientsFiltered, page, itemPerPage]);

    usePaginationManager({
        page,
        itemPerPage,
        pageCount,
        setPage,
        triggerFetch: fetchClients,
    });

    useEffect(() => {
        if (searchVersion > 0 && isFiltered && page === 1) {
            fetchClients();
        }
    }, [searchVersion, isFiltered, page]);

    const handleSearch = useCallback(() => {
        setIsFiltered(true);
        setPage(1);
        setSearchVersion(v => v + 1);
    }, [setIsFiltered, setPage]);

    return (
        <>
            <div
                className={cn(
                    'flex flex-col mb-4 gap-2',
                    hasPerm('admin:create_client', userPermissions)
                        ? 'sm:flex-row sm:justify-between sm:items-center'
                        : 'sm:justify-end sm:flex-row sm:items-center',
                )}
            >
                {hasPerm('admin:create_client', userPermissions) && (
                    <button
                        onClick={() =>
                            router.push(
                                process.env.NEXT_PUBLIC_BASE_URL +
                                    '/admin/clients/create-client',
                            )
                        }
                        className="flex justify-between items-center gap-2 rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                    >
                        Create new client
                        <CirclePlus size={18} />
                    </button>
                )}

                <div className="mb-2 sm:mb-0">
                    <div
                        aria-label="Row color legend"
                        role="list"
                        className="text-sm text-gray-800 font-semibold flex gap-4 items-center"
                    >
                        <div
                            role="listitem"
                            className="flex items-center gap-2"
                        >
                            <span
                                className="w-4 h-4 inline-block rounded"
                                style={{ backgroundColor: '#bbf7d0' }}
                                aria-hidden
                            />
                            <span>0–14 days since last order</span>
                        </div>
                        <div
                            role="listitem"
                            className="flex items-center gap-2"
                        >
                            <span
                                className="w-4 h-4 inline-block rounded"
                                style={{ backgroundColor: '#fde68a' }}
                                aria-hidden
                            />
                            <span>15–29 days since last order</span>
                        </div>
                        <div
                            role="listitem"
                            className="flex items-center gap-2"
                        >
                            <span
                                className="w-4 h-4 inline-block rounded"
                                style={{ backgroundColor: '#fecaca' }}
                                aria-hidden
                            />
                            <span>30+ days or no orders</span>
                        </div>
                    </div>
                </div>

                <div className="items-center flex gap-2">
                    <Pagination
                        page={page}
                        pageCount={pageCount}
                        setPage={setPage}
                        isLoading={loading}
                    />

                    <select
                        value={itemPerPage}
                        onChange={e => setItemPerPage(parseInt(e.target.value))}
                        // defaultValue={30}
                        required
                        className="appearance-none cursor-pointer px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-md leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    >
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <FilterButton
                        loading={loading}
                        submitHandler={handleSearch}
                        setFilters={setFilters}
                        filters={filters}
                        marketerNames={marketerNames}
                        className="w-full justify-between sm:w-auto"
                    />
                </div>
            </div>

            {loading ? <p className="text-center">Loading...</p> : <></>}

            <div className="table-responsive text-nowrap text-base">
                {!loading &&
                    (clients?.items?.length !== 0 ? (
                        <table className="table border table-bordered table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th>S/N</th>
                                    <th>Client Code</th>
                                    <th>Client Name</th>
                                    <th>Last Order</th>
                                    <th>Marketer</th>
                                    <th>Category</th>
                                    <th>Contact Person</th>
                                    <th>Email</th>
                                    <th>Country</th>
                                    <th>Prices</th>
                                    {hasPerm(
                                        'admin:manage_client',
                                        userPermissions,
                                    ) && <th>Action</th>}
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
                                            <td className="text-wrap">
                                                {client.client_code}
                                            </td>

                                            <td className="text-wrap">
                                                {client.client_name}
                                            </td>
                                            <td className="text-wrap">
                                                {client.last_order_date
                                                    ? formatDate(
                                                          client.last_order_date,
                                                      )
                                                    : 'N/A'}
                                            </td>
                                            <td className="text-wrap">
                                                {client.marketer}
                                            </td>
                                            <td className="text-wrap">
                                                {client.category}
                                            </td>
                                            <td className="text-wrap">
                                                {client.contact_person}
                                            </td>
                                            <td className="text-wrap">
                                                {client.email}
                                            </td>
                                            <td className="text-wrap">
                                                {client.country}
                                            </td>

                                            <ExtendableTd
                                                data={client.prices || ''}
                                            />
                                            {hasPerm(
                                                'admin:manage_client',
                                                userPermissions,
                                            ) && (
                                                <td
                                                    className="text-center"
                                                    style={{
                                                        verticalAlign: 'middle',
                                                    }}
                                                >
                                                    <div className="inline-block">
                                                        <div className="flex gap-2">
                                                            <DeleteButton
                                                                clientData={
                                                                    client
                                                                }
                                                                submitHandler={
                                                                    deleteClient
                                                                }
                                                            />

                                                            <EditButton
                                                                clientData={
                                                                    client as unknown as zod_ClientDataType
                                                                }
                                                                marketerNames={
                                                                    marketerNames
                                                                }
                                                                orderUpdate={
                                                                    client.order_update ||
                                                                    ''
                                                                }
                                                                submitHandler={
                                                                    editClient
                                                                }
                                                                loading={
                                                                    loading
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <NoData text="No Clients Found" type={Type.danger} />
                    ))}
            </div>
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
