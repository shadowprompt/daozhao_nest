import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { VersionService } from './common/service/storage/version.service';
import { UpdateListService } from './common/service/storage/updateList.service';

import { PostController } from './post/controller/post.controller';
import { PostService } from './post/service/post.service';


import { ScheduleModule } from './schedule/schedule.module';

@Module({
  imports: [ConfigModule.forRoot({envFilePath: '.development.env',}), ScheduleModule.register({ folder: './config' })],
  // imports: [TestModule],
  controllers: [AppController, PostController],
  providers: [AppService, VersionService, UpdateListService, PostService],
})
export class AppModule {}
