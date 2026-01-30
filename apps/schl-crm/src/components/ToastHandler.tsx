'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function ToastHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            toast.error(error);
            // Remove the query param
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('error');
            router.replace(`?${newParams.toString()}`, { scroll: false });
        }
    }, [searchParams, router]);

    return null;
}
