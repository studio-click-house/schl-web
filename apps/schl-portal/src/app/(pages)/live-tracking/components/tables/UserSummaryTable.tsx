import { useMemo, useState } from 'react';
import Cards from '../shared/Cards';
import Badge from '../shared/Badge';
import { useLiveTrackingContext } from '../../Context';

function formatClock(value: string | null) {
    if (!value) {
        return '--:--';
    }

    return value.slice(11, 16);
}

export default function UserSummaryTable() {
    const { sessions, userSessions } = useLiveTrackingContext();
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [expandedWorkLog, setExpandedWorkLog] = useState<string | null>(null);

    const rows = useMemo(
        () =>
            userSessions.map(user => {
                const workLogs = sessions.filter(
                    session => session.employeeName === user.username,
                );
                const totalWorkMinutes = workLogs.reduce(
                    (sum, session) => sum + session.totalTimeMinutes,
                    0,
                );
                const totalPauseMinutes = workLogs.reduce(
                    (sum, session) => sum + session.pauseTimeMinutes,
                    0,
                );
                const allPauses = workLogs.flatMap(session =>
                    session.pauseReasons.map((pause, index) => ({
                        id: `${session.id}-pause-${index}`,
                        reason: pause.reason,
                        durationMinutes: pause.durationMinutes,
                        startedAt: pause.startedAt,
                        completedAt: pause.completedAt,
                        clientCode: session.clientCode,
                        workType: session.workType,
                    })),
                );

                return {
                    username: user.username,
                    isActive: user.isActive,
                    firstLoginAt: user.firstLoginAt,
                    lastLogoutAt: user.lastLogoutAt,
                    totalDurationMinutes: user.totalDurationMinutes,
                    totalWorkMinutes,
                    totalPauseMinutes,
                    idleMinutes: Math.max(
                        0,
                        user.totalDurationMinutes - totalWorkMinutes - totalPauseMinutes,
                    ),
                    workLogs,
                    allPauses,
                };
            }),
        [sessions, userSessions],
    );

    const filteredRows = rows.filter(row =>
        row.username.toLowerCase().includes(search.toLowerCase()),
    );
    const activeUser =
        filteredRows.find(row => row.username === selectedUser) ?? filteredRows[0] ?? null;

    return (
        <div className="grid gap-4 xl:grid-cols-[290px_16px_1fr]">
            <section className="xl:col-span-1">
                <div className="rounded-[10px] bg-transparent p-1">
                    <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#888888]">
                        Employees
                    </p>

                    <div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
                        <div className="rounded-[8px] border border-[#E0E0E5] bg-[#F5F6F8] px-3 py-2">
                            <input
                                className="w-full bg-transparent text-[12px] text-[#111318] outline-none"
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                placeholder="Search employee"
                            />
                        </div>
                        <button
                            type="button"
                            className="rounded-[8px] border border-[#D9DDE4] bg-white px-3 text-[13px] text-[#7EA641]"
                            aria-label="Filter"
                            title="Filter"
                        >
                            F
                        </button>
                    </div>

                    <div className="max-h-[980px] space-y-1 overflow-auto pr-1">
                        {filteredRows.map(row => {
                            const isSelected = activeUser?.username === row.username;

                            return (
                                <button
                                    key={row.username}
                                    className={`flex w-full items-center gap-3 rounded-[6px] px-[10px] py-[10px] text-left transition ${
                                        isSelected
                                            ? 'bg-[#E8F0FE]'
                                            : 'bg-transparent hover:bg-[#F0F4FF]'
                                    }`}
                                    type="button"
                                    onClick={() => setSelectedUser(row.username)}
                                >
                                    <span
                                        className={`h-2 w-2 rounded-full ${
                                            row.isActive ? 'bg-[#34C759]' : 'bg-[#8E8E93]'
                                        }`}
                                    />
                                    <span className="truncate text-[13px] font-medium text-[#111318]">
                                        {row.username}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            <div className="hidden xl:block" />

            <section className="space-y-4 xl:col-span-1">
                {activeUser ? (
                    <>
                        <Cards
                            cards={[
                                {
                                    label: 'TOTAL WORK TIME',
                                    value: `${activeUser.totalWorkMinutes}m`,
                                    icon: 'WRK',
                                    accentClass: 'text-[#34C759]',
                                },
                                {
                                    label: 'TOTAL PAUSE TIME',
                                    value: `${activeUser.totalPauseMinutes}m`,
                                    icon: 'PAU',
                                    accentClass: 'text-[#FF9500]',
                                },
                                {
                                    label: 'TOTAL LOGIN TIME',
                                    value: `${activeUser.totalDurationMinutes}m`,
                                    icon: 'LOG',
                                    accentClass: 'text-[#007AFF]',
                                },
                                {
                                    label: 'IDLE TIME',
                                    value: `${activeUser.idleMinutes}m`,
                                    icon: 'IDL',
                                    accentClass: 'text-[#AF52DE]',
                                },
                            ]}
                        />

                        <div className="grid gap-3 rounded-[9px] border border-[#ECEEF2] bg-white px-5 py-4 md:grid-cols-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#888888]">
                                    First Login
                                </p>
                                <p className="mt-1 font-mono text-[14px] font-semibold text-[#111318]">
                                    {formatClock(activeUser.firstLoginAt)}
                                </p>
                            </div>
                            <div className="border-l border-[#E5E5EA] pl-5">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#888888]">
                                    Last Logout
                                </p>
                                <p className="mt-1 font-mono text-[14px] font-semibold text-[#111318]">
                                    {formatClock(activeUser.lastLogoutAt)}
                                </p>
                            </div>
                            <div className="border-l border-[#E5E5EA] pl-5">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#888888]">
                                    Status
                                </p>
                                <div className="mt-1">
                                    <Badge status={activeUser.isActive ? 'working' : 'idle'} />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-[9px] border border-[#ECEEF2] bg-white">
                            <div className="border-b border-[#ECEEF2] bg-[#F9FAFB] px-4 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#888888]">
                                    Pause History
                                </p>
                            </div>
                            <div className="grid items-center gap-4 border-b border-[#ECEEF2] bg-[#F2F4F7] px-4 py-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#9AA0AE] md:grid-cols-[2fr_1.2fr_1.2fr_1fr_1fr_1fr]">
                                <span>Reason</span>
                                <span className="text-center">Client</span>
                                <span className="text-center">Work Type</span>
                                <span className="text-center">Duration</span>
                                <span className="text-center">Start</span>
                                <span className="text-center">End</span>
                            </div>
                            {activeUser.allPauses.length > 0 ? (
                                activeUser.allPauses.map(pause => (
                                    <div
                                        key={pause.id}
                                        className="grid items-center gap-4 border-b border-[#ECEEF2] px-4 py-3 text-[11.5px] last:border-b-0 md:grid-cols-[2fr_1.2fr_1.2fr_1fr_1fr_1fr]"
                                    >
                                        <p className="truncate font-medium text-[#5A6172]">
                                            {pause.reason}
                                        </p>
                                        <p className="truncate text-center text-[#5A6172]">
                                            {pause.clientCode}
                                        </p>
                                        <p className="truncate text-center text-[#5A6172]">
                                            {pause.workType}
                                        </p>
                                        <p className="text-center font-mono text-[#FF9500]">
                                            {pause.durationMinutes}m
                                        </p>
                                        <p className="text-center font-mono text-[#5A6172]">
                                            {formatClock(pause.startedAt)}
                                        </p>
                                        <p className="text-center font-mono text-[#5A6172]">
                                            {formatClock(pause.completedAt)}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-6 text-center text-[12px] text-[#9AA0AE]">
                                    No pause history available.
                                </div>
                            )}
                        </div>

                        <div className="overflow-hidden rounded-[9px] border border-[#ECEEF2] bg-white">
                            <div className="grid items-center gap-4 border-b border-[#ECEEF2] bg-[#F9FAFB] px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#9AA0AE] md:grid-cols-[32px_14fr_12fr_9fr_11fr_11fr_10fr_11fr_11fr]">
                                <span />
                                <span>Client</span>
                                <span>Work Type</span>
                                <span className="text-center">Shift</span>
                                <span className="text-center">Work Time</span>
                                <span className="text-center">Pause Time</span>
                                <span className="text-center">Avg Time</span>
                                <span className="text-center">Start Time</span>
                                <span className="text-center">End Time</span>
                            </div>

                            {activeUser.workLogs.length > 0 ? (
                                activeUser.workLogs.map(workLog => {
                                    const isExpanded = expandedWorkLog === workLog.id;

                                    return (
                                        <div key={workLog.id}>
                                            <button
                                                className="grid w-full items-center gap-4 border-b border-[#ECEEF2] px-4 py-3 text-left transition hover:bg-[#177EA641] md:grid-cols-[32px_14fr_12fr_9fr_11fr_11fr_10fr_11fr_11fr]"
                                                type="button"
                                                onClick={() =>
                                                    setExpandedWorkLog(current =>
                                                        current === workLog.id
                                                            ? null
                                                            : workLog.id,
                                                    )
                                                }
                                            >
                                                <span className="text-center text-[11px] text-[#9AA0AE]">
                                                    {isExpanded ? 'v' : '>'}
                                                </span>
                                                <p className="truncate text-[12.5px] font-semibold text-[#111318]">
                                                    {workLog.clientCode}
                                                </p>
                                                <p className="truncate text-[12.5px] text-[#5A6172]">
                                                    {workLog.workType}
                                                </p>
                                                <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                                    {workLog.shift}
                                                </p>
                                                <p className="text-center font-mono text-[11.5px] font-semibold text-[#34C759]">
                                                    {workLog.totalTimeMinutes}m
                                                </p>
                                                <p className="text-center font-mono text-[11.5px] text-[#9AA0AE]">
                                                    {workLog.pauseTimeMinutes}m
                                                </p>
                                                <p className="text-center font-mono text-[11.5px] font-semibold text-[#007AFF]">
                                                    {Math.round(
                                                        workLog.totalTimeMinutes /
                                                            Math.max(
                                                                workLog.files.length,
                                                                1,
                                                            ),
                                                    )}
                                                    m
                                                </p>
                                                <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                                    {formatClock(workLog.createdAt)}
                                                </p>
                                                <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                                    {formatClock(workLog.updatedAt)}
                                                </p>
                                            </button>

                                            {isExpanded ? (
                                                <div className="border-b border-[#ECEEF2] bg-[#F2F4F7] last:border-b-0">
                                                    <div className="grid items-center gap-4 border-b border-[#ECEEF2] bg-[#EFF1F4] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9AA0AE] md:grid-cols-[32px_14fr_12fr_9fr_11fr_11fr_10fr_11fr_11fr]">
                                                        <span />
                                                        <span className="md:col-span-2">
                                                            File Name
                                                        </span>
                                                        <span className="text-center">
                                                            Status
                                                        </span>
                                                        <span className="text-center">
                                                            Time Spent
                                                        </span>
                                                        <span className="text-center">
                                                            Report
                                                        </span>
                                                        <span />
                                                        <span className="text-center">
                                                            Start Time
                                                        </span>
                                                        <span className="text-center">
                                                            End Time
                                                        </span>
                                                    </div>

                                                    {workLog.files.map(file => (
                                                        <div
                                                            key={file.id}
                                                            className="grid items-center gap-4 border-b border-[#ECEEF2] px-4 py-3 text-[11.5px] last:border-b-0 md:grid-cols-[32px_14fr_12fr_9fr_11fr_11fr_10fr_11fr_11fr]"
                                                        >
                                                            <span />
                                                            <p className="truncate font-semibold text-[#111318] md:col-span-2">
                                                                {file.fileName}
                                                            </p>
                                                            <div className="flex justify-center">
                                                                <Badge status={file.status} />
                                                            </div>
                                                            <p className="text-center font-mono text-[#5A6172]">
                                                                {file.timeSpentMinutes}m
                                                            </p>
                                                            <p className="text-center text-[#5A6172]">
                                                                {file.report || '--'}
                                                            </p>
                                                            <span />
                                                            <p className="text-center font-mono text-[#5A6172]">
                                                                {formatClock(file.startedAt)}
                                                            </p>
                                                            <p className="text-center font-mono text-[#5A6172]">
                                                                {formatClock(file.completedAt)}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="px-4 py-6 text-center text-[12px] text-[#9AA0AE]">
                                    No work log data available.
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="rounded-[10px] border border-dashed border-[#D9DDE4] bg-white px-6 py-10 text-sm text-[#5A6172]">
                        No user summary data found for the current filter.
                    </div>
                )}
            </section>
        </div>
    );
}
