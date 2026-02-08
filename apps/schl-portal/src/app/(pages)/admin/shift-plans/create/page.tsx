import React from 'react';
import Form from '../components/Form';

const CreateShiftPlanPage = async () => {
    return (
        <>
            <div className="px-4 mt-8 mb-4 flex flex-col justify-center md:w-[70vw] mx-auto">
                <h1 className="text-2xl font-semibold text-left mb-8 underline underline-offset-4 uppercase">
                    Add a new shift plan
                </h1>
                <Form />
            </div>
        </>
    );
};

export default CreateShiftPlanPage;
