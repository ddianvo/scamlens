import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { History } from '../database/entities';
import { AuthModule, AuthGuard, AuthRequest } from '../auth/auth.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { HistoryDto } from '../common/dtos';
import { HistoryService } from './history.service';
@Controller('history')
@UseGuards(AuthGuard)
export class HistoryController {
  constructor(private history: HistoryService) {}
  @Get() list(@Req() req: AuthRequest) {
    return this.history.list(req.user.id);
  }
  @Post() save(@Body() dto: HistoryDto, @Req() req: AuthRequest) {
    return this.history.save(dto, req.user.id);
  }
  @Delete(':id') remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthRequest) {
    return this.history.remove(id, req.user.id);
  }
}
@Module({
  imports: [TypeOrmModule.forFeature([History]), AuthModule, AnalysisModule],
  providers: [HistoryService],
  controllers: [HistoryController],
})
export class HistoryModule {}
