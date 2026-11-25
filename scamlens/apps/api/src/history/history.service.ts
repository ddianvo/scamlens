import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { History } from '../database/entities';
import { AnalysisService } from '../analysis/analysis.module';
import { HistoryDto } from '../common/dtos';
@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(History) private histories: Repository<History>,
    private analysis: AnalysisService,
  ) {}
  list(userId: string) {
    return this.histories.find({
      where: { userId: userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
  async save(dto: HistoryDto, userId: string) {
    const result =
      dto.type === 'message'
        ? await this.analysis.message(dto.content)
        : await this.analysis.url(dto.content);
    return this.histories.save(this.histories.create({ ...dto, userId: userId, result }));
  }
  async remove(id: string, userId: string) {
    const deleted = await this.histories.delete({ id, userId: userId });
    if (!deleted.affected) throw new NotFoundException('Không tìm thấy lịch sử của bạn.');
    return { message: 'Đã xóa lịch sử.' };
  }
}
