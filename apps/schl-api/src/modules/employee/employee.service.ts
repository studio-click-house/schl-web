import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Employee } from '@repo/common/models/employee.schema';
import { UserSession } from '@repo/common/types/user-session.type';
import {
    calculateSalaryComponents,
    getPFMoneyAmount,
} from '@repo/common/utils/account-helpers';
import { getTodayDate } from '@repo/common/utils/date-helpers';
import {
    addIfDefined,
    buildOrRegex,
    createRegexQuery,
} from '@repo/common/utils/filter-helpers';
import { hasAnyPerm, hasPerm } from '@repo/common/utils/permission-check';
import { FilterQuery, Model } from 'mongoose';
import { CreateEmployeeBodyDto } from './dto/create-employee.dto';
import { SearchEmployeesBodyDto } from './dto/search-employees.dto';
import { EmployeeFactory } from './factories/employee.factory';

type QueryShape = FilterQuery<Employee>;

@Injectable()
export class EmployeeService {
    constructor(
        @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    ) {}

    async createEmployee(
        employeeData: CreateEmployeeBodyDto,
        userSession: UserSession,
    ) {
        const canCreate = hasPerm(
            'admin:create_employee',
            userSession.permissions,
        );
        if (!canCreate) {
            throw new ForbiddenException(
                "You don't have permission to create employees",
            );
        }

        const e_id = employeeData.eId.trim();

        const payload = EmployeeFactory.fromCreateDto({
            ...employeeData,
            eId: e_id,
        });

        try {
            const created = await this.employeeModel.create(payload);
            if (!created) {
                throw new InternalServerErrorException(
                    'Failed to create employee',
                );
            }
            return created;
        } catch (err: any) {
            if (err instanceof HttpException) throw err;
            if (err?.code === 11000) {
                // Handle race condition duplicate
                throw new ConflictException(
                    'Employee with the provided ID already exists',
                );
            }
            throw new InternalServerErrorException(
                'Unable to create employee at this time',
            );
        }
    }

    async updateEmployee(
        employeeId: string,
        employeeData: Partial<CreateEmployeeBodyDto>,
        userSession: UserSession,
    ) {
        const canManage = hasPerm(
            'accountancy:manage_employee',
            userSession.permissions,
        );

        if (!canManage) {
            throw new ForbiddenException(
                "You don't have permission to update employees",
            );
        }

        const existing = await this.employeeModel.findById(employeeId).exec();
        if (!existing) {
            throw new NotFoundException('Employee not found');
        }

        // Keep a snapshot of original values needed for pf history logic
        const original = {
            gross_salary: existing.gross_salary,
            provident_fund: existing.provident_fund || 0,
            pf_history: existing.pf_history || [],
            pf_start_date: existing.pf_start_date,
        } as Pick<
            Employee,
            'gross_salary' | 'provident_fund' | 'pf_history' | 'pf_start_date'
        >;

        if (
            employeeData.grossSalary !== undefined &&
            employeeData.grossSalary < 0
        ) {
            throw new BadRequestException('Gross salary cannot be negative');
        }
        if (
            employeeData.providentFund !== undefined &&
            employeeData.providentFund < 0
        ) {
            throw new BadRequestException(
                'Provident fund percentage cannot be negative',
            );
        }

        const patch = EmployeeFactory.fromUpdateDto(employeeData);
        // Apply patch to existing doc
        Object.assign(existing, patch);

        const grossChanged =
            employeeData.grossSalary !== undefined &&
            employeeData.grossSalary !== original.gross_salary;
        const pfChanged =
            employeeData.providentFund !== undefined &&
            employeeData.providentFund !== original.provident_fund;

        // If either changed, append pf_history record based on ORIGINAL values
        if (grossChanged || pfChanged) {
            const salaryComponents = calculateSalaryComponents(
                original.gross_salary,
            );
            const totalSavedAmount = getPFMoneyAmount(
                salaryComponents,
                // Construct a lightweight Employee-like object for computation
                {
                    provident_fund: original.provident_fund,
                    pf_history: original.pf_history,
                    pf_start_date: original.pf_start_date,
                } as Employee,
            );

            if (!Array.isArray(existing.pf_history)) {
                existing.pf_history = [];
            }
            existing.pf_history.push({
                date: getTodayDate(),
                gross: original.gross_salary || 0,
                provident_fund: original.provident_fund || 0,
                saved_amount: totalSavedAmount || 0,
                note: pfChanged
                    ? 'Provident fund percentage was updated.'
                    : 'Gross salary was updated.',
            });
        }

        try {
            const saved = await existing.save();
            return saved;
        } catch (err: any) {
            if (err instanceof HttpException) throw err;
            if (err?.code === 11000) {
                throw new ConflictException(
                    'Employee with the provided ID already exists',
                );
            }
            throw new InternalServerErrorException(
                'Unable to update employee at this time',
            );
        }
    }

    async searchEmployees(
        filters: SearchEmployeesBodyDto,
        pagination: {
            page: number;
            itemsPerPage: number;
            // filtered: boolean;
            paginated: boolean;
        },
        userSession: UserSession,
    ) {
        // Basic permission: viewing employees could map to manage or create permission
        const canView = hasAnyPerm(
            [
                'accountancy:manage_employee',
                'crm:view_reports',
                'crm:view_leads',
            ],
            userSession.permissions,
        );
        if (!canView) {
            throw new ForbiddenException(
                "You don't have permission to view employees",
            );
        }

        const {
            page,
            itemsPerPage,
            // filtered,
            paginated,
        } = pagination;
        const {
            bloodGroup,
            designation,
            department,
            status,
            serviceTime,
            generalSearchString,
        } = filters;

        // interface QueryShape {
        //     joining_date?: {
        //         $gte?: string;
        //         $lte?: string;
        //         $lt?: string;
        //         $gt?: string;
        //     };
        //     blood_group?: string | { $regex: string; $options: string };
        //     designation?: string | { $regex: string; $options: string };
        //     status?: string | { $regex: string; $options: string };
        //     department?: string | { $regex: string; $options: string };
        //     $or?: Record<string, any>[];
        // }

        const query: QueryShape = {};
        addIfDefined(
            query,
            'blood_group',
            createRegexQuery(bloodGroup, { exact: true }),
        );
        addIfDefined(query, 'designation', createRegexQuery(designation));
        addIfDefined(
            query,
            'department',
            createRegexQuery(department, { exact: true }),
        );
        addIfDefined(
            query,
            'status',
            createRegexQuery(status, { exact: true }),
        );

        if (serviceTime) {
            // Build date boundaries relative to today (UTC) using native Date
            const now = new Date();
            const y = now.getUTCFullYear();
            const m = `${now.getUTCMonth() + 1}`.padStart(2, '0');
            const d = `${now.getUTCDate()}`.padStart(2, '0');
            const yearMinus = (n: number) => `${y - n}-${m}-${d}`;
            switch (serviceTime) {
                case 'lessThan1Year':
                    query.joining_date = { $gt: yearMinus(1) };
                    break;
                case 'atLeast1Year':
                    query.joining_date = { $lte: yearMinus(1) };
                    break;
                case 'atLeast2Years':
                    query.joining_date = { $lte: yearMinus(2) };
                    break;
                case 'atLeast3Years':
                    query.joining_date = { $lte: yearMinus(3) };
                    break;
                case 'moreThan3Years':
                    query.joining_date = { $lt: yearMinus(3) };
                    break;
            }
        }

        const searchQuery: QueryShape = { ...query };

        console.log('searchQuery', searchQuery);

        // if (
        //     filtered &&
        //     !bloodGroup &&
        //     !designation &&
        //     !department &&
        //     !status &&
        //     !serviceTime &&
        //     !generalSearchString
        // ) {
        //     throw new ForbiddenException('No filter applied');
        // }

        if (generalSearchString) {
            const or = buildOrRegex(generalSearchString, [
                'e_id',
                'company_provided_name',
                'real_name',
                'nid',
            ]);
            if (or.length > 0) searchQuery.$or = or;
        }

        const skip = (page - 1) * itemsPerPage;

        // Aggregation to add priority & potential permanence info (simplified)
        const pipeline: any[] = [
            { $match: searchQuery },
            {
                $addFields: {
                    // Determine priority similar to provided logic (normalize status to lowercase)
                    priority: {
                        $switch: {
                            branches: [
                                {
                                    case: { $eq: ['$status', 'active'] },
                                    then: 1,
                                },
                                {
                                    case: { $eq: ['$status', 'inactive'] },
                                    then: 2,
                                },
                                {
                                    case: { $eq: ['$status', 'fired'] },
                                    then: 3,
                                },
                                {
                                    case: { $eq: ['$status', 'resigned'] },
                                    then: 4,
                                },
                            ],
                            default: 5,
                        },
                    },
                },
            },
            { $sort: { priority: 1, e_id: 1 } },
            { $project: { priority: 0 } },
        ];

        // Count always executed (kept simple; could skip when !paginated if size not needed)
        let count = 0;
        try {
            count = await this.employeeModel.countDocuments(
                searchQuery as Record<string, unknown>,
            );
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to retrieve employees',
            );
        }

        if (paginated) {
            pipeline.push({ $skip: skip }, { $limit: itemsPerPage });
        }

        try {
            const items: Employee[] = await this.employeeModel
                .aggregate(pipeline)
                .exec();
            if (!items) {
                throw new InternalServerErrorException(
                    'Unable to retrieve employees',
                );
            }
            if (!paginated) return items;
            return {
                pagination: {
                    count,
                    pageCount: Math.ceil(count / itemsPerPage),
                },
                items,
            };
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to retrieve employees',
            );
        }
    }

    async getEmployeeByDbId(employeeId: string, userSession: UserSession) {
        const canView = hasPerm(
            'accountancy:manage_employee',
            userSession.permissions,
        );
        if (!canView) {
            throw new ForbiddenException(
                "You don't have permission to view employee details",
            );
        }

        try {
            const found = await this.employeeModel.findById(employeeId).exec();
            if (!found) {
                throw new BadRequestException('Employee not found');
            }
            return found;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to retrieve employee',
            );
        }
    }

    async getEmployeeById(e_id: string, userSession: UserSession) {
        const canView = hasAnyPerm(
            ['accountancy:manage_employee', 'settings:view_page'],
            userSession.permissions,
        );

        if (!canView) {
            throw new ForbiddenException(
                "You don't have permission to view employee details",
            );
        }

        const id = e_id.trim();
        try {
            const found = await this.employeeModel.findOne({ e_id: id }).exec();
            console.log('Found employee:', found);
            if (!found) {
                throw new BadRequestException('Employee not found');
            }
            return found;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException(
                'Unable to retrieve employee',
            );
        }
    }
}
