'use client';

import { constructFileName, fetchApi } from '@/lib/utils';
import { formatDate } from '@/utility/date';
import { hasAnyPerm } from '@repo/schemas/utils/permission-check';
import DOMPurify from 'dompurify';
import { useSession } from 'next-auth/react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useEffect, useMemo, useState } from 'react';
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
    channel: string;
    notice_no: string;
    title: string;
    description: string;
    file_name: string;
    updatedAt: string;
    createdAt: string;
    [key: string]: any;
}

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

const ViewNotice: React.FC<ViewNoticeProps> = props => {
    const notice_no = decodeURIComponent(props.notice_no);
    const [notice, setNotice] = useState<Notice>({
        channel: '',
        notice_no: '',
        title: '',
        description: '',
        file_name: '',
        updatedAt: '',
        createdAt: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const { data: session } = useSession();
    const userPermissions = useMemo(
        () => session?.user.permissions || [],
        [session?.user.permissions],
    );

    async function getNotice() {
        try {
            setIsLoading(true);

            const response = await fetchApi(
                {
                    path: '/v1/notice/search-notices',
                    query: {
                        paginated: false,
                        filtered: true,
                    },
                },
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ noticeNo: notice_no }),
                },
            );

            if (response.ok) {
                const result = Array.isArray(response.data)
                    ? response.data
                    : response.data?.items;
                const [matchedNotice] = (result || []) as Notice[];

                if (!matchedNotice) {
                    toast.error('Notice not found', {
                        id: 'notice-error',
                    });
                    router.push(
                        process.env.NEXT_PUBLIC_BASE_URL + '/admin/notices',
                    );
                    return;
                }

                if (matchedNotice.channel !== 'production') {
                    // currently acknowledging only "marketing" channel exists besides production
                    if (
                        !hasAnyPerm(
                            ['notice:send_notice_marketers'],
                            userPermissions,
                        )
                    ) {
                        toast.error(
                            "The notice doesn't belong to this channel",
                            {
                                id: 'notice-channel',
                            },
                        );
                        router.push('/');
                    } else {
                        toast.info(
                            `The notice belongs to ${matchedNotice.channel} channel`,
                            {
                                id: 'notice-channel',
                            },
                        );
                    }
                }
                setNotice(matchedNotice);
            } else {
                toast.error(response.data as string, { id: 'notice-error' });
                router.push(
                    process.env.NEXT_PUBLIC_BASE_URL + '/admin/notices',
                );
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving the notice');
            router.push(process.env.NEXT_PUBLIC_BASE_URL + '/admin/notices');
        } finally {
            setIsLoading(false);
        }
    }

    const handleFileDownload = async () => {
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL;
            if (!baseUrl) {
                throw new Error('API base URL is not configured');
            }

            const url = new URL('/v1/ftp/download', baseUrl);
            url.searchParams.set('folderName', 'notice');
            url.searchParams.set(
                'fileName',
                constructFileName(notice.file_name, notice.notice_no),
            );

            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${session?.accessToken ?? ''}`,
                },
            });

            if (!res.ok) {
                toast.error('Error downloading the file');
                return;
            }

            const blob = await res.blob();
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
        if (notice_no) {
            getNotice();
        } else {
            setIsLoading(false);
            router.push(process.env.NEXT_PUBLIC_BASE_URL + '/admin/notices');
        }
    }, []);

    return (
        <>
            {isLoading ? <p className="text-center">Loading...</p> : null}

            {!isLoading && (
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

                    {parse(DOMPurify.sanitize(notice.description), options)}

                    {notice.file_name && (
                        <div className="file-download text-lg font-semibold font-sans">
                            <span className="font-semibold">Downloads: </span>{' '}
                            <span
                                onClick={handleFileDownload}
                                className="underline font-mono downloadable-file hover:cursor-pointer has-tooltip"
                            >
                                {notice.file_name}
                                <span className="tooltip italic font-medium rounded-md text-xs shadow-lg p-1 px-2 bg-gray-100 ml-2">
                                    Click to download
                                </span>
                            </span>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default ViewNotice;
