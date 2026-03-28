'use client';

import { LiveTrackingProvider, useLiveTrackingContext } from './Context';
import type { LiveTrackingTabKey } from './type';
import Filter from './components/shared/Filter';
import ActivityTab from './components/tabs/ActivityTab';
import ClientTab from './components/tabs/ClientTab';
import IdleTab from './components/tabs/IdleTab';
import Production from './components/tabs/Production';
import ProductivityTab from './components/tabs/ProductivityTab';
import Qc from './components/tabs/Qc';
import UserSummaryTab from './components/tabs/UserSummaryTab';

const tabs: Array<{ key: LiveTrackingTabKey; label: string }> = [
    { key: 'client', label: 'CLIENT' },
    { key: 'production', label: 'PRODUCTION' },
    { key: 'qc', label: 'QC' },
    { key: 'activity', label: 'ACTIVITY' },
    { key: 'idle', label: 'IDLE' },
    { key: 'user-summary', label: 'USER SUMMARY' },
    { key: 'productivity', label: 'PRODUCTIVITY' },
];

function LiveTrackingContent() {
    const { activeTab, setActiveTab } = useLiveTrackingContext();

    return (
        <div className="min-h-screen bg-[#ECEEF1]">
            <div className="mx-auto flex w-full max-w-[1680px] flex-col px-6 py-5 lg:px-8">
                <section className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex h-[10px] w-[10px] rounded-full bg-[#34C759]" />
                        <h1 className="text-[18px] font-bold tracking-[0.02em] text-[#111318]">
                            LIVE TRACKING
                        </h1>
                    </div>
                    <div />
                    <Filter />
                </section>

                <section className="mt-[10px]">
                    <div className="flex flex-wrap gap-2">
                        {tabs.map(tab => {
                            const isActive = tab.key === activeTab;

                            return (
                                <button
                                    key={tab.key}
                                    className={`rounded-[10px] border px-4 py-[9px] text-[12px] font-semibold text-[#111318] transition ${
                                        isActive
                                            ? 'border-[#7EA641] bg-white'
                                            : 'border-transparent bg-transparent hover:bg-white/70'
                                    }`}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="mt-5">
                    {activeTab === 'client' && <ClientTab />}
                    {activeTab === 'production' && <Production />}
                    {activeTab === 'qc' && <Qc />}
                    {activeTab === 'activity' && <ActivityTab />}
                    {activeTab === 'idle' && <IdleTab />}
                    {activeTab === 'user-summary' && <UserSummaryTab />}
                    {activeTab === 'productivity' && <ProductivityTab />}
                </section>
            </div>
        </div>
    );
}

export default function LiveTrackingPage() {
    return (
        <LiveTrackingProvider>
            <LiveTrackingContent />
        </LiveTrackingProvider>
    );
}
