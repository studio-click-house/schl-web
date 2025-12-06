'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import {
    fileConditionOptions,
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
    qcStepOptions,
} from '@repo/common/constants/order.constant';
import { ClientDocument } from '@repo/common/models/client.schema';
import { OrderDocument } from '@repo/common/models/order.schema';
import { setMenuPortalTarget } from '@repo/common/utils/select-helpers';
import moment from 'moment-timezone';
import { useSession } from 'next-auth/react';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
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

    const [folders, setFolders] = useState<{ name: string; path: string }[]>(
        [],
    );
    const [fileNames, setFileNames] = useState<string[]>([]);
    const [skippedFilesFromLastOp, setSkippedFilesFromLastOp] = useState<
        string[]
    >([]);

    const clientCodes = props.clientsData?.map(c => c.client_code) || [];

    const clientCodeOptions = clientCodes.map(cc => ({ value: cc, label: cc }));
    const folderOptions = folders.map(f => ({
        value: f.path,
        label: f.name || f.path,
    }));
    const fileNameOptions = fileNames.map(fn => ({ value: fn, label: fn }));

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
            file_condition: 'fresh',
            is_active: true,
            qc_step: 1,
            job_type: 'general',
            shift: 'morning',
        },
    });

    const clientCode = useWatch({ control, name: 'client_code' });
    const jobType = useWatch({ control, name: 'job_type' });
    const folderPath = useWatch({ control, name: 'folder_path' });
    const fileCondition = useWatch({ control, name: 'file_condition' });
    const qc_step = useWatch({ control, name: 'qc_step' });

    const LOADING_SHOW_DELAY = 300; // ms

    const getAvailableFoldersOfClient = useCallback(
        async (clientCodeParam: string, jobTypeParam: string) => {
            if (!clientCodeParam) return setFolders([]);
            let loadingShown = false;
            const toastTimer = setTimeout(() => {
                toast.loading('Loading folders...', { id: 'loading-folders' });
                loadingShown = true;
            }, LOADING_SHOW_DELAY);
            let success = false;
            try {
                const response = await authedFetchApi<any[]>(
                    {
                        path: '/v1/order/available-folders',
                        query: {
                            clientCode: clientCodeParam,
                            jobType: jobTypeParam,
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
                if (!response.ok) {
                    console.error('Unable to fetch orders of the client');
                    setFolders([]);
                    return;
                }
                const data = (response.data || []) as Array<{
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
                success = true;
            } catch (e) {
                console.error(e);
                setFolders([]);
            } finally {
                clearTimeout(toastTimer);
                if (loadingShown) {
                    if (!success)
                        toast.error('Failed to load', {
                            id: 'loading-folders',
                        });
                    else toast.dismiss('loading-folders');
                } else if (!success) toast.error('Failed to load');
            }
        },
        [authedFetchApi],
    );

    const getFilesOfFolder = useCallback(
        async (
            folderPathParam: string,
            jobTypeParam: string,
            fileConditionParam: string,
            qcStepParam?: number,
        ) => {
            if (!folderPathParam) {
                setFileNames([]);
                return;
            }
            let loadingShown = false;
            const toastTimer = setTimeout(() => {
                toast.loading('Loading files...', { id: 'loading-files' });
                loadingShown = true;
            }, LOADING_SHOW_DELAY);
            let success = false;
            try {
                const resp = await authedFetchApi<string[]>(
                    {
                        path: '/v1/order/available-files',
                        query: {
                            folderPath: folderPathParam,
                            jobType: jobTypeParam,
                            fileCondition: fileConditionParam,
                            qcStep: qcStepParam || 1,
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
                if (resp.ok) {
                    setFileNames(resp.data || []);
                    success = true;
                } else setFileNames([]);
            } catch (e) {
                console.error(e);
                setFileNames([]);
            } finally {
                clearTimeout(toastTimer);
                if (loadingShown) {
                    if (!success) {
                        toast.error('Failed to load', {
                            id: 'loading-files',
                        });
                    } else {
                        toast.dismiss('loading-files');
                    }
                } else if (!success) toast.error('Failed to load');
            }
        },
        [authedFetchApi],
    );

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
            '&:hover': { borderColor: '#e5e7eb' },
        }),
        menu: (provided: any) => ({ ...provided, width: '200px' }),
    };

    // Effects

    // 1) When client_code changes:
    // - reset folder options, file options, their form values
    // - reset job_type to default (you said "reset selected options for Job Type")
    useEffect(() => {
        // clear options and selected values
        setFolders([]);
        setFileNames([]);
        setValue('folder_path', '');
        setValue('file_names', []);
        // reset job_type to default
        setValue('job_type', 'general');
        // fetch fresh folders for the new client and current job_type
        setValue('file_condition', 'fresh');
        if (clientCode) getAvailableFoldersOfClient(clientCode, jobType);
    }, [clientCode]); // intentionally only reacts to clientCode changes

    // 2) When job_type changes:
    // - reset folder and file options and selected values
    // - fetch folders for current client (if present)
    useEffect(() => {
        setFolders([]);
        setFileNames([]);
        setValue('folder_path', '');
        setValue('file_names', []);
        setValue('qc_step', 1);
        if (clientCode) getAvailableFoldersOfClient(clientCode, jobType);
    }, [jobType]);

    // 3) When folder_path changes:
    // - reset file names and selected file_names
    // - fetch files for this folder
    useEffect(() => {
        setFileNames([]);
        setValue('file_names', []);
        if (folderPath)
            getFilesOfFolder(folderPath, jobType, fileCondition, qc_step);
    }, [folderPath, jobType, fileCondition]);

    // submit unchanged
    const onSubmit = async (data: NewJobDataType) => {
        await addNewJob(data);
        return;
    };
    async function addNewJob(jobData: NewJobDataType) {
        try {
            setLoading(true);
            const parsed = validationSchema.safeParse(jobData);

            if (!parsed.success) {
                console.error(parsed.error.issues.map(issue => issue.message));
                toast.error('Invalid form data');
                return;
            }

            const response = await authedFetchApi(
                { path: '/v1/order/new-job' },
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(parsed.data),
                },
            );

            if (response.ok) {
                toast.success('Added new job successfully');
                // If the backend returned skipped files, warn the user
                const skippedFilesFromResponse = (response.data as any)
                    ?.skippedFiles;
                if (
                    skippedFilesFromResponse &&
                    skippedFilesFromResponse.length > 0
                ) {
                    toast.warning(
                        `The following files were skipped: ${skippedFilesFromResponse.join(', ')}`,
                    );
                }
                const skippedFilesFromResponse2 =
                    (response.data as any)?.skippedFiles || [];
                setSkippedFilesFromLastOp(skippedFilesFromResponse2);
                // reset the form after successful submission
                reset();
            } else {
                toastFetchError(response);
            }

            console.log('data', parsed.data, jobData);
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while adding the job');
        } finally {
            setLoading(false);
        }
    }

    // console.log('Fetched available orders of the client', folders);

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            {skippedFilesFromLastOp.length > 0 && (
                <div className="mb-4 p-3 border border-yellow-200 bg-yellow-50 text-yellow-900 rounded">
                    <strong>Skipped files:</strong>
                    <div>{skippedFilesFromLastOp.join(', ')}</div>
                </div>
            )}
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

                {jobType?.startsWith('qc') && (
                    <div>
                        <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                            <span className="uppercase">QC Step*</span>
                            <span className="text-red-700 text-wrap block text-xs">
                                {errors.qc_step &&
                                    (errors.qc_step as any)?.message}
                            </span>
                        </label>

                        <Controller
                            name="qc_step"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    options={qcStepOptions}
                                    closeMenuOnSelect={true}
                                    placeholder="Select QC step"
                                    classNamePrefix="react-select"
                                    menuPortalTarget={setMenuPortalTarget}
                                    value={
                                        qcStepOptions.find(
                                            option =>
                                                option.value === field.value,
                                        ) || null
                                    }
                                    onChange={option =>
                                        field.onChange(
                                            option ? option.value : undefined,
                                        )
                                    }
                                />
                            )}
                        />
                    </div>
                )}

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
                        <span className="uppercase">File Condition*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.file_condition &&
                                (errors.file_condition as any)?.message}
                        </span>
                    </label>
                    <Controller
                        name="file_condition"
                        control={control}
                        render={({ field }) => (
                            <Select
                                options={fileConditionOptions}
                                closeMenuOnSelect={true}
                                placeholder="Select file condition"
                                classNamePrefix="react-select"
                                menuPortalTarget={setMenuPortalTarget}
                                value={
                                    fileConditionOptions.find(
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
