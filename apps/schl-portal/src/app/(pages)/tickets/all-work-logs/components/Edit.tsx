'use client';

import NoticeBodyEditor from '@/components/RichText/RichTextEditor';
import { zodResolver } from '@hookform/resolvers/zod';
import { SquarePen, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { UpdateCommitFormType, updateSchema } from '../schema';

interface PropsType {
    isLoading: boolean;
    commitData: {
        _id: string;
        message: string;
        description?: string;
    };
    submitHandler: (
        edited: UpdateCommitFormType & { _id: string },
    ) => Promise<void>;
}

const EditButton: React.FC<PropsType> = props => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const popupRef = useRef<HTMLElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm<UpdateCommitFormType>({
        resolver: zodResolver(updateSchema),
        defaultValues: {
            message: props.commitData.message,
            description: props.commitData.description || '',
        },
    });

    const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
        if (
            popupRef.current &&
            !popupRef.current.contains(e.target as Node) &&
            !popupRef.current.querySelector('input:focus, textarea:focus') &&
            !popupRef.current.querySelector('button:focus')
        ) {
            setIsOpen(false);
        }
    };

    const onSubmit = async (data: UpdateCommitFormType) => {
        await props.submitHandler({ _id: props.commitData._id, ...data });
    };

    return (
        <>
            <button
                onClick={() => {
                    reset({
                        message: props.commitData.message,
                        description: props.commitData.description || '',
                    });
                    setIsOpen(true);
                }}
                className="rounded-md bg-blue-600 hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2 items-center"
            >
                <SquarePen size={18} />
            </button>

            <section
                onClick={handleClickOutside}
                className={`fixed z-${50} inset-0 flex justify-center items-center transition-colors ${
                    isOpen
                        ? 'visible bg-black/20 disable-page-scroll pointer-events-auto'
                        : 'invisible pointer-events-none'
                } `}
            >
                <article
                    ref={popupRef}
                    onClick={e => e.stopPropagation()}
                    className={`${
                        isOpen ? 'scale-100 opacity-100' : 'scale-125 opacity-0'
                    } bg-white rounded-sm shadow relative md:w-[60vw] lg:w-[40vw]  text-wrap`}
                >
                    <header className="flex items-center align-middle justify-between px-4 py-2 border-b rounded-t">
                        <h3 className="text-gray-900 text-base lg:text-lg font-semibold uppercase">
                            Edit Work Log
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            type="button"
                            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center "
                        >
                            <X size={18} />
                        </button>
                    </header>

                    <form
                        ref={formRef}
                        className="overflow-x-hidden overflow-y-scroll max-h-[70vh] p-4 text-start"
                        onSubmit={handleSubmit(onSubmit)}
                    >
                        <div className="mb-4">
                            <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                                <span className="uppercase">
                                    Commit Message*
                                </span>
                                <span className="text-red-700 text-wrap block text-xs">
                                    {errors.message && errors.message.message}
                                </span>
                            </label>
                            <input
                                {...register('message')}
                                className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                type="text"
                                placeholder="Short commit message"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                                <span className="uppercase">Description</span>
                            </label>
                            <Controller
                                name="description"
                                control={control}
                                render={({ field: { onChange, value } }) => (
                                    <NoticeBodyEditor
                                        onChange={onChange}
                                        initialContent={value ?? ''}
                                    />
                                )}
                            />
                        </div>
                    </form>

                    <footer className="flex items-center px-4 py-2 border-t justify-end gap-6 border-gray-200 rounded-b">
                        <div className="space-x-2 justify-end">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-md bg-gray-600 text-white hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                                type="button"
                                disabled={props.isLoading}
                            >
                                Close
                            </button>
                            <button
                                disabled={props.isLoading}
                                onClick={() => {
                                    formRef.current?.requestSubmit();
                                }}
                                className="rounded-md bg-blue-600 text-white  hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                                type="button"
                            >
                                {props.isLoading ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </footer>
                </article>
            </section>
        </>
    );
};

export default EditButton;
