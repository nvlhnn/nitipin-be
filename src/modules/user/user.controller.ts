import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UserService } from './user.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import {
  UpdateUserDto,
  ChangePasswordDto,
  DeleteAccountDto,
} from './dto/update-user.dto.js';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.userService.getMe(user.sub);
  }

  @Put('me')
  async updateMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.updateMe(user.sub, dto);
  }

  @Put('me/avatar')
  updateAvatar(@CurrentUser() user: CurrentUserPayload) {
    void user;
    // TODO: Handle multipart file upload + S3 upload in Phase 6
    // For now, accept avatar_url in body
    return { message: 'Avatar upload will be implemented with Upload module' };
  }

  @Put('me/password')
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.userService.changePassword(user.sub, dto);
    return { message: 'Password updated successfully' };
  }

  @Delete('me')
  async deleteMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: DeleteAccountDto,
  ) {
    await this.userService.deleteMe(user.sub, dto.password);
    return { message: 'Account deleted successfully' };
  }

  @Public()
  @Get('by-username/:username')
  async getByUsername(@Param('username') username: string) {
    return this.userService.getByUsername(username);
  }

  @Public()
  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.getById(id);
  }
}
