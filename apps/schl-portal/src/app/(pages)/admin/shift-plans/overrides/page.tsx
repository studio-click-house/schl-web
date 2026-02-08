import { Metadata } from 'next';
import Table from './components/Table';

export const metadata: Metadata = {
    title: 'Shift Overrides | Admin',
};

export default function OverridesPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 uppercase underline underline-offset-4">
                Shift Overrides
            </h1>
            <p className="text-gray-600 mb-8">
                Manage manual shift overrides (Manual Entries). These take
                priority over Shift Plans.
            </p>
            <Table />
        </div>
    );
}
