import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AssignmentsModule } from './assignments/assignments.module';
import { AuthModule } from './auth/auth.module';
import { BeaconsModule } from './beacons/beacons.module';
import { AppConfigModule } from './config/config.module';
import { loadConfig } from './config/env.validation';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExhibitsModule } from './exhibits/exhibits.module';
import { MediaModule } from './media/media.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicGuideModule } from './public-guide/public-guide.module';
import { ZonesModule } from './zones/zones.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    // Uploaded media is served straight from disk in development.
    ServeStaticModule.forRootAsync({
      useFactory: () => {
        const config = loadConfig();
        return [
          {
            rootPath: join(process.cwd(), config.uploadDir),
            serveRoot: '/uploads',
            serveStaticOptions: { index: false, fallthrough: true },
          },
        ];
      },
    }),
    AuthModule,
    ZonesModule,
    BeaconsModule,
    ExhibitsModule,
    AssignmentsModule,
    MediaModule,
    PublicGuideModule,
    DashboardModule,
  ],
})
export class AppModule {}
