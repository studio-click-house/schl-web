'use client';

import { ISO_to_DD_MM_YY as convertToDDMMYYYY } from '@repo/common/utils/date-helpers';
import {
    fetchApi,
    fetchApi as fetchData,
} from '@repo/common/utils/general-utils';
import moment from 'moment-timezone';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useEffect, useState } from 'react';
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

            // Add more custom replacements as needed
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

    let constructFileName = (file_name: string, notice_no: string): string => {
        let file_ext = file_name.split('.').pop();
        let file_name_without_ext = file_name.split('.').slice(0, -1).join('.');
        let new_file_name = `${file_name_without_ext}_${notice_no}.${file_ext}`;
        return new_file_name;
    };

    const getNotice = useCallback(async () => {
        try {
            setIsLoading(true);

            const response = await fetchApi(
                {
                    path: '/v1/notice/get-notice',
                    query: {
                        notice_no: notice_no,
                    },
                },
                {
                    method: 'GET',
                },
            );

            if (response.ok) {
                if (response.data?.channel != 'marketers') {
                    toast.error("The notice doesn't belong to this channel");
                    router.push('/');
                }
                setNotice(response.data);
            } else {
                toast.error(response.data);
                router.push(process.env.NEXT_PUBLIC_BASE_URL + '/notices');
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving the notice');
            router.push(process.env.NEXT_PUBLIC_BASE_URL + '/notices');
        } finally {
            setIsLoading(false);
        }
    }, [notice_no, router]);

    const handleFileDownload = async () => {
        try {
            const response = await fetchApi(
                {
                    path: '/v1/ftp/download',
                    query: {
                        folder_name: 'notice',
                        file_name: constructFileName(
                            notice.file_name,
                            notice.notice_no,
                        ),
                    },
                },
                {
                    method: 'GET',
                },
            );

            if (response.ok) {
                // Create a blob from the response and download it
                const blob = await response.data.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = notice.file_name;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                console.error(response.data);
                toast.error('Error downloading the file');
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while downloading the file');
        }
    };

    useEffect(() => {
        getNotice();
    }, [getNotice]);

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
                                ? moment(
                                      convertToDDMMYYYY(notice?.createdAt),
                                      'DD-MM-YYYY',
                                  ).format('D MMMM, YYYY')
                                : null}
                        </p>
                    </div>
                    {parse(notice.description, options)}

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
