interface TimeProps {
    minutes: number;
}

export default function Time({ minutes }: TimeProps) {
    const totalMinutes = Math.max(0, Math.floor(minutes || 0));
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (hours > 0 && remainingMinutes > 0) {
        return <span>{`${hours}h ${remainingMinutes}m`}</span>;
    }

    if (hours > 0) {
        return <span>{`${hours}h`}</span>;
    }

    return <span>{`${remainingMinutes}m`}</span>;
}
