'use server ';
import { signOut } from '@/auth';

const LogoutAction = async () => {
    await signOut({
        redirect: true,
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/login`,
    });
};

export default LogoutAction;
