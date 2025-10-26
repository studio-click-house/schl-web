type ChangeValue = unknown;

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
    Object.keys(oldObj).forEach(key => {
        const oldValue = oldObj[key];
        const newValue = newObj[key];
        if (Array.isArray(oldValue) && Array.isArray(newValue)) {
            const oldSet = new Set(oldValue.map(item => JSON.stringify(item)));
            const newSet = new Set(newValue.map(item => JSON.stringify(item)));
            const added = newValue.filter(
                item => !oldSet.has(JSON.stringify(item)),
            );
            const removed = oldValue.filter(
                item => !newSet.has(JSON.stringify(item)),
            );
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
