import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AccountController } from './account.controller';
import { AuthController } from './auth.controller';
import { BookService } from './book.service';
import { DevController } from './dev.controller';
import { JobsService } from './jobs.service';
import { MessagesService } from './messages.service';
import { OtpService } from './otp.service';
import { PrismaService } from './prisma.service';
import { PublicController } from './public.controller';
import { ScopeService } from './scope.service';
import { SessionMiddleware, SessionService } from './session';
import { StorageService } from './storage.service';
import { StreamService } from './stream.service';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [ScheduleModule.forRoot(), ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }])],
  controllers: [AuthController, SyncController, PublicController, AccountController, DevController],
  providers: [PrismaService, ScopeService, SessionService, SessionMiddleware, OtpService, StorageService, StreamService, MessagesService, SyncService, BookService, JobsService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes('*path');
  }
}
