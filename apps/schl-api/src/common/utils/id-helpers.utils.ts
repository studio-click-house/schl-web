import { Types } from 'mongoose';

export function toObjectId(
    id?: string | Types.ObjectId | null,
): Types.ObjectId | undefined {
    if (!id) return undefined;
    if (id instanceof Types.ObjectId) return id;
    try {
        return new Types.ObjectId(id);
    } catch {
        return undefined;
    }
}
