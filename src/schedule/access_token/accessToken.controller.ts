import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import {
  ACCESS_TOKEN_LIST_PATHS,
  ACCESS_TOKEN_POST_PATHS,
  AccessTokenRegistryService,
} from "./accessTokenRegistry.service";

@Controller()
export class AccessTokenController {
  constructor(private readonly accessTokenRegistryService: AccessTokenRegistryService) {}

  @Post(ACCESS_TOKEN_POST_PATHS)
  async set(@Param('type') type: string, @Req() req, @Body() body) {
    return this.accessTokenRegistryService.request(this.resolveType(type, req), body);
  }

  // 获取当前平台token定时任务的下次触发时间
  @Get(ACCESS_TOKEN_LIST_PATHS)
  async get(@Param('type') type: string, @Req() req) {
    return {
      nextUpdateTime: this.accessTokenRegistryService.getNextUpdateTime(this.resolveType(type, req)),
    };
  }

  private resolveType(type: string, req) {
    if (type) {
      return type;
    }

    // 兼容历史接口：/weixin、/HMS 等路径没有 :type 参数，需要从URL首段反推平台类型。
    return (req.path || '').replace(/^\//, '').split('/')[0];
  }
}
