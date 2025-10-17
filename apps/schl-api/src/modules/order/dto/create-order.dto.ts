import { Transform, Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import {
    ORDER_PRIORITIES,
    ORDER_STATUSES,
    ORDER_TYPES,
    type OrderPriority,
    type OrderStatus,
    type OrderType,
} from 'src/common/constants/order.constant';

const toLower = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value;

export class CreateOrderBodyDto {
    @IsString()
    @IsNotEmpty()
    clientCode: string;

    @IsString()
    @IsNotEmpty()
    clientName: string;

    @IsOptional()
    @IsString()
    folder?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    rate?: number | null;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(1000000)
    quantity?: number;

    @IsNotEmpty()
    @IsString()
    downloadDate: string; // YYYY-MM-DD

    @IsOptional()
    @IsString()
    deliveryDate?: string; // YYYY-MM-DD

    @IsOptional()
    @IsString()
    deliveryBdTime?: string; // HH:mm or custom

    @IsNotEmpty()
    @IsString()
    task: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    et?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    production?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    qc1?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    qc2?: number;

    @IsOptional()
    @IsString()
    comment?: string;

    @IsOptional()
    @Transform(toLower)
    @IsEnum(ORDER_TYPES)
    type?: OrderType;

    @IsOptional()
    @Transform(toLower)
    @IsEnum(ORDER_STATUSES)
    status?: OrderStatus;

    @IsOptional()
    @IsString()
    folderPath?: string;

    @IsOptional()
    @Transform(toLower)
    @IsEnum(ORDER_PRIORITIES)
    priority?: OrderPriority;
}
