import { Controller, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';

@Controller('upload')
export class UploadController {
  constructor() {}

  @Post('image')
  @HttpCode(HttpStatus.OK)
  uploadImage(
    @CurrentUser() user: CurrentUserPayload,
    @Query('type') type?: string,
  ) {
    void user;
    // TODO: Implement multipart file upload + S3/cloud storage
    // Supported types: avatar, trip, product, proof, receipt, chat
    // Constraints: Max 5MB, JPEG/PNG/WebP, auto-convert to WebP
    return {
      url: `https://storage.nitipin.com/uploads/${type || 'general'}/placeholder.webp`,
      message: 'File upload will be implemented with cloud storage integration',
    };
  }
}
