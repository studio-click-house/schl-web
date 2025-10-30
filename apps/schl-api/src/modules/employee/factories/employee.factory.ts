import { Employee } from '@repo/common/models/employee.schema';
import { CreateEmployeeBodyDto } from '../dto/create-employee.dto';

export class EmployeeFactory {
    static fromCreateDto(dto: CreateEmployeeBodyDto): Partial<Employee> {
        // We are not currently storing updated_by for employee (schema lacks field)
        return {
            e_id: dto.e_id.trim(),
            real_name: dto.real_name.trim(),
            joining_date: dto.joining_date.trim(),
            phone: dto.phone?.trim() || '',
            email: dto.email?.toLowerCase().trim() || '',
            birth_date: dto.birth_date?.trim() || '',
            nid: dto.nid?.trim() || '',
            blood_group: dto.blood_group, // enum validated
            designation: dto.designation.trim(),
            department: dto.department.trim(),
            gross_salary: dto.gross_salary,
            bonus_eid_ul_adha: dto.bonus_eid_ul_adha,
            bonus_eid_ul_fitr: dto.bonus_eid_ul_fitr,
            status: dto.status,
            provident_fund: dto.provident_fund ?? 0,
            pf_start_date: dto.provident_fund
                ? dto.pf_start_date || null
                : null,
            pf_history: [],
            branch: dto.branch?.trim() || '',
            address: dto.address?.trim() || '',
            division: dto.division?.trim() || '',
            company_provided_name: dto.company_provided_name?.trim() || null,
            note: dto.note?.trim() || '',
        } as Partial<Employee>;
    }

    static fromUpdateDto(
        dto: Partial<CreateEmployeeBodyDto>,
    ): Partial<Employee> {
        const patch: Partial<Employee> = {};
        const setStr = (v?: string | null) =>
            v === null ? null : v !== undefined ? v.trim() : undefined;
        if (dto.e_id !== undefined) patch.e_id = dto.e_id.trim();
        if (dto.real_name !== undefined) patch.real_name = dto.real_name.trim();
        if (dto.joining_date !== undefined)
            patch.joining_date = dto.joining_date.trim();
        if (dto.phone !== undefined) patch.phone = dto.phone?.trim() || '';
        if (dto.email !== undefined)
            patch.email = dto.email ? dto.email.toLowerCase().trim() : '';
        if (dto.birth_date !== undefined)
            patch.birth_date = dto.birth_date?.trim() || '';
        if (dto.nid !== undefined) patch.nid = dto.nid?.trim() || '';
        if (dto.blood_group !== undefined) patch.blood_group = dto.blood_group;
        if (dto.designation !== undefined)
            patch.designation = dto.designation.trim();
        if (dto.department !== undefined)
            patch.department = dto.department.trim();
        if (dto.gross_salary !== undefined)
            patch.gross_salary = dto.gross_salary;
        if (dto.bonus_eid_ul_adha !== undefined)
            patch.bonus_eid_ul_adha = dto.bonus_eid_ul_adha;
        if (dto.bonus_eid_ul_fitr !== undefined)
            patch.bonus_eid_ul_fitr = dto.bonus_eid_ul_fitr;
        if (dto.status !== undefined) patch.status = dto.status;
        if (dto.provident_fund !== undefined)
            patch.provident_fund = dto.provident_fund;
        if (dto.pf_start_date !== undefined)
            patch.pf_start_date = dto.pf_start_date || null;
        if (dto.branch !== undefined) patch.branch = dto.branch?.trim() || '';
        if (dto.address !== undefined)
            patch.address = dto.address?.trim() || '';
        if (dto.division !== undefined)
            patch.division = dto.division?.trim() || '';
        if (dto.company_provided_name !== undefined)
            patch.company_provided_name = setStr(
                dto.company_provided_name,
            ) as any; // null allowed
        if (dto.note !== undefined) patch.note = dto.note?.trim() || '';
        return patch;
    }
}
