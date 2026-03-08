import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../user/entities/user.entity.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { Wallet } from '../wallet/entities/wallet.entity.js';
import { QueueService } from '../../infrastructure/queue/queue.service.js';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto.js';

export interface AuthTokens {
  token: string;
  refresh_token: string;
}

export interface AuthResponse {
  user: Partial<User>;
  token: string;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly queueService: QueueService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check for existing user
    const existingUser = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Email already registered',
      });
    }

    if (dto.username) {
      const existingUsername = await this.userRepo.findOne({
        where: { username: dto.username },
      });
      if (existingUsername) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Username already taken',
        });
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = this.userRepo.create({
      email: dto.email,
      password_hash: passwordHash,
      name: dto.name,
      username: dto.username || null,
    });
    await this.userRepo.save(user);

    // Create wallet (auto-created on registration)
    const wallet = this.walletRepo.create({
      user_id: user.id,
      balance: 0,
    });
    await this.walletRepo.save(wallet);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, deleted_at: IsNull() },
    });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      });
    }

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async googleAuth(
    googleId: string,
    email: string,
    name: string,
  ): Promise<AuthResponse & { is_new_user: boolean }> {
    // Check if user exists by google_id
    let user = await this.userRepo.findOne({
      where: { google_id: googleId },
    });

    let isNewUser = false;

    if (!user) {
      // Check if user exists by email (link accounts)
      user = await this.userRepo.findOne({
        where: { email, deleted_at: IsNull() },
      });

      if (user) {
        // Link Google account to existing user
        user.google_id = googleId;
        await this.userRepo.save(user);
      } else {
        // Create new user
        isNewUser = true;
        user = this.userRepo.create({
          email,
          name,
          google_id: googleId,
          password_hash: null,
        });
        await this.userRepo.save(user);

        // Create wallet
        const wallet = this.walletRepo.create({
          user_id: user.id,
          balance: 0,
        });
        await this.walletRepo.save(wallet);
      }
    }

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
      is_new_user: isNewUser,
    };
  }

  async googleAuthWithIdToken(
    idToken: string,
  ): Promise<AuthResponse & { is_new_user: boolean }> {
    const googlePayload = await this.verifyGoogleIdToken(idToken);
    const name =
      googlePayload.name && googlePayload.name.trim().length > 0
        ? googlePayload.name
        : googlePayload.email.split('@')[0];

    return this.googleAuth(googlePayload.sub, googlePayload.email, name);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthTokens> {
    const tokenHash = this.hashToken(dto.refresh_token);

    const storedToken = await this.refreshTokenRepo.findOne({
      where: { token_hash: tokenHash, revoked_at: IsNull() },
      relations: ['user'],
    });

    if (!storedToken || storedToken.expires_at < new Date()) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired refresh token',
      });
    }

    // Revoke old token
    storedToken.revoked_at = new Date();
    await this.refreshTokenRepo.save(storedToken);

    // Generate new tokens
    return this.generateTokens(storedToken.user);
  }

  async logout(userId: string): Promise<void> {
    // Revoke all refresh tokens for this user
    await this.refreshTokenRepo.update(
      { user_id: userId, revoked_at: IsNull() },
      { revoked_at: new Date() },
    );
  }

  async forgotPassword(email: string): Promise<void> {
    // Always return success to prevent email enumeration
    const user = await this.userRepo.findOne({
      where: { email, deleted_at: IsNull() },
    });

    if (user) {
      // Generate reset token and queue email
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.password_reset_token_hash = this.hashToken(resetToken);
      user.password_reset_expires_at = new Date(
        Date.now() +
          this.parseExpiry(this.config.get<string>('PASSWORD_RESET_TOKEN_EXPIRY', '1h')),
      );
      await this.userRepo.save(user);

      await this.queueService.sendPasswordResetEmail(user.email, resetToken);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const user = await this.userRepo.findOne({
      where: {
        password_reset_token_hash: tokenHash,
        password_reset_expires_at: MoreThan(new Date()),
        deleted_at: IsNull(),
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Invalid or expired reset token',
      });
    }

    user.password_hash = await bcrypt.hash(newPassword, 12);
    user.password_reset_token_hash = null;
    user.password_reset_expires_at = null;
    await this.userRepo.save(user);

    await this.refreshTokenRepo.update(
      { user_id: user.id, revoked_at: IsNull() },
      { revoked_at: new Date() },
    );
  }

  async verifyEmailRequest(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user) {
      if (user.is_verified) {
        return;
      }

      const verifyToken = crypto.randomBytes(32).toString('hex');
      user.email_verify_token_hash = this.hashToken(verifyToken);
      user.email_verify_expires_at = new Date(
        Date.now() +
          this.parseExpiry(this.config.get<string>('EMAIL_VERIFY_TOKEN_EXPIRY', '24h')),
      );
      await this.userRepo.save(user);

      await this.queueService.sendVerificationEmail(user.email, verifyToken);
    }
  }

  async verifyEmailConfirm(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const user = await this.userRepo.findOne({
      where: {
        email_verify_token_hash: tokenHash,
        email_verify_expires_at: MoreThan(new Date()),
        deleted_at: IsNull(),
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Invalid or expired verification token',
      });
    }

    user.is_verified = true;
    user.verified_at = new Date();
    user.email_verify_token_hash = null;
    user.email_verify_expires_at = null;
    await this.userRepo.save(user);
  }

  // --- Private helpers ---

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload = { sub: user.id, email: user.email };

    const expiryMs = this.parseExpiry(
      this.config.get<string>('JWT_EXPIRY', '15m'),
    );
    const token = this.jwtService.sign(payload, {
      expiresIn: Math.floor(expiryMs / 1000),
    });

    // Refresh token
    const refreshTokenValue = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(refreshTokenValue);

    const refreshExpiryStr = this.config.get<string>(
      'JWT_REFRESH_EXPIRY',
      '168h',
    );
    const refreshExpiryMs = this.parseExpiry(refreshExpiryStr);

    const refreshToken = this.refreshTokenRepo.create({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + refreshExpiryMs),
    });
    await this.refreshTokenRepo.save(refreshToken);

    return {
      token,
      refresh_token: refreshTokenValue,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: User): Partial<User> {
    const sanitized: Partial<User> = { ...user };
    delete sanitized.password_hash;
    delete sanitized.google_id;
    delete sanitized.deleted_at;

    return sanitized;
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)(h|m|d)$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days

    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private async verifyGoogleIdToken(idToken: string): Promise<{
    sub: string;
    email: string;
    name: string;
  }> {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );

    if (!response.ok) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid Google ID token',
      });
    }

    const payload: unknown = await response.json();
    if (typeof payload !== 'object' || payload === null) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid Google token payload',
      });
    }

    const record = payload as Record<string, unknown>;
    const sub = record.sub;
    const email = record.email;
    const aud = record.aud;
    const emailVerified = record.email_verified;
    const name = record.name;

    if (
      typeof sub !== 'string' ||
      typeof email !== 'string' ||
      typeof emailVerified !== 'string'
    ) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Google token missing required fields',
      });
    }

    if (emailVerified !== 'true') {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Google email is not verified',
      });
    }

    const expectedAudience = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (
      expectedAudience &&
      expectedAudience.trim().length > 0 &&
      (typeof aud !== 'string' || aud !== expectedAudience)
    ) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Google token audience mismatch',
      });
    }

    return {
      sub,
      email,
      name: typeof name === 'string' ? name : email.split('@')[0],
    };
  }
}
