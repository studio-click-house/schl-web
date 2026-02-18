'use client';

import NoticeBodyEditor from '@/components/RichText/RichTextEditor';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    statusOptions,
    typeOptions,
} from '@repo/common/constants/ticket.constant';
import { setMenuPortalTarget } from '@repo/common/utils/select-helpers';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';
import { toast } from 'sonner';
import { TicketFormDataType, validationSchema } from '../../schema';

const Form: React.FC = () => {
    const authedFetchApi = useAuthedFetchApi();
    const [loading, setLoading] = useState(false);
    const [editorResetKey, setEditorResetKey] = useState(0);

    const newStatusOption = useMemo(
        () => statusOptions.find(option => option.value === 'new') || null,
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
            status: 'new',
            tags: '',
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

            const { tags, _id, createdAt, updatedAt, __v, ...rest } =
                parsed.data;

            const payload = {
                ...rest,
                status: 'new',
                tags: tags
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(Boolean),
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
                    status: 'new',
                    tags: '',
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 mb-4 gap-y-4">
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
                    <Select
                        options={statusOptions}
                        closeMenuOnSelect={true}
                        placeholder="Ticket status"
                        classNamePrefix="react-select"
                        menuPortalTarget={setMenuPortalTarget}
                        value={newStatusOption}
                        isDisabled={true}
                    />
                </div>

                <div className="md:col-span-2">
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

                <div className="md:col-span-2">
                    <div className="mb-2">
                        <label className="uppercase tracking-wide text-gray-700 text-sm font-bold flex gap-2">
                            Tags
                            <span className="cursor-pointer has-tooltip">
                                &#9432;
                                <span className="tooltip italic font-medium rounded-md text-xs shadow-lg p-1 px-2 bg-gray-100 ml-2 normal-case">
                                    Add tags separated by comma
                                </span>
                            </span>
                        </label>
                    </div>
                    <input
                        {...register('tags')}
                        autoComplete="off"
                        autoCorrect="off"
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                        type="text"
                        placeholder="e.g. portal, auth, login"
                    />
                </div>
            </div>

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
