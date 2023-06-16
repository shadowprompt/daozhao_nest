import { Controller, Get, Query } from "@nestjs/common";
import { WeixinService } from "./weixin.service";
import { AutoStart } from "./AutoStart";

@Controller('/weixin')
export class WeixinController extends AutoStart {
  constructor(private readonly weixinService: WeixinService) {
    super();
    this.scheduleInfo = this.weixinService.make();
  }
  @Get()
  async set(@Query() query) {
    return this.weixinService.scheduleInfo.requestHandler(query);
  }
  // 获取当前schedule的下次触发时间
  @Get('/list')
  async get(@Query() query) {
    const scheduleJobInstance = this.weixinService.scheduleInfo.scheduleJobInstance.getInstance();
    return {
      nextUpdateTime: scheduleJobInstance && scheduleJobInstance.nextInvocation() || 0,
    };
  }

}
