import { CommitLog } from '@repo/common/models/commit-log.schema';
import { UpdateCommitBodyDto } from '../dto/update-commit.dto';

export class CommitLogFactory {
    static fromUpdateDto(
        dto: Partial<UpdateCommitBodyDto>,
    ): Partial<CommitLog> {
        const patch: Partial<CommitLog> = {};
        if (dto.message !== undefined) patch.message = dto.message;
        if (dto.description !== undefined) patch.description = dto.description;
        return patch;
    }
}
