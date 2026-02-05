import React from 'react';
import DepartmentConfigTable from './components/DepartmentConfigTable';
import ShiftConfigTable from './components/ShiftConfigTable';

const ShiftsPage = async () => {
    return (
        <>
            <div className="px-4 mt-8 mb-4 container space-y-10">
                <ShiftConfigTable />
                <hr className="border-gray-200 dark:border-gray-700" />
                <DepartmentConfigTable />
            </div>
        </>
    );
};

export default ShiftsPage;
