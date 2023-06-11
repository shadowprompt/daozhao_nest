import { OnModuleInit } from "@nestjs/common";

// 在模块初始化后成功直接执行requestHandler
export class AutoStartService implements OnModuleInit {
  public scheduleInfo: any;
  onModuleInit(): any {
    this.scheduleInfo.requestHandler({
      isDirect: true,
    });
  }
}
