import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/drizzle.module';
import { users } from '../database/schema';
import { DrizzleDB } from '../database/types/drizzle';

@Injectable()
export class CommissionGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as { sub: number; role: string };

    const foundUser = await this.db.query.users.findFirst({
      where: eq(users.id, user.sub),
    });

    if (!foundUser) {
      throw new ForbiddenException('User not found from CommissionGuard');
    }

    if (Number(foundUser.unpaidCommission) > 0) {
      throw new ForbiddenException(
        'You have unpaid commissions. Please pay them before posting a new auction.',
      );
    }

    return true;
  }
}
