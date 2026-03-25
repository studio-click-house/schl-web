'use client';

import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { AlertCircle, Ban, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

const baseZIndex = 50;

interface BulkDeactivateProps {
    selectedIds: Set<string>;
    onSuccess: () => void;
    onClearSelection: () => void;
    canEdit: boolean;
}

const BulkDeactivate = ({
    selectedIds,
    onSuccess,
    onClearSelection,
    canEdit,
}: BulkDeactivateProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [comment, setComment] = useState('');
    const authedFetchApi = useAuthedFetchApi();
    const popupRef = useRef<HTMLElement>(null);

    const selectedCount = selectedIds.size;

    const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
        if (
            popupRef.current &&
            !popupRef.current.contains(e.target as Node) &&
            !popupRef.current.querySelector(
                'input:focus, textarea:focus, select:focus',
            )
        ) {
            setIsOpen(false);
        }
    };

    const handleConfirm = async () => {
        try {
            setIsLoading(true);
            const response = await authedFetchApi<any>(
                { path: '/v1/shift-adjustment/bulk-deactivate' },
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ids: Array.from(selectedIds),
                        ...(comment.trim() ? { comment: comment.trim() } : {}),
                    }),
                },
            );

            if (response.ok) {
                toast.success(
                    `Deactivated ${response.data?.deactivated ?? selectedCount} adjustment(s)`,
                );
                setIsOpen(false);
                setComment('');
                onSuccess();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while deactivating adjustments');
        } finally {
            setIsLoading(false);
        }
    };

    if (selectedCount === 0 || !canEdit) return null;

    return (
        <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-sm font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-2 rounded-md flex items-center shadow-sm">
                {selectedCount}{' '}
                {selectedCount === 1 ? 'Adjustment' : 'Adjustments'} Selected
            </span>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                title="Deactivate Selected"
                className="flex items-center gap-2 rounded-md bg-red-600 hover:opacity-90 hover:ring-4 hover:ring-red-600 transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
            >
                <Ban size={19} />
            </button>
            <button
                type="button"
                onClick={onClearSelection}
                title="Clear Selection"
                className="flex items-center gap-2 rounded-md bg-gray-500 hover:opacity-90 hover:ring-4 hover:ring-gray-500 transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2"
            >
                <X size={19} />
            </button>

            <section
                onClick={handleClickOutside}
                className={`fixed z-${baseZIndex} inset-0 flex justify-center items-center transition-colors ${isOpen ? 'visible bg-black/20 disable-page-scroll pointer-events-auto' : 'invisible pointer-events-none'}`}
            >
                <article
                    ref={popupRef}
                    onClick={e => e.stopPropagation()}
                    className={`${isOpen ? 'scale-100 opacity-100' : 'scale-125 opacity-0'} bg-white rounded-lg shadow relative lg:w-[35vw] md:w-[70vw] sm:w-[80vw]`}
                >
                    <header className="flex items-center align-middle justify-between px-4 py-2 border-b rounded-t">
                        <h3 className="text-gray-900 text-lg lg:text-xl font-semibold uppercase">
                            Deactivate Shift Adjustments
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            type="button"
                            disabled={isLoading}
                            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                        >
                            <X size={18} />
                        </button>
                    </header>

                    <div className="p-4 text-start">
                        <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-4 flex items-start gap-3">
                            <AlertCircle
                                className="text-red-500 mt-0.5 flex-shrink-0"
                                size={20}
                            />
                            <div>
                                <p className="text-red-800 text-sm font-semibold mb-1">
                                    Warning: Deactivating {selectedCount}{' '}
                                    Adjustment
                                    {selectedCount !== 1 ? 's' : ''}
                                </p>
                                <p className="text-red-700 text-sm">
                                    This will disable these adjustments. This
                                    action cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                <span className="uppercase">
                                    Reason / Comment
                                </span>
                            </label>
                            <textarea
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="e.g., Mistakenly created for wrong date"
                                rows={3}
                                disabled={isLoading}
                                className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <footer className="flex space-x-2 items-center px-4 py-2 border-t justify-end border-gray-200 rounded-b">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            disabled={isLoading}
                            className="rounded-md bg-gray-600 text-white hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isLoading}
                            className="rounded-md bg-destructive text-destructive-foreground hover:opacity-90 hover:ring-2 hover:ring-destructive transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Deactivating...' : 'Deactivate'}
                        </button>
                    </footer>
                </article>
            </section>
        </div>
    );
};

export default BulkDeactivate;
