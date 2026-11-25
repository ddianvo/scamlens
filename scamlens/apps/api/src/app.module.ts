import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { databaseOptions } from './database/data-source';
import { AuthModule } from './auth/auth.module';
import { AnalysisModule } from './analysis/analysis.module';
import { ReportsModule } from './reports/reports.module';
import { HistoryModule } from './history/history.module';
import { AdminModule } from './admin/admin.module';
@Controller()
class HealthController {
  @Get('health') health() {
    return { status: 'ok', service: 'ScamLens' };
  }
}
@Module({
  imports: [
    TypeOrmModule.forRoot(databaseOptions()),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    AuthModule,
    AnalysisModule,
    ReportsModule,
    HistoryModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
