import { IsIn, IsString } from 'class-validator';

export class SingleApprovalBodyDto {
    @IsString()
    objectId: string;

    @IsIn(['approve', 'reject'])
    response: 'approve' | 'reject';

    @IsString()
    reviewedBy: string;
}
