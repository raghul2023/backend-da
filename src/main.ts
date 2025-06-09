import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Create the app with specific options for serverless
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'], // Reduce logging in production
    bodyParser: true,
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    },
  });

  // Enable validation pipes with optimized settings
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Add validation timeout
      validateCustomDecorators: true,
      dismissDefaultMessages: false,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // Set global prefix
  app.setGlobalPrefix('api');

  // Setup Swagger documentation only in development
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Product API')
      .setDescription('The Product API description')
      .setVersion('1.0')
      .addTag('products')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Optimize for serverless
  if (process.env.NODE_ENV === 'production') {
    // Disable unnecessary features in production
    app.enableShutdownHooks();
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  const port = process.env.PORT || 3000;
  
  // For Vercel serverless, we don't need to listen on a port
  if (process.env.NODE_ENV === 'production') {
    await app.init();
    return app;
  } else {
    await app.listen(port);
    logger.log(`Application is running on: ${await app.getUrl()}`);
    if (process.env.NODE_ENV !== 'production') {
      logger.log(`Swagger documentation is available at: ${await app.getUrl()}/api/docs`);
    }
    return app;
  }
}

// For Vercel serverless functions
export default bootstrap();
