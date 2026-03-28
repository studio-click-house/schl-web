'use client';

import {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { liveTrackingMockData } from './data';
import type {
    LiveTrackingFilters,
    LiveTrackingMockData,
    LiveTrackingSessionItem,
    LiveTrackingTabKey,
    TrackerUserSessionItem,
} from './type';

interface ContextValue {
    activeTab: LiveTrackingTabKey;
    setActiveTab: (tab: LiveTrackingTabKey) => void;
    filters: LiveTrackingFilters;
    setFilters: (updater: Partial<LiveTrackingFilters>) => void;
    resetFilters: () => void;
    data: LiveTrackingMockData;
    sessions: LiveTrackingSessionItem[];
    userSessions: TrackerUserSessionItem[];
    clients: string[];
    users: string[];
    shifts: string[];
}

const defaultFilters: LiveTrackingFilters = {
    client: 'All Clients',
    user: 'All Users',
    shift: 'All Shifts',
    date: '2026-03-26',
};

const LiveTrackingContext = createContext<ContextValue | null>(null);

export function LiveTrackingProvider({ children }: { children: ReactNode }) {
    const [activeTab, setActiveTab] = useState<LiveTrackingTabKey>('client');
    const [filters, setFiltersState] = useState<LiveTrackingFilters>(defaultFilters);

    const data = liveTrackingMockData;

    const sessions = useMemo(
        () =>
            data.sessions.filter(item => {
                const clientMatch =
                    filters.client === 'All Clients' ||
                    item.clientCode === filters.client;
                const userMatch =
                    filters.user === 'All Users' ||
                    item.employeeName === filters.user;
                const shiftMatch =
                    filters.shift === 'All Shifts' || item.shift === filters.shift;

                return clientMatch && userMatch && shiftMatch;
            }),
        [data.sessions, filters.client, filters.shift, filters.user],
    );

    const userSessions = useMemo(
        () =>
            data.userSessions.filter(item => {
                const userMatch =
                    filters.user === 'All Users' || item.username === filters.user;

                return userMatch;
            }),
        [data.userSessions, filters.user],
    );

    const clients = useMemo(
        () => [
            'All Clients',
            ...Array.from(
                new Set([
                    ...data.sessions.map(item => item.clientCode),
                    ...data.clientNof.map(item => item.clientCode),
                ]),
            ).sort(),
        ],
        [data.clientNof, data.sessions],
    );

    const users = useMemo(
        () => [
            'All Users',
            ...Array.from(
                new Set([
                    ...data.sessions.map(item => item.employeeName),
                    ...data.userSessions.map(item => item.username),
                ]),
            ).sort(),
        ],
        [data.sessions, data.userSessions],
    );

    const shifts = useMemo(
        () => ['All Shifts', 'Morning', 'Evening', 'Night'],
        [],
    );

    const value = useMemo<ContextValue>(
        () => ({
            activeTab,
            setActiveTab,
            filters,
            setFilters: updater =>
                setFiltersState(prev => ({
                    ...prev,
                    ...updater,
                })),
            resetFilters: () => setFiltersState(defaultFilters),
            data,
            sessions,
            userSessions,
            clients,
            users,
            shifts,
        }),
        [activeTab, filters, data, sessions, userSessions, clients, users, shifts],
    );

    return (
        <LiveTrackingContext.Provider value={value}>
            {children}
        </LiveTrackingContext.Provider>
    );
}

export function useLiveTrackingContext() {
    const context = useContext(LiveTrackingContext);

    if (!context) {
        throw new Error(
            'useLiveTrackingContext must be used within LiveTrackingProvider',
        );
    }

    return context;
}
