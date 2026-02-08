'use client';

import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const DeleteButton = () => {
    const handleDelete = () => {
        toast.info(
            'Shift plans cannot be deleted for data integrity. Please contact support if you need to make changes.',
        );
    };

    return (
        <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1 px-3 py-1 bg-red-400 cursor-not-allowed text-gray-600 rounded opacity-50"
        >
            <Trash2 size={16} />
            Delete
        </button>
    );
};

export default DeleteButton;
