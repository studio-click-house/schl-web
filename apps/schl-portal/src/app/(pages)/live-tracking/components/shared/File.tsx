import Badge from './Badge';
import type { LiveTrackingFileItem } from '../../type';

export default function File({ file }: { file: LiveTrackingFileItem }) {
    const start = file.startedAt.slice(11, 16);
    const end = file.completedAt ? file.completedAt.slice(11, 16) : '--:--';

    return (
        <div className="grid items-center gap-4 border-b border-[#ECEEF2] px-[14px] py-[10px] text-[12px] last:border-b-0 md:grid-cols-[2.2fr_1.1fr_0.7fr_1.2fr_0.8fr_0.9fr]">
            <p className="truncate font-semibold text-[#111318]">{file.fileName}</p>
            <div className="flex justify-center">
                <Badge status={file.status} />
            </div>
            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                {file.timeSpentMinutes}m
            </p>
            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                {start}
            </p>
            <p className="text-center font-mono text-[11.5px] text-[#5A6172]">
                {end}
            </p>
            <p className="text-center text-[#5A6172]">{file.report || '--'}</p>
        </div>
    );
}
