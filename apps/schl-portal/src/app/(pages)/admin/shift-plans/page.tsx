import React from 'react';
import Table from './components/Table';

const ShiftPlansPage = async () => {
    return (
        <>
            <div className="px-4 mt-8 mb-4 container">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        Shift Plans
                    </h1>
                    <p className="text-gray-600">
                        Manage employee shift schedules and assignments
                    </p>
                </div>
                <Table />
            </div>
        </>
    );
};

export default ShiftPlansPage;
