import {
  Body,
  CanActivate,
  ConflictException,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  Module,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Throttle } from '@nestjs/throttler';
import { Repository } from 'typeorm';
import { compare, hash } from 'bcryptjs';
import { Request, Response } from 'express';
import { User } from '../database/entities';
import { LoginDto, RegisterDto } from '../common/dtos';

export interface AuthRequest extends Request {
  user: User;
}
export const safeUser = (u: User) => ({ id: u.id, email: u.email, name: u.name, role: u.role });
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    @InjectRepository(User) private users: Repository<User>,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const token = req.cookies?.scamlens_session;
    if (!token) throw new UnauthorizedException('Vui lòng đăng nhập để tiếp tục.');
    try {
      const payload = await this.jwt.verifyAsync(token);
      const user = await this.users.findOneBy({ id: payload.sub });
      if (!user || user.sessionVersion !== payload.version) throw new Error();
      req.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
  }
}
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    return context.switchToHttp().getRequest<AuthRequest>().user?.role === 'admin';
  }
}
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
  ) {}
  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    if (await this.users.existsBy({ email })) throw new ConflictException('Email đã được đăng ký.');
    try {
      return await this.users.save(
        this.users.create({
          email,
          name: dto.name,
          passwordHash: await hash(dto.password, 12),
          role: 'user',
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException('Email đã được đăng ký.');
      throw error;
    }
  }
  async login(dto: LoginDto) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: dto.email.toLowerCase() })
      .getOne();
    if (!user || !(await compare(dto.password, user.passwordHash)))
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    return user;
  }
  async session(user: User, res: Response) {
    const token = await this.jwt.signAsync({ sub: user.id, version: user.sessionVersion });
    res.cookie('scamlens_session', token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'strict',
      path: '/api',
      maxAge: 8 * 60 * 60 * 1000,
    });
    return safeUser(user);
  }
  async logout(user: User) {
    await this.users.increment({ id: user.id }, 'sessionVersion', 1);
  }
}
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.session(await this.auth.register(dto), res);
  }
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.session(await this.auth.login(dto), res);
  }
  @Get('me') @UseGuards(AuthGuard) me(@Req() req: AuthRequest) {
    return safeUser(req.user);
  }
  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.user);
    res.clearCookie('scamlens_session', { path: '/api' });
    return { message: 'Đã đăng xuất.' };
  }
}
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 32) throw new Error('JWT_SECRET cần ít nhất 32 ký tự.');
        return {
          secret,
          signOptions: { expiresIn: '8h', issuer: 'scamlens', audience: 'scamlens-web' },
          verifyOptions: { issuer: 'scamlens', audience: 'scamlens-web', algorithms: ['HS256'] },
        };
      },
    }),
  ],
  providers: [AuthService, AuthGuard, AdminGuard],
  controllers: [AuthController],
  exports: [AuthGuard, AdminGuard, JwtModule, TypeOrmModule],
})
export class AuthModule {}
