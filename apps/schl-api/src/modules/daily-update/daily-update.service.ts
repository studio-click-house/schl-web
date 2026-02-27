import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DailyUpdate } from '@repo/common/models/daily-update.schema';
import { Ticket } from '@repo/common/models/ticket.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { hasPerm } from '@repo/common/utils/permission-check';
import { Model } from 'mongoose';
import { CreateDailyUpdateBodyDto } from './dto/create-daily-update.dto';
import { DailyUpdateFactory } from './factories/daily-update.factory';

@Injectable()
export class DailyUpdateService {
    constructor(
        @InjectModel(DailyUpdate.name)
        private readonly dailyUpdateModel: Model<DailyUpdate>,
        @InjectModel(Ticket.name)
        private readonly ticketModel: Model<Ticket>,
    ) {}

    async createDailyUpdate(
        body: CreateDailyUpdateBodyDto,
        userSession: UserSession,
    ) {
        // permission to submit daily work
        if (!hasPerm('ticket:submit_daily_work', userSession.permissions)) {
            throw new ForbiddenException(
                "You don't have permission to submit daily work",
            );
        }

        // if ticket reference provided, validate it
        if (body.ticket) {
            const ticket = await this.ticketModel
                .findById(body.ticket)
                .lean()
                .exec();
            if (!ticket) {
                throw new NotFoundException('Referenced ticket not found');
            }

            // check deadline not passed
            if (ticket.deadline && new Date(ticket.deadline) < new Date()) {
                throw new BadRequestException(
                    'Cannot reference overdue ticket',
                );
            }

            // ticket must be assigned to user or unassigned
            const assignees: any[] = ticket.assignees || [];
            if (assignees.length > 0) {
                const assignedIds = assignees.map(a => String(a.db_id));
                if (!assignedIds.includes(userSession.db_id)) {
                    throw new ForbiddenException('Ticket not assigned to you');
                }
            }
        }

        try {
            const payload = DailyUpdateFactory.fromCreateDto(
                body,
                userSession.db_id,
            );
            const created = await this.dailyUpdateModel.create(payload);
            return created;
        } catch (e) {
            if (e instanceof Error) {
                throw new InternalServerErrorException(
                    'Unable to create daily update',
                );
            }
            throw new InternalServerErrorException(
                'Unable to create daily update',
            );
        }
    }
}
