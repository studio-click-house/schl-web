import { Injectable, Logger } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Cron } from '@nestjs/schedule';

import { ShiftTemplate } from '@repo/common/models/shift-template.schema';

import * as moment from 'moment-timezone';

import { Model } from 'mongoose';

@Injectable()
export class ShiftPlanSchedulerService {
    private readonly logger = new Logger(ShiftPlanSchedulerService.name);

    constructor(
        @InjectModel(ShiftTemplate.name)
        private shiftTemplateModel: Model<ShiftTemplate>,
    ) {}

    @Cron('0 0 * * *', { timeZone: 'Asia/Dhaka' }) // Run daily at midnight
    async deactivatePastShifts() {
        this.logger.log('Starting daily past shift deactivation...');

        try {
            const today = moment.tz('Asia/Dhaka').startOf('day').toDate();

            const result = await this.shiftTemplateModel.updateMany(
                {
                    active: true,

                    effective_to: { $lt: today },
                },

                { $set: { active: false } },
            );

            this.logger.log(
                `Deactivated ${result.modifiedCount} past shift template(s).`,
            );
        } catch (err) {
            this.logger.error('Failed to deactivate past shifts', err);
        }
    }
}
