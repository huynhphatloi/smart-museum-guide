import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { APP_CONFIG, AppConfig } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedAdmin, JwtPayload, LoginResponse } from './auth.types';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    // Same message for "unknown email" and "wrong password" so the endpoint
    // cannot be used to enumerate accounts.
    const invalid = new UnauthorizedException('Invalid email or password.');
    if (!admin) throw invalid;

    const matches = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!matches) throw invalid;

    const payload: JwtPayload = { sub: admin.id, email: admin.email, name: admin.name };

    return {
      accessToken: await this.jwt.signAsync(payload),
      expiresIn: this.config.jwtExpiresIn,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    };
  }

  static hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }

  profile(admin: AuthenticatedAdmin): AuthenticatedAdmin {
    return admin;
  }
}
