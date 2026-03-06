'use client';

import { ReportDocument } from '@repo/common/models/report.schema';
import { ListX } from 'lucide-react';
import { useSession } from 'next-auth/react';
import React, { useState } from 'react';

interface PropsType {
    clientData: ReportDocument;
    submitHandler: (
        originalClientData: ReportDocument,
        clientId: string,
        reqBy: string,
    ) => Promise<void>;
}
const RemoveClientButton: React.FC<PropsType> = props => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { data: session } = useSession();

    return (
        <>
            <button
                onClick={() => {
                    setIsOpen(true);
                }}
                className="items-center gap-2 rounded-md bg-gray-600 hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2"
            >
                <ListX size={20} />
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
                        <h3 className="text-gray-900 text-lg lg:text-xl font-semibold dark:text-white uppercase">
                            Remove Client
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            type="button"
                            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
                            data-modal-toggle="default-modal"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                ></path>
                            </svg>
                        </button>
                    </header>
                    <div className="overflow-hidden max-h-[70vh] p-4">
                        <p className="text-lg">
                            Are you sure, you want to remove the report from
                            clients list?
                            <br />
                            <span className="text-red-500 text-sm">
                                (This will not delete the client from the admin
                                panel)
                            </span>
                        </p>
                    </div>
                    <footer className="flex space-x-2 items-center px-4 py-2 border-t justify-end border-gray-200 rounded-b">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="rounded-md bg-gray-600 text-white  hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-8 py-2 uppercase"
                            type="button"
                        >
                            No
                        </button>
                        <button
                            onClick={() => {
                                props.submitHandler(
                                    props.clientData,
                                    props.clientData._id.toString(),
                                    session?.user.provided_name || '',
                                );
                                setIsOpen(false);
                            }}
                            className="rounded-md bg-red-600 text-white  hover:opacity-90 hover:ring-2 hover:ring-red-600 transition duration-200 delay-300 hover:text-opacity-100 px-8 py-2 uppercase"
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

export default RemoveClientButton;
