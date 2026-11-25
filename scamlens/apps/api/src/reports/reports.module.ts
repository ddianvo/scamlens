import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../database/entities';
import { LookupDto, ReportDto } from '../common/dtos';
import { maskIdentifier, normalizeBank, normalizeIdentifier, publicText } from '../analysis/engine';
import { AuthGuard, AuthModule, AuthRequest } from '../auth/auth.module';
export function identity(type: string, identifier: string, bank?: string) {
  if (type === 'bank' && !bank?.trim())
    throw new BadRequestException('Vui lòng nhập tên ngân hàng để đối chiếu số tài khoản.');
  return {
    type: type as Report['type'],
    identifier: normalizeIdentifier(type, identifier),
    bank: type === 'bank' ? normalizeBank(bank) : '',
  };
}
export const publicReport = (r: Report) => ({
  id: r.id,
  type: r.type,
  identifier: maskIdentifier(r.type, r.identifier),
  bank: r.bank,
  description: publicText(r.publicSummary),
  status: r.status,
  updatedAt: r.updatedAt,
  isDemo: r.isDemo,
});
@Injectable()
export class ReportsService {
  constructor(@InjectRepository(Report) private reports: Repository<Report>) {}
  async lookup(dto: LookupDto) {
    const query = identity(dto.type, dto.query, dto.bank);
    return {
      reports: (
        await this.reports.find({
          where: { ...query, status: 'approved' },
          order: { updatedAt: 'DESC' },
          take: 50,
        })
      ).map(publicReport),
      query: maskIdentifier(dto.type, query.identifier),
      message: 'Chưa tìm thấy báo cáo trong hệ thống',
      note: 'Việc có hoặc chưa có báo cáo không đủ để kết luận đối tượng an toàn hay lừa đảo.',
    };
  }
  async recent() {
    return (
      await this.reports.find({
        where: { status: 'approved' },
        order: { updatedAt: 'DESC' },
        take: 3,
      })
    ).map(publicReport);
  }
  async create(dto: ReportDto, userId: string) {
    return this.reports.save(
      this.reports.create({
        ...identity(dto.type, dto.identifier, dto.bank),
        description: dto.description,
        evidence: dto.evidence,
        userId,
        status: 'pending',
      }),
    );
  }
  async mine(userId: string) {
    return this.reports.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 100 });
  }
}
@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}
  @Get('lookup') lookup(@Query() dto: LookupDto) {
    return this.reports.lookup(dto);
  }
  @Get('recent') recent() {
    return this.reports.recent();
  }
  @Get('mine') @UseGuards(AuthGuard) mine(@Req() req: AuthRequest) {
    return this.reports.mine(req.user.id);
  }
  @Post() @UseGuards(AuthGuard) create(@Body() dto: ReportDto, @Req() req: AuthRequest) {
    return this.reports.create(dto, req.user.id);
  }
}
@Module({
  imports: [TypeOrmModule.forFeature([Report]), AuthModule],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
