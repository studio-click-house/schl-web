import { Report } from '@repo/common/models/report.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { CreateReportBodyDto } from '../dto/create-report.dto';

export class ReportFactory {
    static fromCreateDto(
        dto: CreateReportBodyDto,
        session: UserSession,
        marketerName: string,
    ): Partial<Report> & Record<string, any> {
        const callingDate = dto.callingDate;
        return {
            marketer_id: session.db_id,
            marketer_name: marketerName,
            calling_date: callingDate,
            followup_date: dto.followupDate ?? '',
            country: dto.country.trim(),
            designation: dto.designation.trim(),
            website: dto.website.trim(),
            category: dto.category.trim(),
            company_name: dto.company.trim(),
            contact_person: dto.contactPerson.trim(),
            contact_number: (dto.contactNumber ?? '').trim(),
            email_address: (dto.email ?? '').toLowerCase().trim(),
            calling_status: (dto.status ?? '').trim(),
            linkedin: (dto.linkedin ?? '').trim(),
            calling_date_history: [callingDate],
            updated_by: null,
            followup_done: dto.followupDone ?? false,
            is_prospected: dto.prospecting ?? false,
            prospect_status: (dto.prospectingStatus ?? '').trim(),
            is_lead: dto.newLead ?? false,
            lead_withdrawn: false,
            client_status: 'none',
            lead_origin: dto.leadOrigin ?? null,
            test_given_date_history: dto.testJob ? [callingDate] : [],
            onboard_date: '',
        };
    }

    static fromUpdateDto(
        dto: Partial<CreateReportBodyDto>,
        session: UserSession,
    ): {
        $set: Record<string, any>;
        $addToSet?: Record<string, any>;
    } {
        const $set: Record<string, any> = { updated_by: session.db_id };
        const $addToSet: Record<string, any> = {};

        if (dto.callingDate !== undefined) {
            $set.calling_date = dto.callingDate;
            $addToSet.calling_date_history = dto.callingDate;
        }
        if (dto.followupDate !== undefined)
            $set.followup_date = dto.followupDate ?? '';
        if (dto.country !== undefined) $set.country = dto.country.trim();
        if (dto.designation !== undefined)
            $set.designation = dto.designation.trim();
        if (dto.website !== undefined) $set.website = dto.website.trim();
        if (dto.category !== undefined) $set.category = dto.category.trim();
        if (dto.company !== undefined) $set.company_name = dto.company.trim();
        if (dto.contactPerson !== undefined)
            $set.contact_person = dto.contactPerson.trim();
        if (dto.contactNumber !== undefined)
            $set.contact_number = (dto.contactNumber ?? '').trim();
        if (dto.email !== undefined)
            $set.email_address = (dto.email ?? '').toLowerCase().trim();
        if (dto.status !== undefined)
            $set.calling_status = (dto.status ?? '').trim();
        if (dto.linkedin !== undefined)
            $set.linkedin = (dto.linkedin ?? '').trim();
        if (dto.followupDone !== undefined)
            $set.followup_done = dto.followupDone;
        if (dto.prospecting !== undefined) $set.is_prospected = dto.prospecting;
        if (dto.prospectingStatus !== undefined)
            $set.prospect_status = (dto.prospectingStatus ?? '').trim();
        if (dto.newLead !== undefined) $set.is_lead = dto.newLead;
        if (dto.leadOrigin !== undefined)
            $set.lead_origin = dto.leadOrigin ?? null;
        if (dto.testJob && dto.callingDate) {
            $addToSet.test_given_date_history = dto.callingDate;
        }

        const update: {
            $set: Record<string, any>;
            $addToSet?: Record<string, any>;
        } = { $set };
        if (Object.keys($addToSet).length) update.$addToSet = $addToSet;
        return update;
    }

    static fromLeadToReportDoc(
        lead: Report,
        today: string,
        updatedBy: string,
    ): Partial<Report> & Record<string, any> {
        return {
            calling_date: today,
            followup_date: lead.followup_date || '',
            country: lead.country,
            website: lead.website,
            category: lead.category,
            company_name: lead.company_name,
            contact_person: lead.contact_person,
            designation: lead.designation,
            contact_number: lead.contact_number || '',
            email_address: lead.email_address || '',
            calling_status: lead.calling_status || '',
            calling_date_history: [today],
            linkedin: lead.linkedin || '',
            marketer_id: lead.marketer_id,
            marketer_name: lead.marketer_name,
            is_prospected: lead.is_prospected || false,
            prospect_status: lead.prospect_status || '',
            is_lead: false,
            lead_withdrawn: true,
            followup_done: lead.followup_done || false,
            client_status: lead.client_status || 'none',
            lead_origin: lead.lead_origin || null,
            test_given_date_history: lead.test_given_date_history || [],
            onboard_date: '',
            updated_by: updatedBy,
        };
    }
}
