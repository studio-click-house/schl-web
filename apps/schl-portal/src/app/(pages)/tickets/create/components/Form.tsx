'use client';

import NoticeBodyEditor from '@/components/RichText/RichTextEditor';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    priorityOptions,
    statusOptions,
    typeOptions,
} from '@repo/common/constants/ticket.constant';
import type { FullyPopulatedUser } from '@repo/common/types/populated-user.type';
import { localDateTimeToISO } from '@repo/common/utils/date-helpers';
import { hasPerm } from '@repo/common/utils/permission-check';
import { setMenuPortalTarget } from '@repo/common/utils/select-helpers';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';
import { toast } from 'sonner';
import { TicketFormDataType, validationSchema } from '../../schema';

const Form: React.FC = () => {
    const authedFetchApi = useAuthedFetchApi();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [editorResetKey, setEditorResetKey] = useState(0);
    const [assigneeOptions, setAssigneeOptions] = useState<
        {
            label: string;
            value: { db_id: string; name: string; e_id: string };
        }[]
    >([]);

    const canReviewTicket = useMemo(
        () => hasPerm('ticket:review_works', session?.user.permissions || []),
        [session?.user.permissions],
    );

    useEffect(() => {
        if (!canReviewTicket) return;
        const loadUsers = async () => {
            try {
                const resp = await authedFetchApi<{
                    pagination?: { count: number; pageCount: number };
                    items: FullyPopulatedUser[];
                }>(
                    {
                        path: '/v1/user/search-users',
                        query: { page: 1, itemsPerPage: 100, paginated: false },
                    },
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ employee_expanded: true }),
                    },
                );
                if (resp.ok && resp.data) {
                    const usersRaw = Array.isArray(resp.data)
                        ? resp.data
                        : resp.data.items || [];
                    const valid = (usersRaw as FullyPopulatedUser[]).filter(u =>
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
                    setAssigneeOptions(options);
                }
            } catch (e) {
                console.error('failed loading assignees', e);
            }
        };
        loadUsers();
    }, [authedFetchApi, canReviewTicket]);

    const newStatusOption = useMemo(
        () => statusOptions.find(option => option.value === 'pending') || null,
        [],
    );

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm<TicketFormDataType>({
        resolver: zodResolver(validationSchema),
        defaultValues: {
            title: '',
            description: '',
            type: 'bug',
            status: 'pending',
            priority: 'low',
            deadline: undefined,
            assignees: [],
        },
    });

    async function createTicket(formData: TicketFormDataType) {
        try {
            setLoading(true);

            const parsed = validationSchema.safeParse(formData);

            if (!parsed.success) {
                console.error(parsed.error.issues.map(issue => issue.message));
                toast.error('Invalid form data');
                return;
            }

            const { _id, createdAt, updatedAt, __v, ...rest } = parsed.data;

            const payload = {
                ...rest,
                deadline: localDateTimeToISO(rest.deadline),
            };

            const response = await authedFetchApi(
                { path: '/v1/ticket/create-ticket' },
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (response.ok) {
                toast.success('Created new ticket successfully');
                reset({
                    title: '',
                    description: '',
                    type: 'bug',
                    status: 'pending',
                    priority: 'low',
                    deadline: undefined,
                    assignees: [],
                });
                setEditorResetKey(prev => prev + 1);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while creating new ticket');
        } finally {
            setLoading(false);
        }
    }

    const onSubmit = async (data: TicketFormDataType) => {
        await createTicket(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-x-3 mb-4 gap-y-4">
                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                        <span className="uppercase">Ticket Type*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.type && errors.type.message}
                        </span>
                    </label>
                    <Controller
                        name="type"
                        control={control}
                        render={({ field }) => (
                            <Select
                                options={typeOptions}
                                closeMenuOnSelect={true}
                                placeholder="Select ticket type"
                                classNamePrefix="react-select"
                                menuPortalTarget={setMenuPortalTarget}
                                value={
                                    typeOptions.find(
                                        option => option.value === field.value,
                                    ) || null
                                }
                                onChange={option =>
                                    field.onChange(option?.value || '')
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
                                options={statusOptions}
                                closeMenuOnSelect={true}
                                placeholder="Ticket status"
                                classNamePrefix="react-select"
                                menuPortalTarget={setMenuPortalTarget}
                                value={
                                    canReviewTicket
                                        ? statusOptions.find(
                                              option =>
                                                  option.value === field.value,
                                          ) || null
                                        : newStatusOption
                                }
                                onChange={option =>
                                    field.onChange(option?.value || '')
                                }
                                isDisabled={!canReviewTicket}
                            />
                        )}
                    />
                </div>

                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                        <span className="uppercase">Priority</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.priority && errors.priority.message}
                        </span>
                    </label>
                    <Controller
                        name="priority"
                        control={control}
                        render={({ field }) => (
                            <Select
                                options={priorityOptions}
                                closeMenuOnSelect={true}
                                placeholder="Ticket priority"
                                classNamePrefix="react-select"
                                menuPortalTarget={setMenuPortalTarget}
                                value={
                                    priorityOptions.find(
                                        option => option.value === field.value,
                                    ) || null
                                }
                                onChange={option =>
                                    field.onChange(option?.value || '')
                                }
                                isDisabled={!canReviewTicket}
                            />
                        )}
                    />
                </div>

                <div className="md:col-span-3">
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                        <span className="uppercase">Ticket Title*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.title && errors.title.message}
                        </span>
                    </label>
                    <input
                        {...register('title')}
                        autoComplete="off"
                        autoCorrect="off"
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                        type="text"
                        placeholder="Title of the ticket"
                    />
                </div>
            </div>
            {canReviewTicket && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-3 mb-4 gap-y-4">
                    <div>
                        <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                            <span className="uppercase">Assignees</span>
                        </label>
                        <Controller
                            name="assignees"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    isMulti
                                    options={assigneeOptions}
                                    closeMenuOnSelect={false}
                                    placeholder="Select assignee(s)"
                                    classNamePrefix="react-select"
                                    menuPortalTarget={setMenuPortalTarget}
                                    value={
                                        assigneeOptions.filter(option =>
                                            field.value?.some(
                                                v =>
                                                    v.db_id ===
                                                    option.value.db_id,
                                            ),
                                        ) || null
                                    }
                                    onChange={selected =>
                                        field.onChange(
                                            selected
                                                ? selected.map(o => o.value)
                                                : [],
                                        )
                                    }
                                />
                            )}
                        />
                    </div>
                    <div>
                        <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                            <span className="uppercase">Deadline</span>
                        </label>
                        <input
                            {...register('deadline')}
                            type="datetime-local"
                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                        />
                    </div>
                </div>
            )}

            <div className="mb-4">
                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                    <span className="uppercase">Ticket Body*</span>
                    <span className="text-red-700 text-wrap block text-xs">
                        {errors.description && errors.description.message}
                    </span>
                </label>

                <Controller
                    name="description"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                        <NoticeBodyEditor
                            key={editorResetKey}
                            onChange={onChange}
                            initialContent={value ?? ''}
                        />
                    )}
                />
            </div>

            <button
                disabled={loading}
                className="rounded-md bg-primary text-white hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-primary-foreground px-10 py-2 mt-6 uppercase"
                type="submit"
            >
                {loading ? 'Creating...' : 'Create this ticket'}
            </button>
        </form>
    );
};

export default Form;
