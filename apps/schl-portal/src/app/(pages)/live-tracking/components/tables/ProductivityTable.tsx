import { useMemo, useState } from 'react';
import Cards from '../shared/Cards';
import Time from '../shared/Time';
import { useLiveTrackingContext } from '../../Context';

export default function ProductivityTable() {
    const { sessions } = useLiveTrackingContext();
    const [search, setSearch] = useState('');

    const filteredSessions = useMemo(
        () =>
            sessions.filter(session =>
                session.employeeName.toLowerCase().includes(search.toLowerCase()),
            ),
        [search, sessions],
    );

    const employeeGroups = Object.entries(
        filteredSessions
            .filter(session => !session.workType.toLowerCase().includes('qc'))
            .reduce<Record<string, typeof filteredSessions>>((acc, session) => {
                session.categories.forEach(category => {
                    const existingSessions = acc[category] ?? [];
                    acc[category] = [...existingSessions, session];
                });

                return acc;
            }, {}),
    );

    const qcGroups = Object.entries(
        filteredSessions
            .filter(session => session.workType.toLowerCase().includes('qc'))
            .reduce<Record<string, typeof filteredSessions>>((acc, session) => {
                const key = session.workType;
                const existingSessions = acc[key] ?? [];
                acc[key] = [...existingSessions, session];
                return acc;
            }, {}),
    );

    return (
        <div className="space-y-5">
            <Cards
                cards={[
                    {
                        label: 'TOP EMPLOYEE',
                        value: filteredSessions[0]?.employeeName ?? 'N/A',
                        icon: 'TOP',
                        accentClass: 'text-[#34C759]',
                    },
                    {
                        label: 'TOP QC',
                        value:
                            filteredSessions.find(session =>
                                session.workType.toLowerCase().includes('qc'),
                            )?.employeeName ?? 'N/A',
                        icon: 'TOP',
                        accentClass: 'text-[#FF9500]',
                    },
                    {
                        label: 'TOTAL FILES',
                        value: String(
                            filteredSessions.reduce(
                                (sum, session) => sum + session.files.length,
                                0,
                            ),
                        ),
                        icon: 'FIL',
                        accentClass: 'text-[#007AFF]',
                    },
                    {
                        label: 'COMPLETED FILES',
                        value: String(
                            filteredSessions.reduce(
                                (sum, session) =>
                                    sum +
                                    session.files.filter(file => file.status === 'done')
                                        .length,
                                0,
                            ),
                        ),
                        icon: 'OK',
                        accentClass: 'text-[#AF52DE]',
                    },
                ]}
            />

            <div className="grid max-w-[300px] grid-cols-[1fr_auto] gap-2">
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

            <div className="grid gap-4 xl:grid-cols-[1fr_14px_1fr]">
                <section className="space-y-4 xl:col-span-1">
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[16px] text-[#007AFF]">E</span>
                            <p className="text-[14px] font-bold text-[#111318]">
                                EMPLOYEES
                            </p>
                        </div>
                        <div />
                        <div className="rounded-[6px] bg-[#EBF5FF] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#007AFF]">
                            Top Performers
                        </div>
                    </div>

                    {employeeGroups.map(([category, items]) => (
                        <div
                            key={category}
                            className="rounded-[10px] bg-white px-[14px] py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                        >
                            <div className="mb-3 flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[#007AFF]" />
                                <p className="text-[13px] font-bold text-[#111318]">
                                    {category}
                                </p>
                            </div>

                            <div className="mb-1 grid gap-3 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#888888] md:grid-cols-[34px_2.2fr_0.8fr_1.2fr_1fr]">
                                <span className="text-center">#</span>
                                <span>Employee</span>
                                <span className="text-center">Files</span>
                                <span className="text-center">Total Time</span>
                                <span className="text-center">Avg Time</span>
                            </div>

                            <div className="space-y-1">
                                {items.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="grid gap-3 rounded-[6px] border border-transparent px-1 py-[7px] text-[12px] transition hover:border-[#7EA641] md:grid-cols-[34px_2.2fr_0.8fr_1.2fr_1fr]"
                                    >
                                        <p className="text-center text-[#5A6172]">
                                            {index + 1}
                                        </p>
                                        <p className="truncate font-semibold text-[#111318]">
                                            {item.employeeName}
                                        </p>
                                        <p className="text-center font-semibold text-[#7EA641]">
                                            {item.files.length}
                                        </p>
                                        <div className="text-center text-[#5A6172]">
                                            <Time minutes={item.totalTimeMinutes} />
                                        </div>
                                        <div className="text-center text-[#5A6172]">
                                            <Time
                                                minutes={Math.round(
                                                    item.totalTimeMinutes /
                                                        Math.max(item.files.length, 1),
                                                )}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>

                <div className="hidden xl:block" />

                <section className="space-y-4 xl:col-span-1">
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[16px] text-[#34C759]">Q</span>
                            <p className="text-[14px] font-bold text-[#111318]">
                                QC TEAM
                            </p>
                        </div>
                        <div />
                        <div className="rounded-[6px] bg-[#E8F8EF] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#34C759]">
                            Quality Control
                        </div>
                    </div>

                    {qcGroups.map(([category, items]) => (
                        <div
                            key={category}
                            className="rounded-[10px] bg-white px-[14px] py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                        >
                            <div className="mb-3 flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[#34C759]" />
                                <p className="text-[13px] font-bold text-[#111318]">
                                    {category}
                                </p>
                            </div>

                            <div className="mb-1 grid gap-3 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#888888] md:grid-cols-[34px_2.2fr_0.8fr_1.2fr_1fr]">
                                <span className="text-center">#</span>
                                <span>Employee</span>
                                <span className="text-center">Files</span>
                                <span className="text-center">Total Time</span>
                                <span className="text-center">Avg Time</span>
                            </div>

                            <div className="space-y-1">
                                {items.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="grid gap-3 rounded-[6px] border border-transparent px-1 py-[7px] text-[12px] transition hover:border-[#7EA641] md:grid-cols-[34px_2.2fr_0.8fr_1.2fr_1fr]"
                                    >
                                        <p className="text-center text-[#5A6172]">
                                            {index + 1}
                                        </p>
                                        <p className="truncate font-semibold text-[#111318]">
                                            {item.employeeName}
                                        </p>
                                        <p className="text-center font-semibold text-[#007AFF]">
                                            {item.files.length}
                                        </p>
                                        <div className="text-center text-[#5A6172]">
                                            <Time minutes={item.totalTimeMinutes} />
                                        </div>
                                        <div className="text-center text-[#5A6172]">
                                            <Time
                                                minutes={Math.round(
                                                    item.totalTimeMinutes /
                                                        Math.max(item.files.length, 1),
                                                )}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            </div>

            {filteredSessions.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-[#D9DDE4] bg-white px-6 py-10 text-sm text-[#5A6172]">
                    No productivity data found for the current filter.
                </div>
            ) : null}
        </div>
    );
}
