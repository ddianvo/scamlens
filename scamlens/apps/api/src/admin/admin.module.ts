import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report, Rule, User, VerifiedSubject, History } from '../database/entities';
import { AuthModule, AuthGuard, AdminGuard, AuthRequest } from '../auth/auth.module';
import { NewRuleDto, ReviewDto, RuleDto, SubjectDto } from '../common/dtos';
import { AdminService } from './admin.service';
@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(private admin: AdminService) {}
  @Get('stats') stats() {
    return this.admin.stats();
  }
  @Get('reports') reports() {
    return this.admin.reportsList();
  }
  @Patch('reports/:id') review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewDto,
    @Req() req: AuthRequest,
  ) {
    return this.admin.review(id, dto, req.user.id);
  }
  @Get('rules') rules() {
    return this.admin.rulesList();
  }
  @Post('rules') addRule(@Body() dto: NewRuleDto) {
    return this.admin.addRule(dto);
  }
  @Patch('rules/:id') updateRule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RuleDto) {
    return this.admin.updateRule(id, dto);
  }
  @Get('subjects') subjects() {
    return this.admin.subjectsList();
  }
  @Post('subjects') upsertSubject(@Body() dto: SubjectDto) {
    return this.admin.upsertSubject(dto);
  }
  @Delete('subjects/:id') deleteSubject(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deleteSubject(id);
  }
}
@Module({
  imports: [TypeOrmModule.forFeature([Report, Rule, User, VerifiedSubject, History]), AuthModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
