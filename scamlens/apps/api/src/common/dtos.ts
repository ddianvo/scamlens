import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
export class LoginDto {
  @Transform(trim) @IsEmail({}, { message: 'Email không hợp lệ.' }) @MaxLength(254) email!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
}
export class RegisterDto extends LoginDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(60) name!: string;
}
export class MessageDto {
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Nội dung cần có ít nhất 3 ký tự.' })
  @MaxLength(10000)
  content!: string;
}
export class UrlDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(2048) url!: string;
}
export class LookupDto {
  @IsIn(['domain', 'phone', 'bank']) type!: 'domain' | 'phone' | 'bank';
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(2048) query!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) bank?: string;
}
export class ReportDto {
  @IsIn(['domain', 'phone', 'bank']) type!: 'domain' | 'phone' | 'bank';
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(2048) identifier!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) bank?: string;
  @Transform(trim) @IsString() @MinLength(20) @MaxLength(2000) description!: string;
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(5000) evidence!: string;
}
export class ReviewDto {
  @IsIn(['approved', 'rejected']) status!: 'approved' | 'rejected';
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(1000) reason!: string;
  @IsOptional() @Transform(trim) @IsString() @MinLength(20) @MaxLength(1000) publicSummary?: string;
}
export class HistoryDto {
  @IsIn(['message', 'url']) type!: 'message' | 'url';
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(10000) content!: string;
}
export class RuleDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(100) title!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MinLength(2, { each: true })
  @MaxLength(80, { each: true })
  keywords!: string[];
  @IsInt() @Min(0) @Max(100) weight!: number;
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(1000) reason!: string;
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(1000) action!: string;
  @IsBoolean() enabled!: boolean;
}
export class NewRuleDto extends RuleDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(50) code!: string;
}
export class SubjectDto {
  @IsIn(['domain', 'phone', 'bank']) type!: 'domain' | 'phone' | 'bank';
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(2048) identifier!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) bank?: string;
  @IsIn(['official', 'caution']) verdict!: 'official' | 'caution';
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(1000) note!: string;
  @IsBoolean() isDemo!: boolean;
}
