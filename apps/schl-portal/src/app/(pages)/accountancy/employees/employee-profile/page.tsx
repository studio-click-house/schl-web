import { auth } from '@/auth';
import { EmployeeDocument } from '@repo/common/models/employee.schema';
import { fetchApi, generateAvatar } from '@repo/common/utils/general-utils';

import { redirect } from 'next/navigation';
import React from 'react';
import Profile from './components/Profile';

const getEmployeeInfo = async (identifier: string) => {
    try {
        const normalized = identifier.trim();
        if (!normalized) {
            return null;
        }

        const response = await fetchApi(
            {
                path: `/v1/employee/get-employee/${encodeURIComponent(normalized)}`,
            },
            {
                method: 'GET',
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

async function AccountPage({
    searchParams,
}: {
    searchParams: { code?: string; name?: string };
}) {
    const identifier = searchParams.code ?? searchParams.name ?? '';
    const decodedIdentifier = decodeURIComponent(identifier);
    const session = await auth();
    const avatarURI = await generateAvatar(decodedIdentifier || '');
    const employeeInfo = await getEmployeeInfo(decodedIdentifier);

    if (employeeInfo === null) {
        console.error('Employee info is null');
        redirect('/');
    }

    return (
        <div className="max-w-5xl mx-auto p-10 space-y-6">
            <Profile avatarURI={avatarURI} employeeInfo={employeeInfo} />
        </div>
    );
}

export default AccountPage;
