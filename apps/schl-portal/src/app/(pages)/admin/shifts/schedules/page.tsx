import React from 'react';
import ScheduleTable from '../components/ScheduleTable';

const SchedulesPage = async () => {
    return (
        <>
            <div className="px-4 mt-8 mb-4 container">
                <ScheduleTable />
            </div>
        </>
    );
};

export default SchedulesPage;
