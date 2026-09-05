import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { APP_CONFIG, AppConfig } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get<AppConfig>(APP_CONFIG);

  // Every route lives under /api, including the statically served /api/uploads
  // is NOT desired - uploads stay at the root so media URLs stay short.
  app.setGlobalPrefix('api', { exclude: ['uploads/(.*)'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: (origin, callback) => {
      // Mobile apps and curl send no Origin header at all.
      if (!origin || config.corsOrigins.includes(origin) || config.nodeEnv !== 'production') {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  });

  await app.listen(config.port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`API listening on http://localhost:${config.port}/api`);
  logger.log(
    `Default language: ${config.defaultLanguage} | supported: ${config.supportedLanguages.join(', ')}`,
  );
}

void bootstrap();
