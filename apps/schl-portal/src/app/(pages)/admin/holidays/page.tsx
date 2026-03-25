import { Metadata } from 'next';
import Table from './components/Table';

export const metadata: Metadata = {
    title: 'Holidays | Admin',
};

export default function HolidaysPage() {
    return (
        <div className="px-4 mt-8 mb-4 container">
            <Table />
        </div>
    );
}
