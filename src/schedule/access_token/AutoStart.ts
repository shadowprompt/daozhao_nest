import { OnModuleInit } from "@nestjs/common";

// 在模块初始化后成功直接执行requestHandler， 从官网获取一次
export class AutoStart implements OnModuleInit {
  public scheduleInfo: any;
  onModuleInit(): any {
    this.scheduleInfo.requestHandler({ isDirect: true});
  }
}
