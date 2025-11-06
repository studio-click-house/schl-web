/* eslint-disable @typescript-eslint/no-explicit-any */
type ChangeValue = any;

export type Change =
    | { field: string; oldValue: ChangeValue; newValue: ChangeValue } // Non-array case
    | {
          field: string;
          oldValue: ChangeValue[];
          newValue: ChangeValue[];
          arrayChanges: { added: ChangeValue[]; removed: ChangeValue[] };
      }; // Array case

export function getObjectChanges(
    oldObj: Record<string, ChangeValue>,
    newObj: Record<string, ChangeValue>,
): Change[] {
    const changes: Change[] = [];

    const buildMultisetMap = (arr: ChangeValue[]) => {
        const map = new Map<string, { count: number; items: ChangeValue[] }>();

        arr.forEach(item => {
            const key = JSON.stringify(item);
            const existing = map.get(key);

            if (existing) {
                existing.count += 1;
                existing.items.push(item);
            } else {
                map.set(key, { count: 1, items: [item] });
            }
        });

        return map;
    };
    const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    keys.forEach(key => {
        const oldValue = oldObj[key];
        const newValue = newObj[key];
        if (Array.isArray(oldValue) && Array.isArray(newValue)) {
            const oldMap = buildMultisetMap(oldValue);
            const newMap = buildMultisetMap(newValue);

            const added: ChangeValue[] = [];
            newMap.forEach((data, key) => {
                const oldCount = oldMap.get(key)?.count ?? 0;

                if (data.count > oldCount) {
                    added.push(...data.items.slice(oldCount));
                }
            });

            const removed: ChangeValue[] = [];
            oldMap.forEach((data, key) => {
                const newCount = newMap.get(key)?.count ?? 0;

                if (data.count > newCount) {
                    removed.push(...data.items.slice(newCount));
                }
            });
            if (added.length > 0 || removed.length > 0) {
                changes.push({
                    field: key,
                    oldValue,
                    newValue,
                    arrayChanges: { added, removed },
                });
            }
        } else if (oldValue !== newValue) {
            changes.push({ field: key, oldValue, newValue });
        }
    });
    return changes;
}
