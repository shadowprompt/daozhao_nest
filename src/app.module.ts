import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostController } from './post/controller/post.controller';
import { PostService } from './post/service/post.service';
import { VersionService } from './common/service/version.service';

@Module({
  imports: [],
  controllers: [AppController, PostController],
  providers: [AppService, PostService, VersionService],
})
export class AppModule {}
