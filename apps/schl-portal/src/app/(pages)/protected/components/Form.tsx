'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';

import { LoginDataType, validationSchema } from '@/app/login/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useRouter } from 'nextjs-toploader/app';
import { toast } from 'sonner';

interface PropsType {
    redirect_path: string;
}

const Form: React.FC<PropsType> = props => {
    const authedFetchApi = useAuthedFetchApi();
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    const {
        watch,
        register,
        handleSubmit,
        control,
        setValue,
        reset,
        formState: { errors },
    } = useForm<LoginDataType>({
        resolver: zodResolver(validationSchema),
        defaultValues: {
            username: '',
            password: '',
        },
    });

    async function verifyCreds(loginData: LoginDataType) {
        try {
            setLoading(true);
            const parsed = validationSchema.safeParse(loginData);

            if (!parsed.success) {
                console.error(parsed.error.issues.map(issue => issue.message));
                toast.error('Invalid form data');
                return;
            }

            const response = await authedFetchApi(
                {
                    path: '/v1/user/verify-user',
                    query: { redirect: props.redirect_path },
                },
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(parsed.data),
                },
            );

            if (response.ok) {
                const redirectPath =
                    (response.data as { redirect_path?: string })
                        ?.redirect_path ??
                    props.redirect_path ??
                    '/';
                router.replace(redirectPath);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while verifying the credentials');
        } finally {
            setLoading(false);
        }
    }

    const onSubmit = async (data: LoginDataType) => {
        await verifyCreds(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-x-3 mb-4 gap-y-4">
                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                        <span className="uppercase">Username*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.username && errors.username.message}
                        </span>
                    </label>
                    <input
                        placeholder="JohnDoe001"
                        type="text"
                        {...register('username')}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    />
                </div>
                <div>
                    <label className="tracking-wide text-gray-700 text-sm font-bold block mb-2 ">
                        <span className="uppercase">Password*</span>
                        <span className="text-red-700 text-wrap block text-xs">
                            {errors.password && errors.password.message}
                        </span>
                    </label>
                    <input
                        placeholder="*******"
                        type="password"
                        {...register('password')}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    />
                </div>
            </div>

            <button
                disabled={loading}
                className="rounded-md bg-primary text-white hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-primary-foreground px-10 py-2 mt-6 uppercase"
                type="submit"
            >
                {loading ? 'Verifying...' : 'Verify'}
            </button>
        </form>
    );
};

export default Form;
