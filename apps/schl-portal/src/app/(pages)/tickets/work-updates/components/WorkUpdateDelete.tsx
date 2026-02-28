'use client';

import React from 'react';
import DeleteButton from '../../all-tickets/components/Delete';

interface Props {
    id: string;
    onDelete: (data: { _id: string }) => Promise<void>;
}

const WorkUpdateDelete: React.FC<Props> = ({ id, onDelete }) => {
    return (
        <DeleteButton
            ticketData={{ _id: id }}
            submitHandler={onDelete}
            title="Delete Work Update"
        />
    );
};

export default WorkUpdateDelete;
