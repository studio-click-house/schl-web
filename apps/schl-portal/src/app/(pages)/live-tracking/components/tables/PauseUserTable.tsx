import { useState } from 'react';
import Cards from '../shared/Cards';
import { useLiveTrackingContext } from '../../Context';

function formatClock(value: string | null) {
    if (!value) {
        return '--:--';
    }

    return value.slice(11, 16);
}

export default function PauseUserTable() {
    const [openId, setOpenId] = useState<string | null>(null);
    const { sessions, userSessions } = useLiveTrackingContext();

    const rows = sessions
        .filter(session => session.pauseCount > 0 || session.pauseReasons.length > 0)
        .map(session => {
            const trackerSession = userSessions.find(
                user => user.username === session.employeeName,
            );
            const status = session.pauseReasons.some(reason => !reason.completedAt)
                ? 'Paused'
                : 'Working';

            return {
                ...session,
                trackerSession,
                status,
                idleMinutes: Math.max(
                    0,
                    (trackerSession?.totalDurationMinutes ?? session.totalTimeMinutes) -
                        session.totalTimeMinutes -
                        session.pauseTimeMinutes,
                ),
            };
        });

    return (
        <div className="space-y-5">
            <Cards
                cards={[
                    {
                        label: 'PAUSED NOW',
                        value: String(rows.filter(item => item.status === 'Paused').length),
                        icon: 'PAU',
                        accentClass: 'text-[#FF3B30]',
                    },
                    {
                        label: 'WORKING NOW',
                        value: String(rows.filter(item => item.status === 'Working').length),
                        icon: 'WRK',
                        accentClass: 'text-[#34C759]',
                    },
                    {
                        label: 'TOTAL PAUSE COUNT',
                        value: String(rows.reduce((sum, item) => sum + item.pauseCount, 0)),
                        icon: 'CNT',
                        accentClass: 'text-[#FF9500]',
                    },
                    {
                        label: 'TOTAL AVG WORKING',
                        value: `${
                            rows.length > 0
                                ? Math.round(
                                      rows.reduce(
                                          (sum, item) => sum + item.totalTimeMinutes,
                                          0,
                                      ) / rows.length,
                                  )
                                : 0
                        }m`,
                        icon: 'AVG',
                        accentClass: 'text-[#007AFF]',
                    },
                ]}
            />

            <div className="rounded-[9px] border border-[#ECEEF2] bg-[#F9FAFB] px-[14px] py-[10px]">
                <div className="grid items-center gap-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#888888] md:grid-cols-[2.2fr_1.5fr_1.5fr_1.5fr_1fr_1fr_1fr]">
                    <span className="pl-4">Employee</span>
                    <span className="text-center">Start Time</span>
                    <span className="text-center">Total Work Time</span>
                    <span className="text-center">Total Pause</span>
                    <span className="text-center">Idle Time</span>
                    <span className="text-center">Pause Count</span>
                    <span className="text-center">Status</span>
                </div>
            </div>

            <div className="overflow-hidden rounded-[9px] border border-[#ECEEF2] bg-white">
                {rows.map(item => {
                    const isOpen = openId === item.id;

                    return (
                        <div key={item.id} className="overflow-hidden">
                            <button
                                className="group grid w-full items-center gap-4 border-b border-[#ECEEF2] px-[14px] py-[9px] text-left transition hover:bg-[#177EA641] md:grid-cols-[2.2fr_1.5fr_1.5fr_1.5fr_1fr_1fr_1fr]"
                                type="button"
                                onClick={() =>
                                    setOpenId(current => (current === item.id ? null : item.id))
                                }
                            >
                                <div className="flex min-w-0 items-center">
                                    <span className="mr-3 text-[10px] text-[#9AA0AE] transition group-hover:text-[#7EA641]">
                                        {isOpen ? 'v' : '>'}
                                    </span>
                                    <span className="mr-2 h-[7px] w-[7px] rounded-full bg-[#7EA641]" />
                                    <p className="truncate text-[13px] font-semibold text-[#111318]">
                                        {item.employeeName}
                                    </p>
                                </div>
                                <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                    {formatClock(item.trackerSession?.firstLoginAt ?? item.createdAt)}
                                </p>
                                <p className="text-center font-mono text-[11.5px] font-semibold text-[#34C759]">
                                    {item.totalTimeMinutes}m
                                </p>
                                <p className="text-center font-mono text-[11.5px] font-semibold text-[#FF9500]">
                                    {item.pauseTimeMinutes}m
                                </p>
                                <p className="text-center font-mono text-[11.5px] text-[#FF3B30]">
                                    {item.idleMinutes}m
                                </p>
                                <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                    {item.pauseCount}
                                </p>
                                <div className="flex items-center justify-center gap-2">
                                    <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                            item.status === 'Paused'
                                                ? 'bg-[#FF9500]'
                                                : 'bg-[#34C759]'
                                        }`}
                                    />
                                    <span
                                        className={`text-[11.5px] font-semibold ${
                                            item.status === 'Paused'
                                                ? 'text-[#D97706]'
                                                : 'text-[#5D7C2E]'
                                        }`}
                                    >
                                        {item.status}
                                    </span>
                                </div>
                            </button>

                            {isOpen ? (
                                <div className="border-b border-[#ECEEF2] bg-white last:border-b-0">
                                    <div className="grid gap-0 border-b border-[#ECEEF2] bg-[#F9F9FB] md:grid-cols-3">
                                        <div className="px-6 py-4">
                                            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#9AA0AE]">
                                                First Login
                                            </p>
                                            <p className="mt-1 font-mono text-[14px] font-semibold text-[#111318]">
                                                {formatClock(
                                                    item.trackerSession?.firstLoginAt ?? item.createdAt,
                                                )}
                                            </p>
                                        </div>
                                        <div className="border-l border-[#E5E5EA] px-6 py-4">
                                            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#9AA0AE]">
                                                Last Logout
                                            </p>
                                            <p className="mt-1 font-mono text-[14px] font-semibold text-[#111318]">
                                                {formatClock(item.trackerSession?.lastLogoutAt ?? null)}
                                            </p>
                                        </div>
                                        <div className="border-l border-[#E5E5EA] px-6 py-4">
                                            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#9AA0AE]">
                                                Total Duration Today
                                            </p>
                                            <p className="mt-1 font-mono text-[14px] font-semibold text-[#007AFF]">
                                                {item.trackerSession?.totalDurationMinutes ?? 0}m
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid items-center gap-4 border-b border-[#ECEEF2] bg-[#F9FAFB] px-[14px] py-[10px] text-[11px] font-bold uppercase tracking-[0.12em] text-[#888888] md:grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_1fr_1fr]">
                                        <span className="pl-4">Pause Reason</span>
                                        <span className="text-center">Client</span>
                                        <span className="text-center">Work Type</span>
                                        <span className="text-center">Start Time</span>
                                        <span className="text-center">End Time</span>
                                        <span className="text-center">Total Pause</span>
                                        <span className="text-center">Pause Count</span>
                                    </div>

                                    {item.pauseReasons.map((pause, index) => (
                                        <div
                                            key={`${item.id}-${pause.reason}-${index}`}
                                            className="grid items-center gap-4 border-b border-[#ECEEF2] px-[14px] py-[10px] text-[12px] last:border-b-0 md:grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_1fr_1fr]"
                                        >
                                            <div className="flex min-w-0 items-center gap-3 pl-4">
                                                <span className="h-[6px] w-[6px] rounded-full bg-[#FF9500]" />
                                                <p className="truncate text-[#5A6172]">
                                                    {pause.reason}
                                                </p>
                                            </div>
                                            <p className="truncate text-center text-[#5A6172]">
                                                {item.clientCode}
                                            </p>
                                            <p className="truncate text-center text-[#5A6172]">
                                                {item.workType}
                                            </p>
                                            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                                {formatClock(pause.startedAt)}
                                            </p>
                                            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                                {formatClock(pause.completedAt)}
                                            </p>
                                            <p className="text-center font-mono text-[11.5px] font-semibold text-[#FF9500]">
                                                {pause.durationMinutes}m
                                            </p>
                                            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                                {item.pauseCount}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            {rows.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-[#D9DDE4] bg-white px-6 py-10 text-sm text-[#5A6172]">
                    No activity rows found for the current filter.
                </div>
            ) : null}
        </div>
    );
}
