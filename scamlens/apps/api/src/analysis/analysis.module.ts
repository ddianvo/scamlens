import { Body, Controller, Injectable, Module, Post } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rule, VerifiedSubject } from '../database/entities';
import { MessageDto, UrlDto } from '../common/dtos';
import { analyzeMessage, analyzeUrl } from './engine';
import brands from './brands.json';
@Injectable()
export class AnalysisService {
  constructor(
    @InjectRepository(Rule) private rules: Repository<Rule>,
    @InjectRepository(VerifiedSubject) private subjects: Repository<VerifiedSubject>,
  ) {}
  async message(content: string) {
    return analyzeMessage(content, await this.rules.findBy({ enabled: true }));
  }
  async url(url: string) {
    return analyzeUrl(url, await this.subjects.findBy({ type: 'domain' }), brands);
  }
}
@Controller('analysis')
export class AnalysisController {
  constructor(private analysis: AnalysisService) {}
  @Post('message') message(@Body() dto: MessageDto) {
    return this.analysis.message(dto.content);
  }
  @Post('url') url(@Body() dto: UrlDto) {
    return this.analysis.url(dto.url);
  }
}
@Module({
  imports: [TypeOrmModule.forFeature([Rule, VerifiedSubject])],
  providers: [AnalysisService],
  controllers: [AnalysisController],
  exports: [AnalysisService],
})
export class AnalysisModule {}
