import { Metadata } from 'next';
import List from './components/List';

export const metadata: Metadata = {
    title: 'Leaves | Admin',
};

export default function LeavesPage() {
    return <List />;
}
