import { useState } from 'react';
import File from './File';
import type { LiveTrackingSessionItem } from '../../type';

function formatClock(value: string | null) {
    if (!value) {
        return '--:--';
    }

    return value.slice(11, 16);
}

export default function Session({
    session,
    mode,
}: {
    session: LiveTrackingSessionItem;
    mode: 'production' | 'qc';
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const completedFiles = session.files.filter(file => file.status === 'done').length;
    const averageMinutes =
        session.files.length > 0
            ? Math.round(session.totalTimeMinutes / session.files.length)
            : 0;
    const isOverEstimate = averageMinutes > session.estimateTimeMinutes;

    return (
        <div className="overflow-hidden">
            <button
                className="group grid w-full items-center gap-4 border-b border-[#ECEEF2] px-[14px] py-[9px] text-left transition hover:bg-[#177EA641] md:grid-cols-[2.2fr_1.1fr_0.7fr_1.2fr_0.8fr_0.9fr_0.9fr_0.9fr_0.9fr]"
                type="button"
                onClick={() => setIsExpanded(prev => !prev)}
            >
                <div className="flex min-w-0 items-center">
                    <span className="mr-3 text-[10px] text-[#9AA0AE] transition group-hover:text-[#7EA641]">
                        {isExpanded ? 'v' : '>'}
                    </span>
                    <span className="mr-2 h-[7px] w-[7px] rounded-full bg-[#7EA641]" />
                    <span className="truncate text-[13px] font-semibold text-[#111318]">
                        {session.employeeName}
                    </span>
                </div>
                <p className="text-center text-[13px] text-[#111318]">
                    {mode === 'qc' ? session.workType : 'Production'}
                </p>
                <p className="text-center text-[13px] text-[#111318]">{session.shift}</p>
                <div className="flex justify-center">
                    <span className="max-w-[180px] truncate rounded-[4px] bg-[#F9FAFB] px-[7px] py-[2px] text-[11px] font-medium text-[#5A6172]">
                        {session.categories.join(', ')}
                    </span>
                </div>
                <p className="text-center font-mono text-[11.5px] font-semibold text-[#5D7C2E]">
                    {completedFiles}/{session.files.length}
                </p>
                <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                    {session.totalTimeMinutes}m
                </p>
                <p
                    className={`text-center font-mono text-[11.5px] ${
                        isOverEstimate
                            ? 'font-bold text-[#E53935]'
                            : 'text-[#5A6172]'
                    }`}
                >
                    {averageMinutes}m
                </p>
                <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                    {formatClock(session.createdAt)}
                </p>
                <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                    {formatClock(session.updatedAt)}
                </p>
            </button>

            {isExpanded ? (
                <div className="bg-white">
                    <div className="grid items-center gap-4 border-b border-[#ECEEF2] bg-[#F9FAFB] px-[14px] py-[10px] text-[11px] font-bold uppercase tracking-[0.12em] text-[#888888] md:grid-cols-[2.2fr_1.1fr_0.7fr_1.2fr_0.8fr_0.9fr]">
                        <span>File Name</span>
                        <span className="text-center">Status</span>
                        <span className="text-center">Time On</span>
                        <span className="text-center">Start Time</span>
                        <span className="text-center">End Time</span>
                        <span className="text-center">Report</span>
                    </div>
                    {session.files.map(file => (
                        <File key={file.id} file={file} />
                    ))}
                </div>
            ) : null}
        </div>
    );
}
