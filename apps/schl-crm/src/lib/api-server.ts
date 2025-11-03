import { fetchApi } from '@repo/common/utils/general-utils';
import { auth } from '../auth';

export const fetchApiWithServerAuth = async <TData>(
    target: Parameters<typeof fetchApi>[0],
    options: RequestInit = {},
) => {
    const session = await auth();
    const token = session?.accessToken ?? undefined;

    return fetchApi<TData>(target, options, token);
};
