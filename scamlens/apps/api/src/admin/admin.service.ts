import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, Rule, User, VerifiedSubject, History } from '../database/entities';
import { NewRuleDto, ReviewDto, RuleDto, SubjectDto } from '../common/dtos';
import { identity } from '../reports/reports.module';
import { publicText } from '../analysis/engine';
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Report) private reports: Repository<Report>,
    @InjectRepository(Rule) private rules: Repository<Rule>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(VerifiedSubject) private subjects: Repository<VerifiedSubject>,
    @InjectRepository(History) private histories: Repository<History>,
  ) {}
  async stats() {
    const [users, pending, approved, rejected, histories, subjects] = await Promise.all([
      this.users.count(),
      this.reports.countBy({ status: 'pending' }),
      this.reports.countBy({ status: 'approved' }),
      this.reports.countBy({ status: 'rejected' }),
      this.histories.count(),
      this.subjects.count(),
    ]);
    return { users, pending, approved, rejected, histories, subjects };
  }
  reportsList() {
    return this.reports.find({ order: { createdAt: 'DESC' }, take: 200 });
  }
  async review(id: string, dto: ReviewDto, reviewerId: string) {
    if (dto.status === 'approved' && !dto.publicSummary)
      throw new BadRequestException(
        'Khi duyệt, cần bản mô tả công khai đã loại bỏ thông tin cá nhân.',
      );
    const r = await this.reports.findOneBy({ id });
    if (!r) throw new NotFoundException('Không tìm thấy báo cáo.');
    r.status = dto.status;
    r.reviewReason = dto.reason;
    r.publicSummary = dto.status === 'approved' ? publicText(dto.publicSummary!) : '';
    r.reviewerId = reviewerId;
    return this.reports.save(r);
  }
  rulesList() {
    return this.rules.find({ order: { code: 'ASC' } });
  }
  async addRule(dto: NewRuleDto) {
    if (await this.rules.existsBy({ code: dto.code }))
      throw new ConflictException('Mã quy tắc đã tồn tại.');
    return this.rules.save(this.rules.create(dto));
  }
  async updateRule(id: string, dto: RuleDto) {
    if (!(await this.rules.existsBy({ id })))
      throw new NotFoundException('Không tìm thấy quy tắc.');
    await this.rules.update(id, dto);
    return this.rules.findOneByOrFail({ id });
  }
  subjectsList() {
    return this.subjects.find({ order: { updatedAt: 'DESC' } });
  }
  async upsertSubject(dto: SubjectDto) {
    const key = identity(dto.type, dto.identifier, dto.bank);
    await this.subjects.upsert(
      { ...key, verdict: dto.verdict, note: publicText(dto.note), isDemo: dto.isDemo },
      ['type', 'identifier', 'bank'],
    );
    return this.subjects.findOneByOrFail(key);
  }
  async deleteSubject(id: string) {
    if (!(await this.subjects.delete(id)).affected)
      throw new NotFoundException('Không tìm thấy đối tượng.');
    return { message: 'Đã xóa đối tượng khỏi danh sách.' };
  }
}
