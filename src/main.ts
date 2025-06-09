import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';

// Create a singleton instance
let cachedApp: any;

async function bootstrap() {
  if (cachedApp) {
    return cachedApp;
  }

  const expressApp = express();
  const logger = new Logger('Bootstrap');
  
  // Create the app with specific options for serverless
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      logger: ['error', 'warn'],
      bodyParser: true,
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
      },
    }
  );

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
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

  await app.init();
  
  cachedApp = expressApp;
  return expressApp;
}

// Export the handler for Vercel
export const handler = async (req, res) => {
  const app = await bootstrap();
  return app(req, res);
};

// For local development
if (process.env.NODE_ENV !== 'production') {
  bootstrap().then(app => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Application is running on: http://localhost:${port}`);
    });
  });
}
