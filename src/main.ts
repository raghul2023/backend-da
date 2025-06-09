import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import { Request, Response, NextFunction } from 'express';

// Create a singleton instance with proper type
let cachedApp: express.Application;

async function bootstrap() {
  if (cachedApp) {
    return cachedApp;
  }

  // Create Express app
  const expressApp = express();
  const logger = new Logger('Bootstrap');
  
  // Create NestJS application
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

  // Initialize the application
  await app.init();
  
  // Cache the Express app instance
  cachedApp = expressApp;
  return expressApp;
}

// Export the serverless function as default
export default async function handler(req: Request, res: Response) {
  try {
    const app = await bootstrap();
    // Use the Express app as middleware with correct error handler type
    return new Promise((resolve, reject) => {
      app(req, res, (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  } catch (error) {
    console.error('Error in handler:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// For local development only
if (process.env.NODE_ENV !== 'production') {
  bootstrap().then(app => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Application is running on: http://localhost:${port}`);
    });
  });
}
