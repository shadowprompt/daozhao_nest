import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { VersionService } from './common/service/storage/version.service';
import { UpdateListService } from './common/service/storage/updateList.service';

import { PostController } from './post/controller/post.controller';
import { PostService } from './post/service/post.service';


import { ScheduleController } from './schedule/controller/schedule.controller';
import { ScheduleService } from './schedule/service/schedule.service';

@Module({
  imports: [],
  controllers: [AppController, PostController, ScheduleController],
  providers: [AppService, VersionService, UpdateListService, PostService, ScheduleService],
})
export class AppModule {}
