import { Report } from '@repo/common/models/report.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import { normalizeEmailListForStorage } from '@repo/common/utils/general-utils';
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
            company_name: dto.companyName.trim(),
            contact_person: dto.contactPerson.trim(),
            contact_number: (dto.contactNumber ?? '').trim(),
            email_address: normalizeEmailListForStorage(dto.emailAddress ?? ''),
            calling_status: (dto.callingStatus ?? '').trim(),
            linkedin: (dto.linkedin ?? '').trim(),
            calling_date_history: [callingDate],
            updated_by: null,
            followup_done: dto.followupDone ?? false,
            is_prospected: dto.isProspected ?? false,
            prospect_status: (dto.prospectStatus ?? '').trim(),
            is_lead: dto.isLead ?? false,
            lead_withdrawn: false,
            client_status: dto.clientStatus ?? 'none',
            lead_origin: dto.leadOrigin ?? null,
            client_code: null,
            test_given_date_history: dto.testJob ? [callingDate] : [],
            onboard_date: '',
        };
    }

    static fromUpdateDto(
        dto: Partial<CreateReportBodyDto>,
        today: string,
        session: UserSession,
    ): {
        $set: Record<string, any>;
        $addToSet?: Record<string, any>;
    } {
        const $set: Record<string, any> = {
            updated_by: session.real_name ?? null,
        };
        const $addToSet: Record<string, any> = {};

        if (dto.callingDate !== undefined && dto.callingDate !== null) {
            $set.calling_date = dto.callingDate;
        }
        if (dto.recall) {
            $addToSet.calling_date_history = today;
        }
        if (dto.followupDate !== undefined)
            $set.followup_date = dto.followupDate ?? '';
        if (dto.country !== undefined && dto.country !== null)
            $set.country = dto.country.trim();
        if (dto.designation !== undefined && dto.designation !== null)
            $set.designation = dto.designation.trim();
        if (dto.website !== undefined && dto.website !== null)
            $set.website = dto.website.trim();
        if (dto.category !== undefined && dto.category !== null)
            $set.category = dto.category.trim();
        if (dto.companyName !== undefined && dto.companyName !== null)
            $set.company_name = dto.companyName.trim();
        if (dto.contactPerson !== undefined && dto.contactPerson !== null)
            $set.contact_person = dto.contactPerson.trim();
        if (dto.contactNumber !== undefined)
            $set.contact_number = (dto.contactNumber ?? '').trim();
        if (dto.emailAddress !== undefined)
            $set.email_address = normalizeEmailListForStorage(
                dto.emailAddress ?? '',
            );
        if (dto.callingStatus !== undefined)
            $set.calling_status = (dto.callingStatus ?? '').trim();
        if (dto.linkedin !== undefined)
            $set.linkedin = (dto.linkedin ?? '').trim();
        if (dto.followupDone !== undefined)
            $set.followup_done = dto.followupDone;
        if (dto.isProspected !== undefined)
            $set.is_prospected = dto.isProspected;
        if (dto.prospectStatus !== undefined)
            $set.prospect_status = (dto.prospectStatus ?? '').trim();
        if (dto.isLead !== undefined) $set.is_lead = dto.isLead;
        if (dto.leadOrigin !== undefined)
            $set.lead_origin = dto.leadOrigin ?? null;
        if (dto.testJob) {
            $addToSet.test_given_date_history = today;
        }
        if (dto.clientStatus !== undefined && dto.clientStatus !== null) {
            $set.client_status = dto.clientStatus;
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
            client_code: null,
            test_given_date_history: [...lead.test_given_date_history],
            onboard_date: '',
            updated_by: updatedBy,
        };
    }
}
