'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';

interface PropsType {
  leadData: { [key: string]: any };
  submitHandler: (
    originalLeadData: { [key: string]: any },
    leadId: string,
    reqBy: string,
  ) => Promise<void>;
}
const WithdrawLeadButton: React.FC<PropsType> = (props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { data: session } = useSession();

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
        }}
        className="items-center gap-2 rounded-md bg-green-600 hover:opacity-90 hover:ring-2 hover:ring-green-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          viewBox="0 0 16 16"
        >
          <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z" />
          <path d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z" />
        </svg>
      </button>

      <section
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 flex justify-center items-center transition-colors ${isOpen ? 'visible bg-black/20 disable-page-scroll' : 'invisible'} `}
      >
        <article
          onClick={(e) => e.stopPropagation()}
          className={`${isOpen ? 'scale-100 opacity-100' : 'scale-125 opacity-0'} bg-white rounded-lg shadow relative`}
        >
          <header className="flex items-center align-middle justify-between px-4 py-2 border-b rounded-t">
            <h3 className="text-gray-900 text-lg lg:text-xl font-semibold dark:text-white uppercase">
              Withdraw Lead
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
              Are you sure, you want to withdraw this lead?
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
                  props.leadData,
                  props.leadData?._id,
                  session?.user.provided_name || '',
                );
                setIsOpen(false);
              }}
              className="rounded-md bg-green-600 text-white  hover:opacity-90 hover:ring-2 hover:ring-green-600 transition duration-200 delay-300 hover:text-opacity-100 px-8 py-2 uppercase"
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

export default WithdrawLeadButton;
