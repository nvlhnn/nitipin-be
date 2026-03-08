import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from './entities/user.entity.js';
import {
  UpdateUserDto,
  ChangePasswordDto,
} from './dto/update-user.dto.js';
import { RefreshToken } from '../auth/entities/refresh-token.entity.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  async getMe(userId: string): Promise<Partial<User>> {
    const user = await this.userRepo.findOne({
      where: { id: userId, deleted_at: IsNull() },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return this.sanitizeForOwner(user);
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<Partial<User>> {
    const user = await this.userRepo.findOne({
      where: { id: userId, deleted_at: IsNull() },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // Check username uniqueness if changing
    if (dto.username && dto.username !== user.username) {
      const taken = await this.userRepo.findOne({
        where: { username: dto.username },
      });
      if (taken) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Username already taken',
        });
      }
    }

    // Partial update
    Object.assign(user, dto);
    await this.userRepo.save(user);

    return this.sanitizeForOwner(user);
  }

  async updateAvatar(
    userId: string,
    avatarUrl: string,
  ): Promise<{ avatar_url: string }> {
    const result = await this.userRepo.update(
      { id: userId, deleted_at: IsNull() },
      { avatar_url: avatarUrl },
    );

    if (result.affected === 0) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return { avatar_url: avatarUrl };
  }

  async getById(id: string): Promise<Partial<User>> {
    const user = await this.userRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return this.sanitizeForPublic(user);
  }

  async getByUsername(username: string): Promise<Partial<User>> {
    const user = await this.userRepo.findOne({
      where: { username, deleted_at: IsNull() },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return this.sanitizeForPublic(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId, deleted_at: IsNull() },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    if (!user.password_hash) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Password login is not configured for this account',
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.current_password,
      user.password_hash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Current password is incorrect',
      });
    }

    const isSamePassword = await bcrypt.compare(dto.new_password, user.password_hash);
    if (isSamePassword) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'New password must be different from current password',
      });
    }

    user.password_hash = await bcrypt.hash(dto.new_password, 12);
    await this.userRepo.save(user);

    await this.refreshTokenRepo.update(
      { user_id: user.id, revoked_at: IsNull() },
      { revoked_at: new Date() },
    );
  }

  async deleteMe(userId: string, password?: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId, deleted_at: IsNull() },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    if (user.password_hash) {
      if (!password) {
        throw new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: 'Password is required to delete this account',
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: 'Password is incorrect',
        });
      }
    }

    const suffix = user.id.replace(/-/g, '').slice(0, 12);

    user.email = `deleted+${suffix}@deleted.local`;
    user.username = user.username ? `deleted_${suffix}` : null;
    user.password_hash = null;
    user.google_id = null;
    user.password_reset_token_hash = null;
    user.password_reset_expires_at = null;
    user.email_verify_token_hash = null;
    user.email_verify_expires_at = null;
    user.deleted_at = new Date();

    await this.userRepo.save(user);

    await this.refreshTokenRepo.update(
      { user_id: user.id, revoked_at: IsNull() },
      { revoked_at: new Date() },
    );
  }

  // --- Private helpers ---

  private sanitizeForOwner(user: User): Partial<User> {
    const sanitized: Partial<User> = { ...user };
    delete sanitized.password_hash;
    delete sanitized.google_id;
    delete sanitized.deleted_at;

    return sanitized;
  }

  private sanitizeForPublic(user: User): Partial<User> {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      bio: user.bio,
      city: user.city,
      avatar_url: user.avatar_url,
      traveler_rating: user.traveler_rating,
      traveler_review_count: user.traveler_review_count,
      traveler_trip_count: user.traveler_trip_count,
      requester_rating: user.requester_rating,
      requester_review_count: user.requester_review_count,
      is_verified: user.is_verified,
      created_at: user.created_at,
    };
  }
}
