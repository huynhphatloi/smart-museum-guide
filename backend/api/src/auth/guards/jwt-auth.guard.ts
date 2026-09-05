import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protects every /api/admin/* route. Visitors never hit these. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
