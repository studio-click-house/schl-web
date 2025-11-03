'use client';

import Badge from '@/components/Badge';
import CallingStatusTd from '@/components/ExtendableTd';
import Linkify from '@/components/Linkify';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { ReportDocument } from '@repo/common/models/report.schema';
import { PopulatedByEmployeeUser } from '@repo/common/types/populated-user.type';
import { getObjectChanges } from '@repo/common/utils/changes-generate';
import { YYYY_MM_DD_to_DD_MM_YY as convertToDDMMYYYY } from '@repo/common/utils/date-helpers';
import { hasPerm } from '@repo/common/utils/permission-check';
import { useSession } from 'next-auth/react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import DeleteButton from './Delete';
import EditButton from './Edit';
import FilterButton from './Filter';
import WithdrawLeadButton from './Withdraw';

type LeadsState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: ReportDocument[];
};

const Table: React.FC = props => {
    const authedFetchApi = useAuthedFetchApi();
    const [leads, setLeads] = useState<LeadsState>({
        pagination: {
            count: 0,
            pageCount: 0,
        },
        items: [],
    });

    const { data: session } = useSession();

    const router = useRouter();

    const [isFiltered, setIsFiltered] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [itemPerPage, setItemPerPage] = useState<number>(30);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchVersion, setSearchVersion] = useState<number>(0);

    const [marketerNames, setMarketerNames] = useState<string[]>([]);

    const [filters, setFilters] = useState({
        country: '',
        companyName: '',
        category: '',
        fromDate: '',
        toDate: '',
        test: false,
        prospect: false,
        generalSearchString: '',
        leadOrigin: 'generated' as 'generated' | 'transferred',
        show: 'mine' as 'all' | 'mine' | 'others',
        freshLead: true,
    });

    const getAllLeads = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                // setIsLoading(true);

                const response = await authedFetchApi<LeadsState>(
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
                            freshLead: true,
                            onlyLead: true,
                        }),
                    },
                );

                if (response.ok) {
                    const data = response.data as LeadsState;
                    setLeads(data);
                    setIsFiltered(false);
                    setPageCount(data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while retrieving leads data');
            } finally {
                setIsLoading(false);
            }
        },
        [authedFetchApi],
    );

    const getAllMarketers = useCallback(async () => {
        try {
            const response = await authedFetchApi<PopulatedByEmployeeUser[]>(
                {
                    path: '/v1/employee/search-employees',
                    query: { paginated: false, filtered: true },
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
                const marketers = response.data as PopulatedByEmployeeUser[];

                const marketer_names = marketers.map(
                    marketer => marketer.employee.company_provided_name!,
                );
                setMarketerNames(marketer_names);
            } else {
                console.error('Unable to fetch marketers');
                toast.error('Unable to fetch marketers');
                setMarketerNames([]);
            }
        } catch (e) {
            console.error(e);
            console.log('An error occurred while fetching marketer names');
        }
    }, [authedFetchApi]);

    const getAllLeadsFiltered = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                // setIsLoading(true);

                const response = await authedFetchApi<LeadsState>(
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
                            onlyLead: true,
                        }),
                    },
                );

                if (response.ok) {
                    const data = response.data as LeadsState;
                    setLeads(data);
                    setIsFiltered(true);
                    setPageCount(data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while retrieving leads data');
            } finally {
                setIsLoading(false);
            }
            return;
        },
        [authedFetchApi, filters],
    );

    const fetchReports = useCallback(async () => {
        if (!isFiltered) {
            await getAllLeads(page, itemPerPage);
        } else {
            await getAllLeadsFiltered(page, itemPerPage);
        }
    }, [isFiltered, getAllLeads, getAllLeadsFiltered, page, itemPerPage]);

    const handleSearch = useCallback(() => {
        setIsFiltered(true);
        setPage(1);
        setSearchVersion(v => v + 1);
    }, [setIsFiltered, setPage]);

    async function deleteLead(leadData: ReportDocument) {
        try {
            if (!confirm('Are you sure you want to delete this lead?')) {
                return;
            }

            if (
                session?.user.permissions &&
                !hasPerm('crm:delete_leads_approval', session?.user.permissions)
            ) {
                toast.error('You do not have permission to delete leads');
                return;
            }

            // block delete action if the lead is others and the user is not the one who created the lead
            if (leadData.marketer_name !== session?.user.provided_name) {
                toast.error('You are not allowed to delete this lead');
                return;
            }

            const response = await authedFetchApi(
                { path: '/v1/approval/new-request' },
                {
                    method: 'POST',
                    body: JSON.stringify({
                        target_model: 'Report',
                        action: 'delete',
                        object_id: leadData._id,
                        deleted_data: leadData,
                        req_by: session?.user.db_id,
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

    async function editLead(
        previousLeadData: ReportDocument,
        editedLeadData: Partial<ReportDocument>,
        setEditedData: React.Dispatch<
            React.SetStateAction<Partial<ReportDocument>>
        >,
    ) {
        try {
            if (
                session?.user.permissions &&
                !hasPerm('crm:edit_lead', session?.user.permissions)
            ) {
                toast.error('You do not have permission to edit leads');
                setEditedData({
                    ...previousLeadData,
                    updated_by: session?.user.real_name || '',
                });
                return;
            }

            if (
                !editedLeadData.followup_done &&
                editedLeadData.followup_date === ''
            ) {
                toast.error(
                    'Followup date is required because followup is set as pending for this lead',
                );
                setEditedData({
                    ...previousLeadData,
                    updated_by: session?.user.real_name || '',
                });
                return;
            }

            // block edit action if the lead is others and the user is not the one who created the lead
            if (
                previousLeadData.marketer_name !== session?.user.provided_name
            ) {
                toast.error('You are not allowed to edit this lead');
                setEditedData({
                    ...previousLeadData,
                    updated_by: session?.user.real_name || '',
                });
                return;
            }

            // send request for approval if the lead is transferred to other marketer
            if (
                previousLeadData.marketer_name !== editedLeadData.marketer_name
            ) {
                if (
                    session?.user.permissions &&
                    !hasPerm('crm:transfer_leads', session?.user.permissions)
                ) {
                    toast.error('You do not have permission to transfer leads');
                    setEditedData({
                        ...previousLeadData,
                        updated_by: session?.user.real_name || '',
                    });
                    return;
                }

                const response = await authedFetchApi(
                    { path: '/v1/approval/new-request' },
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            target_model: 'Report',
                            action: 'update',
                            object_id: previousLeadData._id,
                            changes: getObjectChanges(previousLeadData, {
                                ...editedLeadData,
                                editedLeadData,
                                is_lead: true,
                                lead_withdrawn: false,
                                lead_origin: previousLeadData.marketer_name,
                                marketer_name: editedLeadData.marketer_name,
                            }),

                            req_by: session?.user.db_id,
                        }),
                    },
                );

                if (response.ok) {
                    toast.success('Request sent for approval');
                } else {
                    toastFetchError(response);
                }

                return;
            }

            // setIsLoading(true);

            const response = await authedFetchApi(
                { path: `/v1/report/update-report/${editedLeadData._id}` },
                {
                    method: 'PUT',
                    body: JSON.stringify(editedLeadData),
                },
            );

            if (response.ok) {
                await fetchReports();

                toast.success('Edited the lead successfully');
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while editing the lead');
        } finally {
            setEditedData({
                ...previousLeadData,
                updated_by: session?.user.real_name || '',
            });
            setIsLoading(false);
        }
    }

    async function withdrawLead(
        originalLeadData: { [key: string]: any },
        leadId: string,
        reqBy: string,
    ) {
        try {
            console.log(originalLeadData.marketer_name, reqBy);

            if (!confirm('Are you sure you want to delete this lead?')) {
                return;
            }

            if (
                session?.user.permissions &&
                !hasPerm('crm:withdraw_leads', session?.user.permissions)
            ) {
                toast.error('You do not have permission to withdraw leads');
                return;
            }

            // block withdraw action if the lead is others and the user is not the one who created the lead
            if (originalLeadData.marketer_name !== reqBy) {
                toast.error('You are not allowed to withdraw this lead');
                return;
            }

            const response = await authedFetchApi(
                { path: `/v1/report/withdraw-lead/${leadId}/${reqBy}` },
                {
                    method: 'POST',
                    body: JSON.stringify({}),
                },
            );

            if (response.ok) {
                await fetchReports();

                toast.success('The lead has been withdrawn successfully');
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while withdrawing the lead');
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchVersion, isFiltered, page]);

    useEffect(() => {
        void getAllMarketers();
    }, [getAllMarketers]);

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between mb-4 gap-2">
                <button
                    onClick={() =>
                        router.push(
                            process.env.NEXT_PUBLIC_BASE_URL +
                                '/make-a-call' +
                                '?new-lead=true',
                        )
                    }
                    className="flex justify-between items-center gap-2 rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                >
                    Add new lead
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                    >
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
                        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4" />
                    </svg>
                </button>

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
                (leads?.items?.length !== 0 ? (
                    <div className="table-responsive text-nowrap text-sm">
                        <table className="table">
                            <thead className="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Lead Date</th>
                                    <th>Status</th>
                                    <th>Origin</th>
                                    <th>Country</th>
                                    <th>Website</th>
                                    <th>Category</th>
                                    <th>Company Name</th>
                                    <th>Contact Person</th>
                                    <th>Designation</th>
                                    <th>Contact Number</th>
                                    <th>Email Address</th>
                                    <th>Calling Status</th>
                                    <th>LinkedIn</th>
                                    <th>Test</th>
                                    <th>Prospected</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads?.items?.map((item, index) => {
                                    let tableRowColor = 'table-secondary';

                                    if (item.is_prospected) {
                                        if (
                                            item?.prospect_status ==
                                            'high_interest'
                                        ) {
                                            tableRowColor = 'table-success';
                                        } else if (
                                            item?.prospect_status ==
                                            'low_interest'
                                        ) {
                                            tableRowColor = 'table-warning';
                                        }
                                    } else {
                                        tableRowColor = 'table-danger';
                                    }

                                    return (
                                        <tr
                                            key={String(item._id)}
                                            className={
                                                tableRowColor
                                                    ? tableRowColor
                                                    : ''
                                            }
                                        >
                                            <td>
                                                {index +
                                                    1 +
                                                    itemPerPage * (page - 1)}
                                            </td>
                                            <td>
                                                {item.calling_date
                                                    ? convertToDDMMYYYY(
                                                          item.calling_date,
                                                      )
                                                    : null}
                                            </td>
                                            <td
                                                className="uppercase text-wrap"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {item.lead_withdrawn ? (
                                                    <Badge
                                                        value="Withdrawn"
                                                        className="bg-amber-600 text-white border-amber-600"
                                                    />
                                                ) : (
                                                    <Badge
                                                        value="Fresh"
                                                        className="bg-green-600 text-white border-green-600"
                                                    />
                                                )}
                                            </td>

                                            <td
                                                className="uppercase text-wrap"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                {item.lead_origin &&
                                                    (item.lead_origin !==
                                                    'generated' ? (
                                                        <Badge
                                                            value="Transferred"
                                                            className="bg-blue-600 text-white border-blue-600"
                                                        />
                                                    ) : (
                                                        <Badge
                                                            value="Generated"
                                                            className="bg-blue-600 text-white border-blue-600"
                                                        />
                                                    ))}
                                            </td>

                                            <td>{item.country}</td>
                                            <td>
                                                {item.website.length ? (
                                                    <Linkify
                                                        coverText="Click here to visit"
                                                        data={item.website.trim()}
                                                    />
                                                ) : (
                                                    'No link provided'
                                                )}
                                            </td>
                                            <td>{item.category}</td>
                                            <td className="text-wrap">
                                                {item.company_name}
                                            </td>
                                            <td className="text-wrap">
                                                {item.contact_person}
                                            </td>
                                            <td className="text-wrap">
                                                {item.designation}
                                            </td>
                                            <td className="text-wrap">
                                                {item.contact_number}
                                            </td>
                                            <td className="text-wrap">
                                                {item.email_address}
                                            </td>
                                            <CallingStatusTd
                                                data={item.calling_status}
                                            />
                                            <td>
                                                {item.linkedin.length ? (
                                                    <Linkify
                                                        coverText="Click here to visit"
                                                        data={item.linkedin.trim()}
                                                    />
                                                ) : (
                                                    'No link provided'
                                                )}
                                            </td>
                                            <td>
                                                {item.test_given_date_history
                                                    ?.length
                                                    ? 'Yes'
                                                    : 'No'}
                                            </td>
                                            <td>
                                                {item.is_prospected
                                                    ? `Yes (${item.followup_done ? 'Done' : 'Pending'})`
                                                    : 'No'}
                                            </td>
                                            <td
                                                className="text-center"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                <div className="inline-block">
                                                    <div className="flex gap-2">
                                                        {session?.user
                                                            .permissions &&
                                                            hasPerm(
                                                                'crm:edit_lead',
                                                                session?.user
                                                                    .permissions,
                                                            ) && (
                                                                <EditButton
                                                                    isLoading={
                                                                        isLoading
                                                                    }
                                                                    submitHandler={
                                                                        editLead
                                                                    }
                                                                    leadData={
                                                                        item
                                                                    }
                                                                    marketerNames={
                                                                        marketerNames
                                                                    }
                                                                />
                                                            )}
                                                        {!item.lead_withdrawn && (
                                                            <>
                                                                {session?.user
                                                                    .permissions &&
                                                                    hasPerm(
                                                                        'crm:delete_leads_approval',
                                                                        session
                                                                            ?.user
                                                                            .permissions,
                                                                    ) && (
                                                                        <DeleteButton
                                                                            submitHandler={
                                                                                deleteLead
                                                                            }
                                                                            leadData={
                                                                                item
                                                                            }
                                                                        />
                                                                    )}
                                                                {session?.user
                                                                    .permissions &&
                                                                    hasPerm(
                                                                        'crm:withdraw_leads',
                                                                        session
                                                                            ?.user
                                                                            .permissions,
                                                                    ) && (
                                                                        <WithdrawLeadButton
                                                                            submitHandler={
                                                                                withdrawLead
                                                                            }
                                                                            leadData={
                                                                                item
                                                                            }
                                                                        />
                                                                    )}
                                                            </>
                                                        )}
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
                            No Leads To Show.
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
