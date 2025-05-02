import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { eq, desc, gt, sql } from 'drizzle-orm';
import * as multer from 'multer';
import { UserEntity } from './entities/user.entity';
import { users } from 'src/common/database/schema/user.schema';
import { DRIZZLE } from 'src/common/database/drizzle.module';
import { DrizzleDB } from 'src/common/database/types/drizzle';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';
import { UserProfileDto } from './dto/update-profile.dto';

function transformUser(row: any): UserEntity {
  return new UserEntity({
    ...row,
    unpaidCommission: parseFloat(row.unpaidCommission),
    auctionsWon: parseFloat(row.auctionsWon),
    moneySpent: parseFloat(row.moneySpent),
    paymentMethods: row.paymentMethods ?? undefined,
  });
}

@Injectable()
export class UserService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly cloudinary: CloudinaryService,
  ) {}
  private readonly logger = new Logger(UserService.name);

  async getAllUsers(): Promise<UserEntity[]> {
    const rows = await this.db.select().from(users);
    return rows.map(transformUser);
  }

  async getUserById(id: number): Promise<UserEntity> {
    const row = await this.db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!row) throw new NotFoundException('User not found');
    return transformUser(row);
  }

  async updateUserProfile(
    id: number,
    dto: UserProfileDto,
    image?: Express.Multer.File,
  ) {
    // Get the existing user first to check their role
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!existingUser) throw new NotFoundException('User not found');

    // Restrict paymentMethods for Bidders
    if (existingUser.role === 'Bidder') {
      if (dto.paymentMethods) {
        this.logger.warn(
          `Bidder with ID ${id} tried to update payment methods`,
        );
      }
      dto.paymentMethods = undefined;
    }

    // Upload image if provided
    if (image?.buffer) {
      const uploaded = await this.cloudinary.uploadFile(
        image,
        'profile_photos',
      );
      dto.profileImagePublicId = uploaded.public_id;
      dto.profileImageUrl = uploaded.secure_url;
    }

    const [updated] = await this.db
      .update(users)
      .set({
        address: dto.address,
        phone: dto.phone,
        profileImageUrl: dto.profileImageUrl,
        profileImagePublicId: dto.profileImagePublicId,
        paymentMethods: dto.paymentMethods as any,
        role: dto.role,
      } as Partial<any>)
      .where(eq(users.id, id))
      .returning();

    if (!updated) throw new NotFoundException('User not found');
    return transformUser(updated);
  }

  async deleteUser(id: number): Promise<{ message: string }> {
    const deleted = await this.db.delete(users).where(eq(users.id, id));

    if (deleted.rowCount === 0) throw new NotFoundException('User not found');

    return { message: 'User deleted successfully' };
  }

  async fetchLeaderboard(limit: number) {
    return this.db
      .select({
        id: users.id,
        userName: users.userName,
        profileImageUrl: users.profileImageUrl,
        moneySpent: users.moneySpent,
      })
      .from(users)
      .orderBy(desc(users.moneySpent))
      .limit(limit);
  }
}
