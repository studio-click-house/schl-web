'use client';

import moment from 'moment-timezone';
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

import { generateAvatar } from '@repo/common/utils/general-utils';
import createDOMPurify from 'dompurify';
import parse, {
    DOMNode,
    domToReact,
    Element,
    HTMLReactParserOptions,
} from 'html-react-parser';

import { UpdateCommitFormType } from '../schema';
import DeleteButton from './Delete';
import EditButton from './Edit';

const DESCRIPTION_CHAR_LIMIT = 300;
const DESCRIPTION_BUFFER = 25;

const richTextOptions: HTMLReactParserOptions = {
    replace(domNode) {
        if (domNode instanceof Element && domNode.attribs) {
            const { name, children } = domNode;

            if (name === 'ul') {
                return (
                    <ul className="list-disc ml-5">
                        {domToReact(children as DOMNode[], richTextOptions)}
                    </ul>
                );
            }

            if (name === 'ol') {
                return (
                    <ol className="list-decimal ml-5">
                        {domToReact(children as DOMNode[], richTextOptions)}
                    </ol>
                );
            }

            if (name === 'p') {
                const parentIsLi =
                    domNode.parent &&
                    domNode.parent instanceof Element &&
                    domNode.parent.name === 'li';

                return (
                    <p className={parentIsLi ? '' : 'mb-1'}>
                        {domToReact(children as DOMNode[], richTextOptions)}
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
                        {domToReact(children as DOMNode[], richTextOptions)}
                    </a>
                );
            }
        }
    },
};

const sanitizeHtml = (html: string): string => {
    if (typeof window === 'undefined') return html;
    return createDOMPurify(window).sanitize(html);
};

/** Strip HTML tags to measure plain-text length. */
const getTextLength = (html: string): number => {
    if (typeof window === 'undefined') return html.length;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').length;
};

export interface CommitLogItem {
    _id: string;
    ticket_number: string;
    message: string;
    description?: string;
    sha?: string;
    createdAt?: string;
    created_by?: string;
    created_by_name?: string;
}

interface CommitCardProps {
    log: CommitLogItem;
    index: number;
    page: number;
    itemPerPage: number;
    isOwner: boolean;
    canDelete: boolean;
    onEdit: (edited: UpdateCommitFormType & { _id: string }) => Promise<void>;
    onDelete: (commitId: string) => Promise<void>;
    isLoading: boolean;
}

const CommitCard: React.FC<CommitCardProps> = ({
    log,
    index,
    page,
    itemPerPage,
    isOwner,
    canDelete,
    onEdit,
    onDelete,
    isLoading,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [avatarURI, setAvatarURI] = useState<string | null>(null);

    useEffect(() => {
        generateAvatar(log.created_by_name || log.created_by || '').then(
            setAvatarURI,
        );
    }, [log.created_by_name, log.created_by]);

    const shouldTruncate =
        !!log.description &&
        getTextLength(log.description) >
            DESCRIPTION_CHAR_LIMIT + DESCRIPTION_BUFFER;

    const initials = (log.created_by_name || log.created_by || '?')
        .trim()
        .split(' ')
        .map(w => w[0]?.toUpperCase() ?? '')
        .slice(0, 2)
        .join('');
    const formattedDate = log.createdAt
        ? moment(log.createdAt).format('Do MMM YYYY, hh:mm A')
        : null;

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col h-full">
            {/* Header: avatar + name + date */}
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full border overflow-hidden bg-gray-100 flex items-center justify-center text-sm font-semibold select-none">
                    {avatarURI ? (
                        <Image
                            src={avatarURI}
                            alt={
                                log.created_by_name ||
                                log.created_by ||
                                'avatar'
                            }
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                            priority={false}
                        />
                    ) : (
                        <span className="text-gray-600">{initials}</span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-900 text-base truncate">
                            {log.created_by_name || log.created_by}
                        </span>
                        <span className="text-sm text-gray-400 whitespace-nowrap">
                            #{index + 1 + itemPerPage * (page - 1)}
                        </span>
                    </div>
                    {formattedDate && (
                        <p className="text-sm text-gray-500 mt-0.5">
                            {formattedDate}
                        </p>
                    )}
                </div>
            </div>

            {/* Body: grows to fill card, pushes footer down */}
            <div className="flex-1 flex flex-col">
                {/* Commit message */}
                <p className="mt-2 text-lg font-medium text-gray-800">
                    {log.message}
                </p>

                {/* Rich-text description with truncation */}
                {log.description && (
                    <div className="mt-1.5 text-base text-gray-600 leading-6">
                        <div
                            className={
                                !expanded && shouldTruncate
                                    ? 'overflow-hidden max-h-32 relative'
                                    : ''
                            }
                        >
                            {!expanded && shouldTruncate && (
                                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                            )}
                            {parse(
                                sanitizeHtml(log.description),
                                richTextOptions,
                            )}
                        </div>
                        {shouldTruncate && (
                            <button
                                onClick={() => setExpanded(v => !v)}
                                className="mt-1 text-sm text-blue-600 hover:underline"
                            >
                                {expanded ? 'Show less' : 'Show more'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Footer: ticket link + actions */}
            <hr className="border-gray-200 mt-3" />
            <div className="mt-2 flex items-center justify-between">
                <Link
                    target="_blank"
                    href={`/tickets/${log.ticket_number}`}
                    className="text-base font-medium text-blue-600 hover:underline"
                >
                    #{log.ticket_number}
                </Link>
                <div className="flex gap-2">
                    {isOwner && (
                        <EditButton
                            isLoading={isLoading}
                            commitData={log}
                            submitHandler={onEdit}
                        />
                    )}
                    {canDelete && (
                        <DeleteButton
                            commitId={log._id}
                            submitHandler={onDelete}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommitCard;
