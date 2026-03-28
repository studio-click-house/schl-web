interface SummaryCardItem {
    label: string;
    value: string;
    icon?: string;
    accentClass?: string;
}

export default function Cards({ cards }: { cards: SummaryCardItem[] }) {
    return (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {cards.map(card => (
                <div
                    key={card.label}
                    className="rounded-[12px] bg-white px-4 py-[14px] shadow-[0_1px_6px_rgba(0,0,0,0.08)]"
                >
                    <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#888888]">
                                {card.label}
                            </p>
                            <p className="mt-2 text-[22px] font-semibold text-[#111318]">
                                {card.value}
                            </p>
                        </div>
                        <span
                            aria-hidden="true"
                            className={`text-[22px] opacity-50 ${
                                card.accentClass ?? 'text-[#111318]'
                            }`}
                        >
                            {card.icon ?? '*'}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
