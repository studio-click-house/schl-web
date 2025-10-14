import { Body, Controller, Post, Req } from '@nestjs/common';
import { UserSession } from 'src/common/types/user-session.type';
import { ApprovalService } from './approval.service';
import { BulkApprovalBodyDto } from './dto/bulk-response.dto';
import { CreateApprovalBodyDto } from './dto/create-approval.dto';
import { SingleApprovalBodyDto } from './dto/single-response.dto';

@Controller('approval')
export class ApprovalController {
    constructor(private readonly approvalService: ApprovalService) {}

    @Post('new-request')
    createApproval(
        @Body() noticeData: CreateApprovalBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.approvalService.createApproval(noticeData, req.user);
    }

    @Post('single-response')
    singleResponse(
        @Body() body: SingleApprovalBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.approvalService.handleSingleResponse({
            objectId: body.objectId,
            response: body.response,
            reviewedBy: body.reviewedBy,
            reviewerSession: req.user,
        });
    }

    @Post('bulk-response')
    bulkResponse(
        @Body() body: BulkApprovalBodyDto,
        @Req() req: Request & { user: UserSession },
    ) {
        return this.approvalService.bulkResponse({
            objectIds: body.objectIds,
            response: body.response,
            reviewedBy: body.reviewedBy,
            reviewerSession: req.user,
        });
    }
}
