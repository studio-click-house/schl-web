'use client';

import NoticeBodyEditor from '@/components/RichText/RichTextEditor';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    priorityOptions,
    statusOptions,
    typeOptions,
} from '@repo/common/constants/ticket.constant';
import { Ticket } from '@repo/common/models/ticket.schema';
import type { FullyPopulatedUser } from '@repo/common/types/populated-user.type';
import { localDateTimeToISO } from '@repo/common/utils/date-helpers';
import { hasPerm } from '@repo/common/utils/permission-check';
import { setMenuPortalTarget } from '@repo/common/utils/select-helpers';
import { CheckCircle, CloudUpload, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
        () => hasPerm('ticket:review_tickets', session?.user.permissions || []),
        [session?.user.permissions],
    );

    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                        hasPerm(
                            'ticket:submit_daily_report',
                            u.role.permissions,
                        ),
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
        () =>
            statusOptions.find(option => option.value === 'in-review') || null,
        [],
    );


    const {
        register,
        handleSubmit,
        control,
        setValue,
        reset,
        formState: { errors },
    } = useForm<TicketFormDataType>({
        resolver: zodResolver(validationSchema),
        defaultValues: {
            title: '',
            description: '',
            type: 'complaint',
            status: 'in-review',
            priority: 'low',
            deadline: null,
            file_name: null,
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
                deadline: rest.deadline
                    ? localDateTimeToISO(rest.deadline)
                    : null,
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
                const ticket = response.data as Ticket;


                if (file) {
                    const formData = new FormData();
                    formData.append('file', file, ticket.file_name || file.name);

                    const ftp_response = await authedFetchApi(
                        {
                            path: '/v1/ftp/upload',
                            query: { folderName: 'ticket' },
                        },
                        {
                            method: 'POST',
                            body: formData,
                        },
                    );

                    console.log('FTP upload response', ftp_response);

                    if (!ftp_response.ok) {
                        toastFetchError(ftp_response);
                        return;
                    }

                    toast.success('Attached file saved successfully in ftp');
                }
                reset();
                setFile(null);

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

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const allowedExtensions =
            /\.(xls|xlsx|doc|docx|ppt|pptx|txt|pdf|zip|7z|rar)$/i;
        const selectedFile = e.target.files?.[0];

        if (selectedFile && allowedExtensions.test(selectedFile.name)) {
            setValue('file_name', selectedFile.name);
            setUploading(true);
            // Simulate a brief upload delay for UX
            setTimeout(() => {
                setFile(selectedFile);
                setUploading(false);
            }, 1000);
        } else {
            toast.error('Invalid file format');
            setFile(null);
        }
    };

    // Drag and Drop Handlers
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        const allowedExtensions =
            /\.(xls|xlsx|doc|docx|ppt|pptx|txt|pdf|zip|7z|rar)$/i;
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles && droppedFiles.length > 0) {
            const selectedFile = droppedFiles[0];
            if (selectedFile && allowedExtensions.test(selectedFile.name)) {
                setValue('file_name', selectedFile.name);
                setUploading(true);
                // Simulate a brief upload delay for UX
                setTimeout(() => {
                    setFile(selectedFile);
                    setUploading(false);
                }, 1000);
            } else {
                toast.error('Invalid file format');
                setFile(null);
            }
            e.dataTransfer.clearData();
        }
    };

    const clearFile = () => {
        setFile(null);
        setValue('file_name', '');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
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
                                    statusOptions.find(
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
            <div>
                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                    <span className="uppercase">Attach file</span>
                </label>

                <div className="flex items-center justify-center w-full">
                    <label
                        htmlFor="dropzone-file"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {uploading ? (
                                <Loader2
                                    size={32}
                                    className="animate-spin text-blue-500 mb-4"
                                />
                            ) : file ? (
                                <CheckCircle
                                    size={32}
                                    className="text-green-500 mb-4"
                                />
                            ) : (
                                <CloudUpload
                                    size={32}
                                    className="w-10 h-10 mb-4 text-gray-500"
                                />
                            )}
                            <p className="mb-2 text-sm text-gray-500">
                                {uploading ? (
                                    'Uploading...'
                                ) : file ? (
                                    <span className="animate-fade-in">
                                        {file.name}
                                    </span>
                                ) : (
                                    <span className="font-semibold">
                                        Click to upload or drag and drop
                                    </span>
                                )}
                            </p>
                            <p className="text-xs text-gray-500">
                                ( XLS, XLSX, DOC, DOCX, PPT, PPTX, TXT, PDF,
                                ZIP, 7Z, RAR )
                            </p>
                        </div>
                        <input
                            ref={fileInputRef}
                            id="dropzone-file"
                            type="file"
                            className="hidden"
                            accept=".xls,.xlsx,.doc,.docx,.ppt,.pptx,.txt,.pdf,.zip,.7z,.rar"
                            onChange={handleFileInput}
                        />
                    </label>
                </div>
                {file && !uploading && (
                    <button
                        type="button"
                        onClick={clearFile}
                        className="mt-2 text-sm text-red-600 hover:text-red-800"
                    >
                        Clear file
                    </button>
                )}
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
