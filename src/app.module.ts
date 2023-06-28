import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { VersionService } from './common/service/storage/version.service';
import { UpdateListService } from './common/service/storage/updateList.service';

import { PostController } from './post/controller/post.controller';
import { PostService } from './post/service/post.service';


import { ScheduleModule } from './schedule/schedule.module';
import { ScheduleController } from './schedule/schedule.controller';
import { ScheduleService } from './schedule/schedule.service';
import { ScheduleFactoryService } from './schedule/scheduleFactory.service';
import { ScheduleHandlerFactoryService } from './schedule/scheduleHandlerFactory.service';

@Module({
  imports: [ConfigModule.forRoot({envFilePath: '.development.env',}), ScheduleModule.register({ folder: './config' })],
  // imports: [TestModule],
  controllers: [AppController, PostController, ScheduleController],
  providers: [AppService, VersionService, UpdateListService, PostService, ScheduleService, ScheduleFactoryService, ScheduleHandlerFactoryService],
})
export class AppModule {}
