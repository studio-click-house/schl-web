'use client';

import NoticeBodyEditor from '@/components/RichText/RichTextEditor';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    priorityOptions,
    statusOptions,
    typeOptions,
} from '@repo/common/constants/ticket.constant';
import {
    FullyPopulatedUser,
    PopulatedByEmployeeUser,
} from '@repo/common/types/populated-user.type';
import { isoToLocalDateTime } from '@repo/common/utils/date-helpers';
import { hasPerm } from '@repo/common/utils/permission-check';
import {
    setCalculatedZIndex,
    setClassNameAndIsDisabled,
    setMenuPortalTarget,
} from '@repo/common/utils/select-helpers';
import { SquarePen, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';
import { TicketFormDataType, validationSchema } from '../../schema';

interface PropsType {
    isLoading: boolean;
    canReviewTicket: boolean;
    ticketData: TicketFormDataType;
    submitHandler: (editedTicketData: TicketFormDataType) => Promise<void>;
}

const baseZIndex = 50;

const EditButton: React.FC<PropsType> = props => {
    const authedFetchApi = useAuthedFetchApi();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const popupRef = useRef<HTMLElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const [assigneeOptions, setAssigneeOptions] = useState<
        {
            label: string;
            value: { db_id: string; name: string; e_id: string };
        }[]
    >([]);

    useEffect(() => {
        if (!props.canReviewTicket) {
            if (props.ticketData.assignees) {
                setAssigneeOptions(
                    props.ticketData.assignees.map(a => ({
                        label: `${a.name} (${a.e_id})`,
                        value: a,
                    })),
                );
            }
            return;
        }
        const loadUsers = async () => {
            try {
                const resp = await authedFetchApi<FullyPopulatedUser[]>(
                    {
                        path: '/v1/user/search-users',
                        query: { page: 1, itemsPerPage: 100, paginated: false },
                    },
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            employee_expanded: true,
                            role_expanded: true,
                        }),
                    },
                );
                if (resp.ok && resp.data) {
                    const usersRaw = resp.data;
                    const valid = usersRaw.filter(u =>
                        hasPerm('ticket:submit_daily_work', u.role.permissions),
                    );
                    const options = valid.map(u => ({
                        label: `${u.employee.real_name} (${u.employee.e_id})`,
                        value: {
                            db_id: String(u._id),
                            name: u.employee.real_name,
                            e_id: u.employee.e_id,
                        },
                    }));

                    if (props.ticketData.assignees) {
                        props.ticketData.assignees.forEach(a => {
                            const candidateId = String(a.db_id);
                            if (
                                !options.find(
                                    o => o.value.db_id === candidateId,
                                )
                            ) {
                                options.push({
                                    label: `${a.name} (${a.e_id})`,
                                    value: a,
                                });
                            }
                        });
                    }

                    setAssigneeOptions(options);
                }
            } catch (e) {
                console.error('failed loading assignees', e);
            }
        };
        if (isOpen) loadUsers();
    }, [
        props.canReviewTicket,
        isOpen,
        authedFetchApi,
        props.ticketData.assignees,
    ]);

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm<TicketFormDataType>({
        resolver: zodResolver(validationSchema),
        defaultValues: { ...props.ticketData },
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

    const onSubmit = async (data: TicketFormDataType) => {
        await props.submitHandler({ ...data, _id: props.ticketData._id });
    };

    useEffect(() => {
        if (isOpen) {
            const formatted = {
                ...props.ticketData,
                deadline: isoToLocalDateTime(props.ticketData.deadline),
            };
            reset(formatted);
        }
    }, [isOpen, props.ticketData, reset]);

    return (
        <>
            <button
                onClick={() => {
                    const formatted = {
                        ...props.ticketData,
                        deadline: isoToLocalDateTime(props.ticketData.deadline),
                    };
                    reset(formatted);
                    setIsOpen(true);
                }}
                className="rounded-md bg-blue-600 hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 text-white p-2 items-center"
            >
                <SquarePen size={18} />
            </button>

            <section
                onClick={handleClickOutside}
                className={`fixed z-${baseZIndex} inset-0 flex justify-center items-center transition-colors ${isOpen ? 'visible bg-black/20 disable-page-scroll pointer-events-auto' : 'invisible pointer-events-none'} `}
            >
                <article
                    ref={popupRef}
                    onClick={e => e.stopPropagation()}
                    className={`${isOpen ? 'scale-100 opacity-100' : 'scale-125 opacity-0'} bg-white rounded-sm shadow relative md:w-[60vw] lg:w-[40vw]  text-wrap`}
                >
                    <header className="flex items-center align-middle justify-between px-4 py-2 border-b rounded-t">
                        <h3 className="text-gray-900 text-base lg:text-lg font-semibold uppercase">
                            Edit Ticket
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
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-x-3 mb-4 gap-y-4">
                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                                    <span className="uppercase">
                                        Ticket Type*
                                    </span>
                                    <span className="text-red-700 text-wrap block text-xs">
                                        {errors.type && errors.type.message}
                                    </span>
                                </label>
                                <Controller
                                    name="type"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            {...setClassNameAndIsDisabled(
                                                isOpen,
                                            )}
                                            options={typeOptions}
                                            closeMenuOnSelect
                                            placeholder="Select ticket type"
                                            classNamePrefix="react-select"
                                            menuPortalTarget={
                                                setMenuPortalTarget
                                            }
                                            styles={setCalculatedZIndex(
                                                baseZIndex,
                                            )}
                                            value={
                                                typeOptions.find(
                                                    option =>
                                                        option.value ===
                                                        field.value,
                                                ) || null
                                            }
                                            onChange={option =>
                                                field.onChange(
                                                    option?.value || '',
                                                )
                                            }
                                        />
                                    )}
                                />
                            </div>

                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                                    <span className="uppercase">Status</span>
                                </label>
                                <Controller
                                    name="status"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            {...setClassNameAndIsDisabled(
                                                isOpen,
                                                !props.canReviewTicket,
                                            )}
                                            options={statusOptions}
                                            closeMenuOnSelect
                                            placeholder="Ticket status"
                                            classNamePrefix="react-select"
                                            menuPortalTarget={
                                                setMenuPortalTarget
                                            }
                                            styles={setCalculatedZIndex(
                                                baseZIndex + 1,
                                            )}
                                            value={
                                                statusOptions.find(
                                                    option =>
                                                        option.value ===
                                                        field.value,
                                                ) || null
                                            }
                                            onChange={option =>
                                                field.onChange(
                                                    option?.value || '',
                                                )
                                            }
                                            isDisabled={!props.canReviewTicket}
                                        />
                                    )}
                                />
                            </div>

                            <div>
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                                    <span className="uppercase">Priority</span>
                                    <span className="text-red-700 text-wrap block text-xs">
                                        {errors.priority &&
                                            errors.priority.message}
                                    </span>
                                </label>
                                <Controller
                                    name="priority"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            {...setClassNameAndIsDisabled(
                                                isOpen,
                                                !props.canReviewTicket,
                                            )}
                                            options={priorityOptions}
                                            closeMenuOnSelect
                                            placeholder="Ticket priority"
                                            classNamePrefix="react-select"
                                            menuPortalTarget={
                                                setMenuPortalTarget
                                            }
                                            styles={setCalculatedZIndex(
                                                baseZIndex + 1,
                                            )}
                                            value={
                                                priorityOptions.find(
                                                    option =>
                                                        option.value ===
                                                        field.value,
                                                ) || null
                                            }
                                            onChange={option =>
                                                field.onChange(
                                                    option?.value || '',
                                                )
                                            }
                                            isDisabled={!props.canReviewTicket}
                                        />
                                    )}
                                />
                            </div>

                            <div className="md:col-span-3">
                                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                                    <span className="uppercase">
                                        Ticket Title*
                                    </span>
                                    <span className="text-red-700 text-wrap block text-xs">
                                        {errors.title && errors.title.message}
                                    </span>
                                </label>
                                <input
                                    {...register('title')}
                                    className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    type="text"
                                    placeholder="Title of the ticket"
                                />
                            </div>
                        </div>

                        {props.canReviewTicket && (
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-3 mb-4 gap-y-4">
                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                                        <span className="uppercase">
                                            Assignees
                                        </span>
                                    </label>
                                    <Controller
                                        name="assignees"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                {...setClassNameAndIsDisabled(
                                                    isOpen,
                                                    !props.canReviewTicket,
                                                )}
                                                isMulti
                                                options={assigneeOptions}
                                                closeMenuOnSelect={false}
                                                placeholder="Select assignee(s)"
                                                classNamePrefix="react-select"
                                                menuPortalTarget={
                                                    setMenuPortalTarget
                                                }
                                                styles={setCalculatedZIndex(
                                                    baseZIndex + 1,
                                                )}
                                                value={(field.value || []).map(
                                                    v => ({
                                                        label: `${v.name} (${v.e_id})`,
                                                        value: v,
                                                    }),
                                                )}
                                                onChange={selected =>
                                                    field.onChange(
                                                        selected
                                                            ? selected.map(
                                                                  o => o.value,
                                                              )
                                                            : [],
                                                    )
                                                }
                                            />
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                                        <span className="uppercase">
                                            Deadline
                                        </span>
                                    </label>
                                    <input
                                        {...register('deadline')}
                                        type="datetime-local"
                                        disabled={!props.canReviewTicket}
                                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                                <span className="uppercase">Ticket Body*</span>
                                <span className="text-red-700 text-wrap block text-xs">
                                    {errors.description &&
                                        errors.description.message}
                                </span>
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
