'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';

import Badge from '@/components/Badge';
import NoData, { Type } from '@/components/NoData';
import Pagination from '@/components/Pagination';
import { usePaginationManager } from '@/hooks/usePaginationManager';
import { formatDate } from '@repo/common/utils/date-helpers';
import { cn, constructFileName } from '@repo/common/utils/general-utils';

import type { Permissions } from '@repo/common/types/permission.type';
import { hasAnyPerm, hasPerm } from '@repo/common/utils/permission-check';
import { CirclePlus, SquareArrowOutUpRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { NoticeDataType, validationSchema } from '../../admin/notices/schema';
import DeleteButton from './Delete';
import EditButton from './Edit';
import FilterButton from './Filter';

type NoticesState = {
    pagination: {
        count: number;
        pageCount: number;
    };
    items: NoticeDataType[];
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

    const { data: session } = useSession();

    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    const canViewAllChannels = useMemo(
        () =>
            hasAnyPerm(
                [
                    'notice:send_notice',
                    'notice:edit_notice',
                    'notice:delete_notice',
                ] as Permissions[],
                userPermissions,
            ),
        [userPermissions],
    );

    const router = useRouter();

    const [isFiltered, setIsFiltered] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [pageCount, setPageCount] = useState<number>(0);
    const [itemPerPage, setItemPerPage] = useState<number>(30);
    const [loading, setIsLoading] = useState<boolean>(true);
    const [searchVersion, setSearchVersion] = useState<number>(0);

    const [filters, setFilters] = useState({
        fromDate: '',
        toDate: '',
        noticeNo: '',
        title: '',
        channel: '',
    });

    const getAllNotices = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                // API will filter by user's department automatically if they don't have send_notice permission
                const baseFilters = {};

                const response = await authedFetchApi<NoticesState>(
                    {
                        path: '/v1/notice/search-notices',
                        query: {
                            page,
                            itemsPerPage: itemPerPage,
                            // filtered: false,
                            paginated: true,
                        },
                    },
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(baseFilters),
                    },
                );

                if (response.ok) {
                    setNotices(response.data);
                    setIsFiltered(false);
                    setPageCount(response.data.pagination.pageCount);
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
        [authedFetchApi, userPermissions],
    );

    const getAllNoticesFiltered = useCallback(
        async (page: number, itemPerPage: number) => {
            try {
                const response = await authedFetchApi<NoticesState>(
                    {
                        path: '/v1/notice/search-notices',
                        query: {
                            page,
                            itemsPerPage: itemPerPage,
                            // filtered: true,
                            paginated: true,
                        },
                    },
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(filters),
                    },
                );

                if (response.ok) {
                    setNotices(response.data);
                    setIsFiltered(true);
                    setPageCount(response.data.pagination.pageCount);
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

    const deleteNotice = async (noticeData: NoticeDataType) => {
        try {
            const response = await authedFetchApi<{ message: string }>(
                { path: `/v1/notice/delete-notice/${noticeData._id}` },
                {
                    method: 'DELETE',
                },
            );

            if (response.ok) {
                if (noticeData.file_name) {
                    console.log(
                        'Deleting file from ftp server',
                        constructFileName(
                            noticeData.file_name,
                            noticeData.notice_no,
                        ),
                        noticeData.file_name,
                        noticeData.notice_no,
                    );

                    const ftpDeleteConfirmation = confirm(
                        'Delete attached file from the FTP server?',
                    );
                    if (ftpDeleteConfirmation) {
                        const ftp_response = await authedFetchApi<{
                            message: string;
                        }>(
                            {
                                path: '/v1/ftp/delete',
                                query: {
                                    folderName: 'notice',
                                    fileName: constructFileName(
                                        noticeData.file_name,
                                        noticeData.notice_no,
                                    ),
                                },
                            },
                            {
                                method: 'DELETE',
                            },
                        );
                        if (ftp_response.ok) {
                            toast.success(
                                'Deleted the attached file from FTP server',
                            );
                        } else {
                            toastFetchError(ftp_response);
                        }
                    } else {
                        toast.success(response.data.message);
                    }
                } else {
                    toast.success('Successfully deleted the notice', {
                        id: 'success',
                    });
                }
                await fetchNotices();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while deleting the notice');
        }
        return;
    };

    const editNotice = async (editedNoticeData: NoticeDataType) => {
        try {
            setIsLoading(true);
            const parsed = validationSchema.safeParse(editedNoticeData);

            if (!parsed.success) {
                console.error(parsed.error.issues.map(issue => issue.message));
                toast.error('Invalid form data');
                return;
            }

            const { _id, ...payload } = parsed.data;

            if (!_id) {
                toast.error('Missing notice identifier');
                return;
            }

            const response = await authedFetchApi(
                { path: `/v1/notice/update-notice/${_id}` },
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (response.ok) {
                toast.success('Updated the notice data');

                await fetchNotices();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while updating the notice');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchNotices = useCallback(async () => {
        if (!isFiltered) {
            await getAllNotices(page, itemPerPage);
        } else {
            await getAllNoticesFiltered(page, itemPerPage);
        }
    }, [isFiltered, getAllNotices, getAllNoticesFiltered, page, itemPerPage]);

    usePaginationManager({
        page,
        itemPerPage,
        pageCount,
        setPage,
        triggerFetch: fetchNotices,
    });

    // NOTE: Intentionally exclude `fetchNotices` from the dependency array below.
    // Including it may cause the effect to re-run when `filters` changes (because
    // `getAllNoticesFiltered` depends on `filters`), which would trigger a fetch
    // on every filter change. We want fetching to happen only when the user
    // explicitly clicks the Search button (which updates `searchVersion`/`isFiltered`).
    useEffect(() => {
        if (searchVersion > 0 && isFiltered && page === 1) {
            fetchNotices();
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
                    canViewAllChannels
                        ? 'sm:flex-row sm:justify-between'
                        : 'sm:justify-end sm:flex-row',
                )}
            >
                {hasPerm('notice:send_notice', userPermissions) && (
                    <button
                        onClick={() =>
                            router.push(
                                process.env.NEXT_PUBLIC_BASE_URL +
                                    '/admin/notices',
                            )
                        }
                        className="flex justify-between items-center gap-2 rounded-md bg-primary hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
                    >
                        Send new notice
                        <CirclePlus size={18} />
                    </button>
                )}

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
                        isLoading={loading}
                        submitHandler={handleSearch}
                        setFilters={setFilters}
                        filters={filters}
                        className="w-full justify-between sm:w-auto"
                    />
                </div>
            </div>

            {loading ? <p className="text-center">Loading...</p> : <></>}

            <div className="table-responsive text-nowrap text-base">
                {!loading &&
                    (notices?.items?.length !== 0 ? (
                        <table className="table table-bordered table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Notice No</th>
                                    <th>Title</th>
                                    {canViewAllChannels && <th>Departments</th>}
                                    <th>Manage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notices?.items?.map((notice, index) => {
                                    return (
                                        <tr key={notice.notice_no}>
                                            <td>
                                                {index +
                                                    1 +
                                                    itemPerPage * (page - 1)}
                                            </td>
                                            <td>
                                                {notice.createdAt
                                                    ? formatDate(
                                                          notice.createdAt,
                                                      )
                                                    : null}
                                            </td>
                                            <td>{notice.notice_no}</td>
                                            <td className="text-wrap">
                                                {notice.title}
                                            </td>
                                            {canViewAllChannels && (
                                                <td
                                                    className="uppercase text-wrap"
                                                    style={{
                                                        verticalAlign: 'middle',
                                                    }}
                                                >
                                                    <div className="flex flex-wrap gap-1">
                                                        {Array.isArray(
                                                            notice.channel,
                                                        ) ? (
                                                            notice.channel.map(
                                                                (dept, i) => (
                                                                    <Badge
                                                                        key={i}
                                                                        value={
                                                                            dept
                                                                        }
                                                                    />
                                                                ),
                                                            )
                                                        ) : (
                                                            <Badge
                                                                value={
                                                                    notice.channel
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                            <td
                                                className="text-center"
                                                style={{
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                <div className="inline-block">
                                                    <div className="flex gap-2">
                                                        {hasPerm(
                                                            'notice:delete_notice',
                                                            userPermissions,
                                                        ) && (
                                                            <DeleteButton
                                                                noticeData={
                                                                    notice
                                                                }
                                                                submitHandler={
                                                                    deleteNotice
                                                                }
                                                            />
                                                        )}

                                                        {hasPerm(
                                                            'notice:edit_notice',
                                                            userPermissions,
                                                        ) && (
                                                            <EditButton
                                                                isLoading={
                                                                    loading
                                                                }
                                                                submitHandler={
                                                                    editNotice
                                                                }
                                                                noticeData={
                                                                    notice
                                                                }
                                                            />
                                                        )}

                                                        <button
                                                            onClick={() => {
                                                                window.open(
                                                                    process.env
                                                                        .NEXT_PUBLIC_BASE_URL +
                                                                        `/notices/${encodeURIComponent(notice.notice_no)}`,
                                                                    '_blank',
                                                                );
                                                            }}
                                                            className="items-center gap-2 rounded-md bg-amber-600 hover:opacity-90 hover:ring-2 hover:ring-amber-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2"
                                                        >
                                                            <SquareArrowOutUpRight
                                                                size={16}
                                                            />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <NoData text="No Notices Found" type={Type.danger} />
                    ))}
            </div>
            <style jsx>
                {`
                    th,
                    td {
                        padding: 1.5px 5px;
                    }
                `}
            </style>
        </>
    );
};

export default Table;
