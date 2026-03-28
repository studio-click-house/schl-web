import Cards from '../shared/Cards';
import Time from '../shared/Time';
import { useLiveTrackingContext } from '../../Context';

function formatClock(value: string | null) {
    if (!value) {
        return '--:--';
    }

    return value.slice(11, 16);
}

export default function IdleTable() {
    const { sessions, userSessions } = useLiveTrackingContext();

    const activeWorkers = new Set(sessions.map(session => session.employeeName));
    const idleUsers = userSessions
        .filter(user => user.isActive && !activeWorkers.has(user.username))
        .map(user => ({
            ...user,
            idleMinutes: Math.max(0, user.totalDurationMinutes - 25),
        }));

    return (
        <div className="space-y-5">
            <Cards
                cards={[
                    {
                        label: 'IDLE USERS',
                        value: String(idleUsers.length),
                        icon: 'IDL',
                        accentClass: 'text-[#007AFF]',
                    },
                    {
                        label: 'TOTAL IDLE TIME',
                        value: `${idleUsers.reduce(
                            (sum, user) => sum + user.idleMinutes,
                            0,
                        )}m`,
                        icon: 'SUM',
                        accentClass: 'text-[#FF9500]',
                    },
                ]}
            />

            <div className="rounded-[9px] border border-[#ECEEF2] bg-[#F9FAFB] px-[14px] py-[10px]">
                <div className="grid items-center gap-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#888888] md:grid-cols-[2fr_1.5fr_1.5fr_1fr]">
                    <span className="pl-4">User</span>
                    <span className="text-center">First Login</span>
                    <span className="text-center">Idle Time</span>
                    <span className="text-center">Status</span>
                </div>
            </div>

            <div className="overflow-hidden rounded-[9px] border border-[#ECEEF2] bg-white">
                {idleUsers.map(user => (
                    <div
                        key={user.username}
                        className="grid items-center gap-4 border-b border-[#ECEEF2] px-[14px] py-[12px] text-[12px] last:border-b-0 md:grid-cols-[2fr_1.5fr_1.5fr_1fr]"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="h-[7px] w-[7px] rounded-full bg-[#9AA0AE]" />
                            <p className="truncate text-[13px] font-semibold text-[#111318]">
                                {user.username}
                            </p>
                        </div>
                        <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                            {formatClock(user.firstLoginAt)}
                        </p>
                        <div className="text-center font-mono text-[11.5px] font-semibold text-[#007AFF]">
                            <Time minutes={user.idleMinutes} />
                        </div>
                        <p className="text-center text-[11.5px] font-semibold text-[#5A6172]">
                            Idle
                        </p>
                    </div>
                ))}
            </div>

            {idleUsers.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-[#D9DDE4] bg-white px-6 py-10 text-sm text-[#5A6172]">
                    No idle users found for the current filter.
                </div>
            ) : null}
        </div>
    );
}
