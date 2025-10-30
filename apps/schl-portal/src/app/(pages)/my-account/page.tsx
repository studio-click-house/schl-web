import { auth } from '@/auth';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import {
    fetchApi,
    generateAvatar,
    verifyCookie,
} from '@repo/common/utils/general-utils';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import React from 'react';
import Profile from './components/Profile';

const getEmployeeInfo = async () => {
    const session = await auth();
    try {
        if (!session?.user.e_id) {
            console.error('Employee ID is missing from session');
            return null;
        }

        const response = await fetchApi(
            {
                path: `/v1/employee/get-employee/${encodeURIComponent(session.user.e_id)}`,
            },
            {
                method: 'GET',
                cache: 'no-store',
            },
        );
        if (response.ok) {
            return response.data as EmployeeDocument;
        } else {
            console.error(response.data);
            return null;
        }
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
    const employeeInfo = await getEmployeeInfo();

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
