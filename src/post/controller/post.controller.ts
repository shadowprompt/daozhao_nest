import { Controller, Get, Param, Query } from '@nestjs/common';
import { PostService } from '../service/post.service';
import { VersionService } from '../../common/service/storage/version.service';

@Controller('/post')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly versionService: VersionService,
  ) {}

  // /post/3
  @Get(':id')
  getId(@Param('id') id: string) : Object {
    console.log('getId -> ', id);
    return this.postService.getQuery(id);
  }

  @Get()
  getQuery(@Query() query): Object {
    console.log('getQuery -> ', query);
    return this.postService.getQuery(query);
  }
}
