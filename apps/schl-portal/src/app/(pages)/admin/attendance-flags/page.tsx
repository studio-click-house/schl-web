import React from 'react';
import Table from './components/Table';

const AttendanceFlagsPage = () => {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 uppercase underline underline-offset-4">
                Settings: Attendance Flags
            </h1>
            <p className="text-gray-600 mb-8">
                Manage the flags used for attendance status (Present, Absent,
                Late), Leaves, and Holidays.
                <br />
                <small className="text-gray-500">
                    System flags control automated logic (like Lateness
                    calculation). User flags are for Leaves and Holidays.
                </small>
            </p>
            <Table />
        </div>
    );
};

export default AttendanceFlagsPage;
