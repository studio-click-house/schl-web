'use client';

import { CopyMinus, X } from 'lucide-react';
import React, { useState } from 'react';

interface PropsType {
    reportData: { [key: string]: any };
    submitHandler: (reportId: string, clientCode: string) => Promise<void>;
}
const DuplicateButton: React.FC<PropsType> = props => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [clientCode, setClientCode] = useState<string>('');
    const [error, setError] = useState<string>('');

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="rounded-md bg-amber-600 hover:opacity-90 hover:ring-2 hover:ring-amber-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2 items-center"
            >
                <CopyMinus size={18} />
            </button>

            <section
                onClick={() => setIsOpen(false)}
                className={`fixed inset-0 flex justify-center items-center transition-colors ${isOpen ? 'visible bg-black/20 disable-page-scroll pointer-events-auto' : 'invisible pointer-events-none'} `}
            >
                <article
                    onClick={e => e.stopPropagation()}
                    className={`${isOpen ? 'scale-100 opacity-100' : 'scale-125 opacity-0'} bg-white rounded-lg shadow relative`}
                >
                    <header className="flex items-center align-middle justify-between px-4 py-2 border-b rounded-t">
                        <h3 className="text-gray-900 text-lg lg:text-xl font-semibold uppercase">
                            Mark Duplicate
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            type="button"
                            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                        >
                            <X size={18} />
                        </button>
                    </header>
                    <div className="overflow-hidden max-h-[70vh] p-4">
                        <p className="text-base">
                            Are you sure, you want to mark this request as
                            duplicate?
                        </p>

                        <div className="mt-3">
                            <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                                <span className="uppercase">Client Code*</span>
                                {error ? (
                                    <span className="text-red-700 text-wrap block text-xs">
                                        {error}
                                    </span>
                                ) : null}
                            </label>
                            <input
                                value={clientCode}
                                onChange={e => {
                                    setClientCode(e.target.value);
                                    if (error) setError('');
                                }}
                                className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-2 px-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                type="text"
                                placeholder="Enter client code (e.g. 0000_XX)"
                                required
                            />
                        </div>
                    </div>
                    <footer className="flex space-x-2 items-center px-4 py-2 border-t justify-end border-gray-200 rounded-b">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="rounded-md bg-gray-600 text-white  hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                            type="button"
                        >
                            No
                        </button>
                        <button
                            onClick={() => {
                                const normalized = clientCode.trim();
                                if (!normalized) {
                                    setError('Client code is required');
                                    return;
                                }
                                props.submitHandler(
                                    String(props.reportData?._id),
                                    normalized,
                                );
                                setClientCode('');
                                setError('');
                                setIsOpen(false);
                            }}
                            className="rounded-md bg-blue-600 text-white  hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                            type="button"
                        >
                            Yes
                        </button>
                    </footer>
                </article>
            </section>
        </>
    );
};

export default DuplicateButton;
