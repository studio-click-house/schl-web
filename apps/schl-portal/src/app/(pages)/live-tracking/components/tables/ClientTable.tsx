import Cards from '../shared/Cards';
import Time from '../shared/Time';
import { useLiveTrackingContext } from '../../Context';

function formatClock(value: string | null) {
    if (!value) {
        return '--:--';
    }

    return value.slice(11, 16);
}

export default function ClientTable() {
    const { data, sessions } = useLiveTrackingContext();

    const clientRows = data.clientNof.map(client => {
        const clientSessions = sessions.filter(
            session => session.clientCode === client.clientCode,
        );
        const totalCompleted = clientSessions.reduce(
            (sum, session) =>
                sum + session.files.filter(file => file.status === 'done').length,
            0,
        );

        return {
            clientCode: client.clientCode,
            activeEmployees: new Set(clientSessions.map(item => item.employeeName)).size,
            categories: Array.from(
                new Set(clientSessions.flatMap(item => item.categories)),
            ),
            productionDone: clientSessions.reduce(
                (sum, session) =>
                    sum +
                    session.files.filter(
                        file =>
                            file.status === 'done' &&
                            !session.workType.toLowerCase().includes('qc'),
                    ).length,
                0,
            ),
            qcDone: clientSessions.reduce(
                (sum, session) =>
                    sum +
                    session.files.filter(
                        file =>
                            file.status === 'done' &&
                            session.workType.toLowerCase().includes('qc'),
                    ).length,
                0,
            ),
            nof: client.nof,
            estimateMinutes: clientSessions.reduce(
                (sum, session) => sum + session.estimateTimeMinutes,
                0,
            ),
            totalMinutes: clientSessions.reduce(
                (sum, session) => sum + session.totalTimeMinutes,
                0,
            ),
            averageMinutes:
                totalCompleted > 0
                    ? Math.round(
                          clientSessions.reduce(
                              (sum, session) => sum + session.totalTimeMinutes,
                              0,
                          ) / totalCompleted,
                      )
                    : 0,
            startAt:
                clientSessions.map(session => session.createdAt).sort()[0] ?? null,
            endAt: (() => {
                const sortedValues = clientSessions
                    .map(session => session.updatedAt)
                    .sort();
                return sortedValues[sortedValues.length - 1] ?? null;
            })(),
            isActive: clientSessions.length > 0,
        };
    });

    const activeClients = clientRows.filter(item => item.isActive);
    const inactiveClients = clientRows.filter(item => !item.isActive);

    return (
        <div className="space-y-5">
            <Cards
                cards={[
                    {
                        label: 'ACTIVE CLIENTS',
                        value: String(activeClients.length),
                        icon: 'CLI',
                        accentClass: 'text-[#007AFF]',
                    },
                    {
                        label: 'TOTAL EMPLOYEES',
                        value: String(
                            activeClients.reduce(
                                (sum, item) => sum + item.activeEmployees,
                                0,
                            ),
                        ),
                        icon: 'USR',
                        accentClass: 'text-[#34C759]',
                    },
                    {
                        label: 'FILES COMPLETED',
                        value: String(
                            activeClients.reduce(
                                (sum, item) =>
                                    sum + item.productionDone + item.qcDone,
                                0,
                            ),
                        ),
                        icon: 'OK',
                        accentClass: 'text-[#AF52DE]',
                    },
                    {
                        label: 'TOTAL TIME SPENT',
                        value: `${activeClients.reduce(
                            (sum, item) => sum + item.totalMinutes,
                            0,
                        )}m`,
                        icon: 'SUM',
                        accentClass: 'text-[#FF9500]',
                    },
                ]}
            />

            <div className="rounded-[9px] border border-[#ECEEF2] bg-[#F9FAFB] px-[14px] py-[10px]">
                <div className="grid items-center gap-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#888888] md:grid-cols-[1.7fr_1.1fr_1.3fr_0.8fr_0.8fr_0.7fr_0.8fr_0.9fr_0.9fr_0.9fr_0.9fr]">
                    <span>Client</span>
                    <span className="text-center">Employees</span>
                    <span className="text-center">Categories</span>
                    <span className="text-center">Prod Done</span>
                    <span className="text-center">QC Done</span>
                    <span className="text-center">NOF</span>
                    <span className="text-center">ET Time</span>
                    <span className="text-center">Total Time</span>
                    <span className="text-center">Avg Time</span>
                    <span className="text-center">Start Time</span>
                    <span className="text-center">End Time</span>
                </div>
            </div>

            <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 px-1">
                    <div className="flex items-center gap-2 rounded-full bg-[#177EA641] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#111318]">
                        <span className="h-[7px] w-[7px] rounded-full bg-[#7EA641]" />
                        Working Clients
                    </div>
                    <div className="rounded-full bg-[#177EA641] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#111318]">
                        {activeClients.length} Working
                    </div>
                </div>

                <div className="overflow-hidden rounded-[9px] border border-[#ECEEF2] bg-white">
                    {activeClients.map(item => (
                        <div
                            key={item.clientCode}
                            className="grid items-center gap-4 border-b border-[#ECEEF2] px-[14px] py-[8px] text-[12px] last:border-b-0 hover:bg-[#177EA641] md:grid-cols-[1.7fr_1.1fr_1.3fr_0.8fr_0.8fr_0.7fr_0.8fr_0.9fr_0.9fr_0.9fr_0.9fr]"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="h-[7px] w-[7px] rounded-full bg-[#7EA641]" />
                                <p className="truncate text-[13px] font-semibold text-[#111318]">
                                    {item.clientCode}
                                </p>
                            </div>
                            <div className="flex justify-center">
                                <span className="rounded-full bg-[#EBF2FF] px-[10px] py-[2px] text-[11.5px] font-semibold text-[#2D6FD4]">
                                    {item.activeEmployees}
                                </span>
                            </div>
                            <div className="flex justify-center">
                                <span className="max-w-[180px] truncate rounded-[4px] bg-[#F9FAFB] px-[7px] py-[2px] text-[11px] text-[#5A6172]">
                                    {item.categories.join(', ') || '--'}
                                </span>
                            </div>
                            <p className="text-center font-mono text-[11.5px] font-semibold text-[#5D7C2E]">
                                {item.productionDone}
                            </p>
                            <p className="text-center font-mono text-[11.5px] font-semibold text-[#2D6FD4]">
                                {item.qcDone}
                            </p>
                            <p className="text-center font-mono text-[11.5px] font-semibold text-[#D97706]">
                                {item.nof}
                            </p>
                            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                <Time minutes={item.estimateMinutes} />
                            </p>
                            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                <Time minutes={item.totalMinutes} />
                            </p>
                            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                <Time minutes={item.averageMinutes} />
                            </p>
                            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                {formatClock(item.startAt)}
                            </p>
                            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                --
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 px-1">
                    <div className="flex items-center gap-2 rounded-full border border-[#ECEEF2] bg-[#F9FAFB] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5A6172]">
                        <span className="h-[7px] w-[7px] rounded-full bg-[#9AA0AE]" />
                        Not Working Clients
                    </div>
                    <div className="rounded-full border border-[#ECEEF2] bg-[#F9FAFB] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5A6172]">
                        {inactiveClients.length} Clients
                    </div>
                </div>

                <div className="overflow-hidden rounded-[9px] border border-[#ECEEF2] bg-white">
                    {inactiveClients.map(item => (
                        <div
                            key={item.clientCode}
                            className="grid items-center gap-4 border-b border-[#ECEEF2] px-[14px] py-[8px] text-[12px] opacity-60 last:border-b-0 md:grid-cols-[1.7fr_1.1fr_1.3fr_0.8fr_0.8fr_0.7fr_0.8fr_0.9fr_0.9fr_0.9fr_0.9fr]"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="h-[7px] w-[7px] rounded-full bg-[#9AA0AE]" />
                                <p className="truncate text-[13px] font-semibold text-[#5A6172]">
                                    {item.clientCode}
                                </p>
                            </div>
                            <div className="flex justify-center">
                                <span className="rounded-full bg-[#F9FAFB] px-[10px] py-[2px] text-[11.5px] font-semibold text-[#9AA0AE]">
                                    {item.activeEmployees}
                                </span>
                            </div>
                            <div className="flex justify-center">
                                <span className="max-w-[180px] truncate rounded-[4px] bg-[#F9FAFB] px-[7px] py-[2px] text-[11px] text-[#5A6172]">
                                    {item.categories.join(', ') || '--'}
                                </span>
                            </div>
                            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                {item.productionDone}
                            </p>
                            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                {item.qcDone}
                            </p>
                            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                {item.nof}
                            </p>
                            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                --
                            </p>
                            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                --
                            </p>
                            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                --
                            </p>
                            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                {formatClock(item.startAt)}
                            </p>
                            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                                {formatClock(item.endAt)}
                            </p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
