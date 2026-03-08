import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: config.get<string>('ENV') === 'development', // Auto-sync schema in dev only
        migrationsRun: false, // Set to true to auto-run migrations on startup
        migrations: ['dist/database/migrations/*.js'],
        logging: config.get<string>('ENV') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
