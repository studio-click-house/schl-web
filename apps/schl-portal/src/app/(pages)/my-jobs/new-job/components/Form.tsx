'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import {
    jobSelectionOptions,
    priorityOptions,
    statusOptions,
    taskOptions,
    typeOptions,
} from '@repo/common/constants/order.constant';
import { removeDuplicates } from '@repo/common/utils/general-utils';

import { zodResolver } from '@hookform/resolvers/zod';
import JobSelectionOptions, {
    jobShiftOptions,
} from '@repo/common/constants/order.constant';
import { ClientDocument } from '@repo/common/models/client.schema';
import { OrderDocument } from '@repo/common/models/order.schema';
import { setMenuPortalTarget } from '@repo/common/utils/select-helpers';
import moment from 'moment-timezone';
import { useSession } from 'next-auth/react';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Select from 'react-select';
import { toast } from 'sonner';
import { NewJobDataType, validationSchema } from '../schema';

interface PropsType {
    clientsData: ClientDocument[];
}

const Form: React.FC<PropsType> = props => {
    const authedFetchApi = useAuthedFetchApi();
    const [loading, setLoading] = useState(false);
    const { data: session } = useSession();

    const [fetchLoading, setFetchLoading] = useState(false);
    const [folders, setFolders] = useState<
        {
            name: string;
            path: string;
        }[]
    >([]);
    const [fileNames, setFileNames] = useState<string[]>([]);

    const clientCodes = props.clientsData?.map(client => client.client_code);

    const clientCodeOptions = (clientCodes || []).map(clientCode => ({
        value: clientCode,
        label: clientCode,
    }));

    const folderOptions = folders.map(folder => ({
        value: folder.path,
        label: folder.name || folder.path,
    }));

    const fileNameOptions = fileNames.map(fileName => ({
        value: fileName,
        label: fileName,
    }));

    const {
        watch,
        register,
        handleSubmit,
        control,
        setValue,
        reset,
        formState: { errors },
    } = useForm<NewJobDataType>({
        resolver: zodResolver(validationSchema),
        defaultValues: {
            client_code: '',
            folder_path: '',
            file_names: [],
            is_active: true,
            job_type: 'general',
            shift: 'morning',
        },
    });

    // async function createOrder(orderData: OrderDataType) {
    //     try {
    //         setLoading(true);
    //         const parsed = validationSchema.safeParse(orderData);

    //         if (!parsed.success) {
    //             console.error(parsed.error.issues.map(issue => issue.message));
    //             toast.error('Invalid form data');
    //             return;
    //         }

    //         const response = await authedFetchApi(
    //             { path: '/v1/order/create' },
    //             {
    //                 method: 'POST',
    //                 headers: {
    //                     'Content-Type': 'application/json',
    //                 },
    //                 body: JSON.stringify(parsed.data),
    //             },
    //         );

    //         if (response.ok) {
    //             toast.success('Created new order successfully');
    //             reset();
    //             // reset the form after successful submission
    //         } else {
    //             toastFetchError(response);
    //         }

    //         console.log('data', parsed.data, orderData);
    //     } catch (error) {
    //         console.error(error);
    //         toast.error('An error occurred while creating new order');
    //     } finally {
    //         setLoading(false);
    //     }
    // }

    const onSubmit = async (data: NewJobDataType) => {
        // await createOrder(data);
        toast.info('Form submission is disabled currently');
        return;
    };

    const customStyles = {
        control: (provided: any) => ({
            ...provided,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            borderRight: 'none',
            width: '200px',
            paddingTop: '0.25rem' /* 12px */,
            paddingBottom: '0.25rem' /* 12px */,
            cursor: 'pointer',
            backgroundColor: '#f3f4f6',
            '&:hover': {
                borderColor: '#e5e7eb',
            },
        }),
        menu: (provided: any) => ({
            ...provided,
            width: '200px',
        }),
    };

    const getAvailableFoldersOfClient = useCallback(async () => {
        try {
            const response = await authedFetchApi<any[]>(
                {
                    path: '/v1/order/available-folders',
                    query: {
                        clientCode: watch('client_code'),
                        jobType: watch('job_type'),
                    },
                },
                {
                    method: 'GET',
                    headers: {
                        Accept: '*/*',
                        'Content-Type': 'application/json',
                    },
                    cache: 'no-store',
                },
            );
            if (response.ok) {
                const data = response.data as Array<{
                    folder_path: string;
                    folder_name?: string;
                    display_path?: string;
                    folder_key?: string;
                }>;
                const items = (data || [])
                    .filter(f => f && f.folder_path)
                    .map(f => ({
                        name: f.folder_name || f.display_path || f.folder_path,
                        path: f.folder_path,
                        key: f.folder_key,
                    }));
                const foldersUnique = removeDuplicates(items, f => f.path);
                setFolders(
                    foldersUnique.map(x => ({ name: x.name, path: x.path })),
                );
            } else {
                console.error('Unable to fetch orders of the client');
            }
        } catch (e) {
            console.error(e);
            console.log(
                'An error occurred while fetching orders of the client',
            );
        }
    }, [authedFetchApi, watch]);
    // Build unique folder objects: { name, path }
    // Guard against null values
    const getFilesForFolder = useCallback(async () => {
        try {
            setFetchLoading(true);
            const folderPath = watch('folder_path');
            if (!folderPath) return setFileNames([]);
            const resp = await authedFetchApi<string[]>(
                {
                    path: '/v1/order/available-files',
                    query: {
                        folderPath,
                        jobType: watch('job_type'),
                    },
                },
                {
                    method: 'GET',
                    headers: {
                        Accept: '*/*',
                        'Content-Type': 'application/json',
                    },
                    cache: 'no-store',
                },
            );
            if (resp.ok) setFileNames(resp.data || []);
            else setFileNames([]);
        } catch (e) {
            console.error(e);
            setFileNames([]);
        } finally {
            setFetchLoading(false);
        }
    }, [authedFetchApi, watch]);

    useEffect(() => {
        if (watch('client_code') && watch('job_type')) {
            getAvailableFoldersOfClient();
        }
        if (watch('folder_path') && watch('job_type')) {
            getFilesForFolder();
        }
    }, [
        getAvailableFoldersOfClient,
        getFilesForFolder,
        watch('client_code'),
        watch('job_type'),
        watch('folder_path'),
    ]);

    useEffect(() => {
        setFileNames([]);
        setValue('file_names', []);
        setValue('folder_path', '');
    }, [watch('client_code'), watch('job_type')]);

    // Reset file names when folder changes to avoid stale selections
    useEffect(() => {
        setFileNames([]);
        setValue('file_names', []);
    }, [watch('folder_path'), watch('job_type')]);

    // console.log('Fetched available orders of the client', folders);

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 mb-4 gap-y-4">
                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                        <span className="uppercase">Shift*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.shift && errors.shift?.message}
                        </span>
                    </label>

                    <Controller
                        name="shift"
                        control={control}
                        render={({ field }) => (
                            <Select
                                options={jobShiftOptions}
                                closeMenuOnSelect={true}
                                placeholder="Select shift"
                                classNamePrefix="react-select"
                                menuPortalTarget={setMenuPortalTarget}
                                value={
                                    jobShiftOptions.find(
                                        option => option.value === field.value,
                                    ) || null
                                }
                                onChange={option =>
                                    field.onChange(option ? option.value : '')
                                }
                            />
                        )}
                    />
                </div>

                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                        <span className="uppercase">Client Code*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.client_code && errors.client_code.message}
                        </span>
                    </label>
                    <div className="flex">
                        <Select
                            options={clientCodeOptions}
                            value={
                                clientCodeOptions.find(
                                    (code?: { value: string; label: string }) =>
                                        code?.value === watch('client_code'),
                                ) || null
                            }
                            styles={customStyles}
                            onChange={(
                                selectedOption: {
                                    value: string;
                                    label: string;
                                } | null,
                            ) => {
                                setValue(
                                    'client_code',
                                    selectedOption ? selectedOption.value : '',
                                );
                            }}
                            placeholder="Select an option"
                            isSearchable={true}
                            classNamePrefix="react-select"
                            isClearable={true}
                        />
                        <input
                            {...register('client_code')}
                            className="appearance-none rounded-s-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                            type="text"
                        />
                    </div>
                </div>

                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                        <span className="uppercase">Job Type*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.job_type && errors.job_type?.message}
                        </span>
                    </label>

                    <Controller
                        name="job_type"
                        control={control}
                        render={({ field }) => (
                            <Select
                                options={jobSelectionOptions}
                                closeMenuOnSelect={true}
                                placeholder="Select job type"
                                classNamePrefix="react-select"
                                menuPortalTarget={setMenuPortalTarget}
                                value={
                                    jobSelectionOptions.find(
                                        option => option.value === field.value,
                                    ) || null
                                }
                                onChange={option =>
                                    field.onChange(option ? option.value : '')
                                }
                            />
                        )}
                    />
                </div>

                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                        <span className="uppercase">Folder*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.folder_path && errors.folder_path?.message}
                        </span>
                    </label>

                    <Controller
                        name="folder_path"
                        control={control}
                        render={({ field }) => (
                            <Select
                                options={folderOptions}
                                closeMenuOnSelect={true}
                                placeholder="Select folder"
                                classNamePrefix="react-select"
                                menuPortalTarget={setMenuPortalTarget}
                                value={
                                    folderOptions.find(
                                        option => option.value === field.value,
                                    ) || null
                                }
                                onChange={option =>
                                    field.onChange(option ? option.value : '')
                                }
                            />
                        )}
                    />
                </div>

                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                        <span className="uppercase">File(s)*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.file_names && errors.file_names?.message}
                        </span>
                    </label>

                    <Controller
                        name="file_names"
                        control={control}
                        render={({ field }) => (
                            <Select
                                {...field}
                                isSearchable={true}
                                isMulti={true}
                                options={fileNameOptions}
                                closeMenuOnSelect={false}
                                placeholder="Select file(s)"
                                classNamePrefix="react-select"
                                menuPortalTarget={setMenuPortalTarget}
                                menuPlacement="auto"
                                menuPosition="fixed" // Prevent clipping by parent containers
                                value={
                                    fileNameOptions.filter(option =>
                                        field.value?.includes(option.value),
                                    ) || null
                                }
                                onChange={selectedOptions =>
                                    field.onChange(
                                        selectedOptions?.map(
                                            option => option.value,
                                        ) || '',
                                    )
                                }
                            />
                        )}
                    />
                </div>
            </div>
            <div>
                <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2">
                    <span className="uppercase">Start*</span>
                </label>
                <Controller
                    name="is_active"
                    control={control}
                    render={({ field }) => (
                        <div className="flex gap-4 items-center">
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="radio"
                                    name={field.name}
                                    value="true"
                                    checked={field.value === true}
                                    onChange={() => field.onChange(true)}
                                    className="form-radio"
                                />
                                <span>Start Now</span>
                            </label>
                            <label className="inline-flex items-center gap-2">
                                <input
                                    type="radio"
                                    name={field.name}
                                    value="false"
                                    checked={field.value === false}
                                    onChange={() => field.onChange(false)}
                                    className="form-radio"
                                />
                                <span>Start Later</span>
                            </label>
                        </div>
                    )}
                />
            </div>

            <button
                disabled={loading}
                className="rounded-md bg-primary text-white hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-primary-foreground px-10 py-2 mt-6 uppercase"
                type="submit"
            >
                {loading ? 'Processing...' : 'Submit'}
            </button>
        </form>
    );
};

export default Form;
