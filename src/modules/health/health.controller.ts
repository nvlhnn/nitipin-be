import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  getHealth(): {
    status: 'ok';
    timestamp: string;
    uptime_seconds: number;
  } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.round(process.uptime()),
    };
  }
}
