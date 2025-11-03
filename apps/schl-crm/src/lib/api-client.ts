'use client';

import {
    fetchApi,
    type FetchApiResponse,
    type NestJsError,
} from '@repo/common/utils/general-utils';
import { isArray } from 'lodash';
import { useSession } from 'next-auth/react';
import { useCallback } from 'react';
import { toast } from 'sonner';

export const useAuthedFetchApi = () => {
    const { data: session } = useSession();
    const token = session?.accessToken;

    return useCallback(
        async <TData>(
            target: Parameters<typeof fetchApi>[0],
            options: RequestInit = {},
        ) => fetchApi<TData>(target, options, token),
        [token],
    );
};

export const toastFetchError = (
    response: FetchApiResponse<unknown>,
    fallbackMessage?: string,
) => {
    if (response.ok) return;

    const error = response.data as NestJsError | undefined;

    if (!error?.message) {
        if (fallbackMessage) {
            toast.error(fallbackMessage);
        }
        return;
    }

    if (isArray(error.message)) {
        error.message.forEach((msg: string) => toast.error(msg));
        return;
    }

    toast.error(error.message);
};
