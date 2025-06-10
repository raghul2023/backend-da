import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Server is running successfully! 🚀';
  }

  getApi(): string {
    return 'Server is running successfully! 🚀';
  }

  getApiRoutes(): string {
    return 'API is running successfully! 🚀';
  }
}
