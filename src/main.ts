import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
// Correctly import the default export 'express' and named types
import express, { Request, Response, Application } from 'express';

// Create a singleton instance of the Express app to be cached across invocations.
let cachedApp: Application;

/**
 * Bootstraps the NestJS application.
 * It creates an Express instance, initializes NestJS with it,
 * and caches the instance for reuse in subsequent serverless function invocations.
 * @returns {Promise<Application>} The initialized Express application.
 */
async function bootstrap(): Promise<Application> {
  if (cachedApp) {
    // Return cached instance if it exists
    return cachedApp;
  }

  const logger = new Logger('Bootstrap');

  // Create a new Express app instance
  const expressApp = express();
  // Create a NestJS application instance using the Express adapter
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    {
     
      // Configure logger to show only errors and warnings
      logger: ['error', 'warn'],
      // Body parser is enabled by default, but explicit is fine
      bodyParser: true,
    },
  );

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Enable global validation pipes for request DTOs
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

  // Set a global prefix for all routes (e.g., /api)
  app.setGlobalPrefix('api');

  // Setup Swagger API documentation only in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Product API')
      .setDescription('The Product API description')
      .setVersion('1.0')
      .addTag('products')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger documentation is available at /api/docs');
  }

  // Initialize the NestJS application (attaches controllers, services, etc.)
  await app.init();

  // Cache the initialized Express app
  cachedApp = expressApp;
  return expressApp;
}

/**
 * The main serverless handler function.
 * It bootstraps the application and passes the request and response objects
 * to the underlying Express application.
 * @param {Request} req The incoming request object.
 * @param {Response} res The outgoing response object.
 */
export default async function handler(req: Request, res: Response) {
  try {
    const app = await bootstrap();
    // The Express instance itself is a request handler.
    // We pass the request and response directly to it.
    // The underlying NestJS application will handle the rest.
    app(req, res);
  } catch (error) {
    console.error('Error in serverless handler:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * This block runs the application in a traditional standalone mode
 * for local development. It is guarded to not run in a production/serverless environment.
 */
async function startLocalServer() {
  const app = await bootstrap();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 Application is running on: http://localhost:${port}`);
  });
}

// Start local server only if not in a serverless/production environment
if (process.env.NODE_ENV !== 'production') {
  startLocalServer();
}
