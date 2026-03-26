'use client';

import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

interface PropsType {
    planId: string;
    onSuccess: () => void;
}

const baseZIndex = 50;

const DeleteButton: React.FC<PropsType> = ({ planId, onSuccess }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const authedFetchApi = useAuthedFetchApi();

    const handleDelete = async () => {
        try {
            setIsLoading(true);
            const response = await authedFetchApi(
                { path: `/v1/shift-plan/${planId}` },
                { method: 'DELETE' },
            );

            if (response.ok) {
                toast.success('Shift plan deleted successfully');
                setIsOpen(false);
                onSuccess();
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while deleting shift plan');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="rounded-md bg-red-600 hover:opacity-90 hover:ring-2 hover:ring-red-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2 flex items-center justify-center"
                title="Delete Plan"
            >
                <Trash2 size={18} />
            </button>

            <section
                onClick={() => setIsOpen(false)}
                className={`fixed z-${baseZIndex} inset-0 flex justify-center items-center transition-colors ${isOpen ? 'visible bg-black/20 disable-page-scroll pointer-events-auto' : 'invisible pointer-events-none'} `}
            >
                <article
                    onClick={e => e.stopPropagation()}
                    className={`${isOpen ? 'scale-100 opacity-100' : 'scale-125 opacity-0'} bg-white rounded-lg shadow relative md:w-[350px] w-[90%]`}
                >
                    <header className="flex items-center align-middle justify-between px-4 py-2 border-b rounded-t text-start">
                        <h3 className="text-gray-900 text-lg lg:text-xl font-semibold uppercase">
                            Delete Shift Plan
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            disabled={isLoading}
                            type="button"
                            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                        >
                            <X size={18} />
                        </button>
                    </header>
                    <div className="overflow-hidden max-h-[70vh] p-4 text-start">
                        <p className="text-base text-gray-700">
                            Are you sure you want to delete this shift plan?
                            This action cannot be undone.
                        </p>
                    </div>
                    <footer className="flex space-x-2 items-center px-4 py-2 border-t justify-end border-gray-200 rounded-b">
                        <button
                            onClick={() => setIsOpen(false)}
                            disabled={isLoading}
                            className="rounded-md bg-gray-600 text-white hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                            type="button"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isLoading}
                            className="rounded-md bg-red-600 text-white hover:opacity-90 hover:ring-2 hover:ring-red-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1 font-medium"
                            type="button"
                        >
                            {isLoading ? 'Deleting...' : 'Delete'}
                        </button>
                    </footer>
                </article>
            </section>
        </>
    );
};

export default DeleteButton;
