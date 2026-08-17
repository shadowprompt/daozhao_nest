import { Body, Controller, Get, NotFoundException, OnModuleInit, Param, Post, Query } from "@nestjs/common";

import { UpdateListService } from "../common/service/storage/updateList.service";
import { ScheduleInfoDto, scheduleStorageDto, storeData } from './dto/schedule.dto';
import { StorageListItemDto, StorageListUpdaterDto } from "../common/dto/storage.dto";
import { ScheduleService } from "./schedule.service";

@Controller('/handlers')
export class ScheduleController implements OnModuleInit {
  constructor(
    private readonly updateListService: UpdateListService,
    private readonly scheduleService: ScheduleService,
  ) {
  }

  onModuleInit() {
    const list = this.updateListService.get(scheduleStorageDto);
    list.forEach(item => {
      Promise.resolve().then(async () => {
        // 服务启动后恢复已保存handler的定时链路。
        await this.scheduleService.make(item).requestHandler({});
      }).catch(err => {
        console.log('handler auto start error -> ', item.pathName, err.message);
      });
    });
  }

  // 返回schedule列表信息
  @Get()
  getList(@Query() query): Object {
    return this.updateListService.get(scheduleStorageDto)
  }

  // 更新schedule列表信息
  @Post()
  updateList(@Body() body: StorageListUpdaterDto): object {
    const result: storeData =  this.updateListService.set(scheduleStorageDto, body.list);
    const { list, newList, deleteList } = result;
    newList.forEach(item => {
      // 新增或更新handler后立即触发一次，后续由固定路由按type/key分发。
      this.scheduleService.make(item).requestHandler({});
    });
    deleteList.forEach(it => {
      const scheduleJobInstance = this.scheduleService.make(it).scheduleJobInstance.getInstance();
      console.log('stop success -> ', it.pathName);
      scheduleJobInstance && scheduleJobInstance.cancel();
    })
    return list;
  }

  @Post('/run/:type/:key')
  async run(@Param('type') type: string, @Param('key') key: string, @Body() body) {
    return this.makeScheduleInfo(type, key).requestHandler(body || {});
  }

  // 获取当前handler定时任务的下次触发时间
  @Get('/run/:type/:key/list')
  async get(@Param('type') type: string, @Param('key') key: string) {
    const scheduleJobInstance = this.makeScheduleInfo(type, key).scheduleJobInstance.getInstance();
    return {
      nextUpdateTime: scheduleJobInstance && scheduleJobInstance.nextInvocation() || 0,
    };
  }

  // 终止handler定时任务
  @Get('/run/:type/:key/stop')
  async stop(@Param('type') type: string, @Param('key') key: string) {
    const scheduleJobInstance = this.makeScheduleInfo(type, key).scheduleJobInstance.getInstance();
    return {
      isCancelled: scheduleJobInstance && scheduleJobInstance.cancel(),
    };
  }

  private makeScheduleInfo(type: string, key: string): ScheduleInfoDto {
    const list = this.updateListService.get(scheduleStorageDto);
    const target = list.find(item => item.type === type && item.key === key);

    if (!target) {
      throw new NotFoundException(`handler not found: ${type}/${key}`);
    }

    return this.scheduleService.make(target);
  }
}
