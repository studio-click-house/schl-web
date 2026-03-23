import { Metadata } from 'next';
import Table from './components/Table';

export const metadata: Metadata = {
    title: 'Shift Adjustments | Admin',
};

export default function AdjustmentsPage() {
    return (
        <>
            <div className="px-4 mt-8 mb-4 container">
                <Table />
            </div>
        </>
    );
}
