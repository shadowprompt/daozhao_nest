import { Controller, Get, Query } from "@nestjs/common";
import { WeixinService } from "./weixin.service";

@Controller('/schedule/weixin')
export class WeixinController {
  private scheduleInfo: { setSchedule: any; scheduleJobInstance: any; requestHandler: (requestBody) => any; label: any };
  constructor(private readonly weixinService: WeixinService) {
    this.scheduleInfo = this.weixinService.make();
  }
  @Get()
  async set(@Query() query) {
    return this.scheduleInfo.requestHandler({
      isDirect: true,
    });
  }
  // 获取当前schedule的下次触发时间
  @Get('/list')
  async get(@Query() query) {
    const scheduleJobInstance = this.scheduleInfo.scheduleJobInstance.getInstance();
    return {
      nextUpdateTime: scheduleJobInstance && scheduleJobInstance.nextInvocation() || 0,
    };
  }

}
