import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { SafeExceptionFilter } from './common/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { NextFunction, Request, Response } from 'express';
async function bootstrap() {
  const production = process.env.NODE_ENV === 'production';
  if (production && process.env.COOKIE_SECURE !== 'true')
    throw new Error('Production requires secure cookies.');
  const allowedOrigin =
    process.env.FRONTEND_ORIGIN ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : 'http://127.0.0.1:5173');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn'],
  });
  if (production) app.set('trust proxy', 1);
  app.enableShutdownHooks();
  app.use(helmet());
  app.use(cookieParser());
  app.use(
    (
      req: { method: string; headers: { origin?: string; 'content-type'?: string } },
      res: { status: (s: number) => { json: (v: unknown) => void } },
      next: () => void,
    ) => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const origin = req.headers.origin;
        if (origin && origin !== allowedOrigin)
          return res.status(403).json({ message: 'Nguồn yêu cầu không được phép.' });
        if (req.method !== 'DELETE' && !req.headers['content-type']?.startsWith('application/json'))
          return res.status(415).json({ message: 'Chỉ chấp nhận JSON.' });
      }
      next();
    },
  );
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new SafeExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: { target: false, value: false },
      exceptionFactory: (errors) => {
        const labels: Record<string, string> = {
          name: 'Tên hiển thị',
          email: 'Email',
          password: 'Mật khẩu',
          content: 'Nội dung',
          url: 'Đường link',
          query: 'Thông tin tra cứu',
          identifier: 'Thông tin nhận diện',
          bank: 'Tên ngân hàng',
          description: 'Mô tả sự việc',
          evidence: 'Bằng chứng',
          reason: 'Lý do',
          publicSummary: 'Mô tả công khai',
          keywords: 'Từ khóa',
          weight: 'Trọng số',
          title: 'Tên quy tắc',
          action: 'Hướng xử lý',
          code: 'Mã quy tắc',
          enabled: 'Trạng thái quy tắc',
          isDemo: 'Nhãn dữ liệu mô phỏng',
          type: 'Loại đối tượng',
          status: 'Trạng thái',
          verdict: 'Kết quả xác minh',
          note: 'Ghi chú',
        };
        return new BadRequestException(
          errors.map(
            (e) =>
              `${labels[e.property] || 'Trường dữ liệu'} chưa hợp lệ. Kiểm tra giá trị, độ dài và các trường được phép.`,
          ),
        );
      },
    }),
  );
  if (production || process.env.SERVE_WEB === 'true') {
    const webDist = resolve(__dirname, '../../web/dist');
    if (!existsSync(resolve(webDist, 'index.html'))) throw new Error('Frontend build is missing.');
    app.useStaticAssets(webDist, { index: false, maxAge: '1h' });
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (
        !['GET', 'HEAD'].includes(req.method) ||
        req.path === '/api' ||
        req.path.startsWith('/api/')
      )
        return next();
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(resolve(webDist, 'index.html'));
    });
  }
  const host = process.env.HOST || (production ? '0.0.0.0' : '127.0.0.1');
  await app.listen(Number(process.env.PORT || 3001), host);
  console.log(`ScamLens server listening on port ${process.env.PORT || 3001}`);
}
bootstrap().catch(() => {
  console.error('Không khởi động được API. Kiểm tra cấu hình, migration và kết nối database.');
  process.exit(1);
});
