'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { Download, File, FileArchive, FileImage, FileSpreadsheet, FileText } from 'lucide-react';

import { formatDate } from '@repo/common/utils/date-helpers';

import type { EmployeeDepartment } from '@repo/common/constants/employee.constant';
import { hasPerm } from '@repo/common/utils/permission-check';
import createDOMPurify from 'dompurify';
import { useSession } from 'next-auth/react';
import { useRouter } from 'nextjs-toploader/app';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { toast } from 'sonner';

import parse, {
    DOMNode,
    domToReact,
    Element,
    HTMLReactParserOptions,
} from 'html-react-parser';
interface ViewNoticeProps {
    notice_no: string;
}

interface Notice {
    channel: EmployeeDepartment[];
    notice_no: string;
    title: string;
    description: string;
    file_name: string;
    updatedAt: string;
    createdAt: string;
    [key: string]: any;
}

type NoticeSearchResponse = Notice[] | { items?: Notice[] };

const options: HTMLReactParserOptions = {
    replace(domNode) {
        // Check if domNode is an instance of Element and has attribs
        if (domNode instanceof Element && domNode.attribs) {
            const { name, children } = domNode;

            if (name === 'ul') {
                return (
                    <ul className="list-disc ml-5">
                        {domToReact(children as DOMNode[], options)}
                    </ul>
                );
            }

            if (name === 'ol') {
                return (
                    <ol className="list-decimal ml-5">
                        {domToReact(children as DOMNode[], options)}
                    </ol>
                );
            }

            if (name === 'p') {
                // Check if the parent exists, is an instance of Element, and its name is 'li'
                const parentIsLi =
                    domNode.parent &&
                    (domNode.parent instanceof Element ||
                        (domNode.parent as any).name) &&
                    (domNode.parent as Element).name === 'li';

                return (
                    <p className={parentIsLi ? '' : 'mb-4'}>
                        {domToReact(children as DOMNode[], options)}
                    </p>
                );
            }

            if (name === 'a') {
                return (
                    <a
                        href={domNode.attribs.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                    >
                        {domToReact(children as DOMNode[], options)}
                    </a>
                );
            }

            // we can add more custom replacements here as needed
        }
    },
};

const sanitizeHtml = (html: string): string => {
    if (typeof window === 'undefined') {
        return html;
    }

    return createDOMPurify(window).sanitize(html);
};

const ViewNotice: React.FC<ViewNoticeProps> = props => {
    const notice_no = decodeURIComponent(props.notice_no);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const router = useRouter();
    const routerRef = useRef(router);
    useEffect(() => {
        routerRef.current = router;
    }, [router]);

    const authedFetchApi = useAuthedFetchApi();
    const lastFetchedNotice = useRef<string | null>(null);

    const { data: session } = useSession();
    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );
    const userDepartment = session?.user.department;

    const getNotice = useCallback(async () => {
        try {
            setIsLoading(true);

            const response = await authedFetchApi<NoticeSearchResponse>(
                {
                    path: `/v1/notice/get-notice`,
                    query: {
                        noticeNo: notice_no,
                    },
                },
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            );

            if (response.ok) {
                const noticeData = response.data as Notice;

                if (!noticeData) {
                    toast.error('Notice not found', {
                        id: 'notice-error',
                    });
                    routerRef.current.replace(
                        process.env.NEXT_PUBLIC_BASE_URL + '/admin/notices',
                    );
                    return;
                }

                // The API already handles department filtering, so if we get here the user has access
                setNotice(noticeData);
                lastFetchedNotice.current = notice_no;
            } else {
                toastFetchError(response, 'Failed to retrieve notice');
                routerRef.current.replace(
                    process.env.NEXT_PUBLIC_BASE_URL + '/admin/notices',
                );
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving the notice');
            routerRef.current.replace(
                process.env.NEXT_PUBLIC_BASE_URL + '/admin/notices',
            );
        } finally {
            setIsLoading(false);
        }
    }, [authedFetchApi, notice_no]);

    const handleFileDownload = async () => {
        if (!notice) {
            return;
        }

        try {
            const response = await authedFetchApi<Blob>(
                {
                    path: '/v1/ftp/download',
                    query: {
                        folderName: 'notice',
                        fileName: notice.file_name,
                    },
                },
                {
                    method: 'GET',
                },
            );

            if (!response.ok) {
                toastFetchError(response, 'Error downloading the file');
                return;
            }

            const blob = response.data;
            if (!(blob instanceof Blob)) {
                toast.error('Unexpected file response');
                return;
            }
            const downloadUrl = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = downloadUrl;
            anchor.download = notice.file_name;
            document.body.appendChild(anchor);
            anchor.click();
            window.URL.revokeObjectURL(downloadUrl);
            anchor.remove();
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while downloading the file');
        }
    };

    useEffect(() => {
        if (!notice_no) {
            setIsLoading(false);
            routerRef.current.replace(
                process.env.NEXT_PUBLIC_BASE_URL + '/admin/notices',
            );
            return;
        }

        if (lastFetchedNotice.current === notice_no) {
            return;
        }

        lastFetchedNotice.current = notice_no;
        getNotice();
    }, [getNotice, notice_no]);

    if (isLoading || !notice) {
        return <p className="text-center">Loading...</p>;
    }

    return (
        <>
            {notice && (
                <div className="notice container mt-10 md:mt-20 mb-3">
                    <div className="notice-header mb-6">
                        <h2 className="mb-0 font-semibold text-4xl">
                            {notice.title}
                        </h2>
                        <p className="text-md font-medium text-gray-600">
                            {notice.createdAt
                                ? formatDate(notice?.createdAt)
                                : null}
                        </p>
                    </div>

                    {parse(sanitizeHtml(notice.description), options)}

                    {notice.file_name && (
                        <div className="mt-6 pt-5 border-t border-gray-100">
                            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                                Attachment
                            </p>
                            <button
                                onClick={handleFileDownload}
                                className="group flex items-center gap-3 w-full sm:w-auto max-w-sm px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 text-left"
                                title={`Download ${notice.file_name}`}
                            >
                                <span className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-gray-200 group-hover:border-blue-200 text-gray-400 group-hover:text-blue-500 transition-colors duration-200">
                                    {(() => {
                                        const ext = notice.file_name.split('.').pop()?.toLowerCase();
                                        if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet size={18} />;
                                        if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) return <FileImage size={18} />;
                                        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return <FileArchive size={18} />;
                                        if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return <FileText size={18} />;
                                        return <File size={18} />;
                                    })()}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-medium text-gray-700 group-hover:text-blue-700 truncate transition-colors duration-200">
                                        {notice.file_name}
                                    </span>
                                    <span className="block text-xs text-gray-400 group-hover:text-blue-400 transition-colors duration-200 mt-0.5">
                                        Click to download
                                    </span>
                                </span>
                                <span className="flex-shrink-0 text-gray-300 group-hover:text-blue-400 transition-colors duration-200">
                                    <Download size={16} />
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default ViewNotice;
