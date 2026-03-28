import Cards from '../shared/Cards';
import Session from '../shared/Session';
import { useLiveTrackingContext } from '../../Context';

export default function Production() {
    const { sessions } = useLiveTrackingContext();

    const productionSessions = sessions.filter(
        session => !session.workType.toLowerCase().includes('qc'),
    );

    const totalFiles = productionSessions.reduce(
        (sum, session) => sum + session.files.length,
        0,
    );
    const completedFiles = productionSessions.reduce(
        (sum, session) =>
            sum + session.files.filter(file => file.status === 'done').length,
        0,
    );
    const totalMinutes = productionSessions.reduce(
        (sum, session) => sum + session.totalTimeMinutes,
        0,
    );

    const groups = productionSessions.reduce<Record<string, typeof productionSessions>>(
        (acc, session) => {
            const existingSessions = acc[session.clientCode] ?? [];
            acc[session.clientCode] = [...existingSessions, session];
            return acc;
        },
        {},
    );

    return (
        <div className="space-y-5">
            <Cards
                cards={[
                    {
                        label: 'ACTIVE USERS',
                        value: String(productionSessions.length),
                        icon: 'USR',
                        accentClass: 'text-[#34C759]',
                    },
                    {
                        label: 'TOTAL FILES',
                        value: String(totalFiles),
                        icon: 'FIL',
                        accentClass: 'text-[#007AFF]',
                    },
                    {
                        label: 'COMPLETED',
                        value: String(completedFiles),
                        icon: 'OK',
                        accentClass: 'text-[#AF52DE]',
                    },
                    {
                        label: 'AVG TIME / FILE',
                        value:
                            totalFiles > 0
                                ? `${Math.round(totalMinutes / totalFiles)}m`
                                : '0m',
                        icon: 'AVG',
                        accentClass: 'text-[#FF9500]',
                    },
                ]}
            />

            <div className="rounded-[9px] border border-[#ECEEF2] bg-[#F9FAFB] px-[14px] py-[10px]">
                <div className="grid items-center gap-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#888888] md:grid-cols-[2.2fr_1.1fr_0.7fr_1.2fr_0.8fr_0.9fr_0.9fr_0.9fr_0.9fr]">
                    <span>Employee</span>
                    <span className="text-center">Work Type</span>
                    <span className="text-center">Shift</span>
                    <span className="text-center">Categories</span>
                    <span className="text-center">Progress</span>
                    <span className="text-center">Total Time</span>
                    <span className="text-center">Avg / File</span>
                    <span className="text-center">Start Time</span>
                    <span className="text-center">End Time</span>
                </div>
            </div>

            {Object.entries(groups).map(([clientCode, items]) => (
                <section key={clientCode} className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 px-1">
                        <div className="flex items-center gap-2 rounded-full bg-[#177EA641] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#111318]">
                            <span className="h-[7px] w-[7px] rounded-full bg-[#7EA641]" />
                            {clientCode}
                        </div>
                        <div className="rounded-full bg-[#177EA641] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#111318]">
                            {items.length} Working
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-[9px] border border-[#ECEEF2] bg-white">
                        {items.map(session => (
                            <Session
                                key={session.id}
                                session={session}
                                mode="production"
                            />
                        ))}
                    </div>
                </section>
            ))}

            {productionSessions.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-[#D9DDE4] bg-white px-6 py-10 text-sm text-[#5A6172]">
                    No production sessions found for the current filter.
                </div>
            ) : null}
        </div>
    );
}
