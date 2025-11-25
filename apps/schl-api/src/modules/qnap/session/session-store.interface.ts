export interface QnapSessionStore {
    getSid(): Promise<string | null>;
    setSid(sid: string | null): Promise<void>;
}
