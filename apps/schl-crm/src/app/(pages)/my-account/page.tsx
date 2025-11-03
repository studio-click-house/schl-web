import { auth } from '@/auth';
import { fetchApiWithServerAuth } from '@/lib/api-server';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { generateAvatar, verifyCookie } from '@repo/common/utils/general-utils';

import type { Session } from 'next-auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import React from 'react';
import Profile from './components/Profile';

const getEmployeeInfo = async (
    session: Session | null,
): Promise<EmployeeDocument | null> => {
    if (!session?.user) {
        return null;
    }

    const userId = session.user.db_id || session.user.e_id;

    if (!userId) {
        console.error('Session missing user identifiers');
        return null;
    }

    try {
        const response = await fetchApiWithServerAuth<EmployeeDocument>(
            {
                path: `/v1/employee/get-employee/${encodeURIComponent(userId)}`,
            },
            {
                method: 'GET',
                cache: 'no-store',
            },
        );

        if (response.ok) {
            return response.data;
        }

        console.error(response.data);
        return null;
    } catch (e) {
        console.error(e);
        console.log('An error occurred while fetching employee data');
        return null;
    }
};

async function MyAccountPage() {
    console.log('My Account Page');
    const session = await auth();
    const avatarURI = await generateAvatar(session?.user.real_name || '');
    const employeeInfo = await getEmployeeInfo(session);

    if (employeeInfo === null) {
        console.error('Employee info is null');
        redirect('/');
    }

    const cookieStore = cookies();
    const token = cookieStore.get('verify-token.tmp')?.value;
    const verified = verifyCookie(token, session?.user.db_id || '');

    if (!verified) {
        redirect('/protected?redirect=' + '/my-account');
    }

    return (
        <div className="max-w-5xl mx-auto p-10 space-y-6">
            <Profile avatarURI={avatarURI} employeeInfo={employeeInfo} />
        </div>
    );
}

export default MyAccountPage;
