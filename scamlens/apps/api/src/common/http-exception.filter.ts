import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';
@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof HttpException) {
      const value = error.getResponse();
      const body = typeof value === 'string' ? { message: value } : value;
      return response.status(error.getStatus()).json(body);
    }
    // Never log error objects or database parameters: they can contain private text.
    const status = (error as { status?: number })?.status;
    if (status === 400 || status === 413)
      return response
        .status(status)
        .json({
          message: status === 413 ? 'Dữ liệu gửi lên quá lớn.' : 'Dữ liệu JSON không hợp lệ.',
        });
    console.error('[ScamLens] Không xử lý được yêu cầu nội bộ.');
    return response
      .status(500)
      .json({ message: 'Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại sau.' });
  }
}
