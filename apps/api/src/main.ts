import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { translateConstraintMessage, getFieldLabel } from './common/utils/validation.utils';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('API_PORT', 3001);
  const prefix = configService.get<string>('API_PREFIX', 'api/v1');
  const corsOrigin = configService.get<string>('API_CORS_ORIGIN', 'http://localhost:3000');

  app.setGlobalPrefix(prefix);
  
  app.use(require('cookie-parser')());
  
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  });
  
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const formattedErrors = errors.map((err) => ({
          field: err.property,
          label: getFieldLabel(err.property),
          messages: Object.values(err.constraints ?? {}).map((msg) =>
            translateConstraintMessage(msg, err.property),
          ),
        }));
        return new BadRequestException({
          statusCode: 400,
          message: 'La información enviada no es válida.',
          errors: formattedErrors,
        });
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sistema de gestion empresarial')
    .setDescription('API para la Plataforma Control de Compras')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${prefix}/docs`, app, document);

  await app.listen(port);
  console.warn(`🚀 API corriendo en http://localhost:${port}/${prefix}`);
  console.warn(`📚 Swagger en http://localhost:${port}/${prefix}/docs`);
}

bootstrap();
