interface BadgeProps {
    status: string;
}

type BadgeStyle = {
    dot: string;
    text: string;
    bg: string;
    label: string;
};

const defaultBadgeStyle: BadgeStyle = {
    dot: 'bg-[#9AA0AE]',
    text: 'text-[#5A6172]',
    bg: 'bg-transparent',
    label: 'IDLE',
};

const statusMap: Record<string, BadgeStyle> = {
    working: {
        dot: 'bg-[#34C759]',
        text: 'text-[#5D7C2E]',
        bg: 'bg-transparent',
        label: 'WORKING',
    },
    done: {
        dot: 'bg-[#007AFF]',
        text: 'text-[#2D6FD4]',
        bg: 'bg-transparent',
        label: 'DONE',
    },
    paused: {
        dot: 'bg-[#FF9500]',
        text: 'text-[#D97706]',
        bg: 'bg-transparent',
        label: 'PAUSED',
    },
    walkout: {
        dot: 'bg-[#FF3B30]',
        text: 'text-[#C23B33]',
        bg: 'bg-transparent',
        label: 'WALKOUT',
    },
    idle: defaultBadgeStyle,
};

export default function Badge({ status }: BadgeProps) {
    const key = (status || 'idle').trim().toLowerCase();
    const current: BadgeStyle = statusMap[key] ?? defaultBadgeStyle;

    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full px-1 py-0.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] ${current.bg} ${current.text}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
            {current.label}
        </span>
    );
}
