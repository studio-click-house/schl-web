import { Metadata } from 'next';
import List from './components/List';

export const metadata: Metadata = {
    title: 'Holidays | Admin',
};

export default function HolidaysPage() {
    return <List />;
}
