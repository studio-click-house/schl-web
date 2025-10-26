import { signOut } from '@/auth';

const LogoutAction = async () => {
    'use server';
    await signOut({
        redirect: true,
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/login`,
    });
};

export default LogoutAction;
