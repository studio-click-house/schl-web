'use client';

import { useLiveTrackingContext } from '../../Context';

function FilterSelect({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
}) {
    return (
        <label className="flex h-8 items-center rounded-[10px] border border-[#D9DDE4] bg-white px-1">
            <span className="px-2 text-[12px] font-semibold text-[#7EA641]">
                {label}
            </span>
            <select
                className="h-[30px] min-w-[112px] rounded-[10px] border-0 bg-transparent px-1 text-[12px] font-medium text-[#111318] outline-none"
                value={value}
                onChange={event => onChange(event.target.value)}
            >
                {options.map(item => (
                    <option key={item} value={item}>
                        {item}
                    </option>
                ))}
            </select>
        </label>
    );
}

export default function Filter() {
    const { filters, setFilters, resetFilters, clients, users, shifts } =
        useLiveTrackingContext();

    return (
        <div className="flex flex-wrap items-center justify-end gap-[10px]">
            <button
                className="flex h-7 w-7 items-center justify-center rounded-full border border-transparent bg-transparent text-[15px] text-[#111318] transition hover:bg-white"
                type="button"
                onClick={resetFilters}
                aria-label="Reload"
                title="Reload"
            >
                R
            </button>

            <FilterSelect
                label="C"
                value={filters.client}
                options={clients}
                onChange={value => setFilters({ client: value })}
            />

            <FilterSelect
                label="U"
                value={filters.user}
                options={users}
                onChange={value => setFilters({ user: value })}
            />

            <FilterSelect
                label="S"
                value={filters.shift}
                options={shifts}
                onChange={value => setFilters({ shift: value })}
            />

            <label className="flex h-8 items-center rounded-[10px] border border-[#D9DDE4] bg-white px-2">
                <span className="px-2 text-[12px] font-semibold text-[#7EA641]">
                    D
                </span>
                <input
                    className="h-[30px] rounded-[10px] border-0 bg-transparent px-1 text-[12px] font-medium text-[#111318] outline-none"
                    type="date"
                    value={filters.date}
                    onChange={event => setFilters({ date: event.target.value })}
                />
            </label>
        </div>
    );
}
