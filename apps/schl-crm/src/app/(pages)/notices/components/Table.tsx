'use client';

import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { ISO_to_DD_MM_YY as convertToDDMMYYYY } from '@repo/common/utils/date-helpers';
import moment from 'moment-timezone';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import FilterButton from './Filter';

type NoticesState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: { [key: string]: any }[];
};

const Table = () => {
    const authedFetchApi = useAuthedFetchApi();
    const [notices, setNotices] = useState<NoticesState>({
        pagination: {
            count: 0,
            pageCount: 0,
        },
        items: [],
    });

    const router = useRouter();

    const [isFiltered, setIsFiltered] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [itemPerPage, setItemPerPage] = useState<number>(30);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchVersion, setSearchVersion] = useState<number>(0);

    const [filters, setFilters] = useState({
        fromDate: '',
        toDate: '',
        noticeNo: '',
        title: '',
    });

    const getAllNotices = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                // setIsLoading(true);

                const response = await authedFetchApi<NoticesState>(
                    {
                        path: '/v1/notice/search-notices',
                        query: {
                            paginated: true,
                            page,
                            itemsPerPage: itemPerPage,
                        },
                    },
                    {
                        headers: { 'Content-Type': 'application/json' },
                        method: 'POST',
                        body: JSON.stringify({ channel: 'marketers' }),
                    },
                );

                if (response.ok) {
                    const data = response.data as NoticesState;
                    setNotices(data);
                    setIsFiltered(false);
                    setPageCount(data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while retrieving notices data');
            } finally {
                setIsLoading(false);
            }
        },
        [authedFetchApi],
    );

    const getAllNoticesFiltered = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                // setIsLoading(true);

                const response = await authedFetchApi<NoticesState>(
                    {
                        path: '/v1/notice/search-notices',
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
                            channel: 'marketers',
                        }),
                    },
                );

                if (response.ok) {
                    const data = response.data as NoticesState;
                    setNotices(data);
                    setIsFiltered(true);
                    setPageCount(data.pagination.pageCount);
                } else {
                    toastFetchError(response);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while retrieving notices data');
            } finally {
                setIsLoading(false);
            }
            return;
        },
        [authedFetchApi, filters],
    );

    const fetchNotices = useCallback(async () => {
        if (isFiltered) {
            await getAllNoticesFiltered(page, itemPerPage);
        } else {
            await getAllNotices(page, itemPerPage);
        }
    }, [isFiltered, page, itemPerPage, getAllNotices, getAllNoticesFiltered]);

    const handleSearch = useCallback(() => {
        setPage(1);
        setIsFiltered(true);
        setSearchVersion(prev => prev + 1);
    }, []);

    usePaginationManager({
        page,
        itemPerPage,
        pageCount,
        setPage,
        triggerFetch: fetchNotices,
        isFiltered,
        searchVersion,
    });

    useEffect(() => {
        if (searchVersion > 0 && isFiltered && page === 1) {
            fetchNotices();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                (notices?.items?.length !== 0 ? (
                    <div className="table-responsive text-nowrap ">
                        <table className="table table-bordered table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Notice No</th>
                                    <th>Title</th>
                                    <th>Manage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notices?.items?.map((item, index) => {
                                    return (
                                        <tr key={item.notice_no}>
                                            <td>
                                                {index +
                                                    1 +
                                                    itemPerPage * (page - 1)}
                                            </td>
                                            <td>
                                                {item.createdAt
                                                    ? moment(
                                                          convertToDDMMYYYY(
                                                              item.createdAt,
                                                          ),
                                                          'DD-MM-YYYY',
                                                      ).format('D MMMM, YYYY')
                                                    : null}
                                            </td>
                                            <td>{item.notice_no}</td>
                                            <td>{item.title}</td>
                                            <td
                                                className="text-center"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                <div className="inline-block  py-1">
                                                    <button
                                                        onClick={() => {
                                                            router.push(
                                                                process.env
                                                                    .NEXT_PUBLIC_BASE_URL +
                                                                    `/notices/${encodeURIComponent(item.notice_no)}`,
                                                            );
                                                        }}
                                                        className="items-center gap-2 rounded-md bg-amber-600 hover:opacity-90 hover:ring-2 hover:ring-amber-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2"
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            width="24"
                                                            height="24"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            stroke-width="2"
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            className="w-5 h-5"
                                                        >
                                                            <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
                                                            <path d="m21 3-9 9" />
                                                            <path d="M15 3h6v6" />
                                                        </svg>
                                                    </button>
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
                        <td colSpan={5} className=" align-center text-center">
                            No Notices To Show.
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
