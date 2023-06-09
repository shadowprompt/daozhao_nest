import { Body, Controller, Get, Param, Post, Query, Type } from "@nestjs/common";
const {DAOZHAO_SCHEDULE_SERVER} = require('@daozhao/config');
import { axios } from "../utils/index";

import { UpdateListService } from "../common/service/storage/updateList.service";
import { ScheduleInfoDto, scheduleStorageDto } from "./dto/schedule.dto";
import { StorageListItemDto, StorageListUpdaterDto } from "../common/dto/storage.dto";
import { ScheduleService } from "./schedule.service";
import { AutoStart } from "./access_token/AutoStart";

@Controller('/handlers')
export class ScheduleController {
  constructor(
    private readonly updateListService: UpdateListService,
    private readonly scheduleService: ScheduleService,
  ) {
  }

  // 返回schedule列表信息
  @Get()
  getList(@Query() query): Object {
    return this.updateListService.get(scheduleStorageDto)
  }

  // 更新schedule列表信息
  @Post()
  updateList(@Body() body: StorageListUpdaterDto): object {
    const result =  this.updateListService.set(scheduleStorageDto, body.list);
    const { list, newList, deleteList } = result;
    newList.forEach(item => {
      // 生成Controller，触发requestHandler
      const ControllerClass = ScheduleControllerMaker(item);
      const controller = new ControllerClass(this.scheduleService)
      controller.scheduleInfo.requestHandler({});
    });
    deleteList.forEach(it => {
      axios.get(DAOZHAO_SCHEDULE_SERVER + it.pathName +  '/stop').then(() => {
        console.log('stop success -> ', it.pathName);
      }).catch(err => {
        console.log('stop error -> ', it.pathName, err.message);
      })
    })
    return list;
  }
}

export function ScheduleControllerMaker(storageListItemDto: StorageListItemDto): Type<any> {
  @Controller()
  class ScheduleController extends AutoStart {
    public scheduleInfo: ScheduleInfoDto;
    constructor(private scheduleService: ScheduleService) {
      super();
      this.scheduleInfo = this.scheduleService.make(storageListItemDto);
    }

    @Post([storageListItemDto.pathName])
    async set(@Body() body) {
      return this.scheduleInfo.requestHandler(body);
    }
    // 获取当前schedule的下次触发时间
    @Get([storageListItemDto.pathName + '/list'])
    async get(@Query() query) {
      const scheduleJobInstance = this.scheduleInfo.scheduleJobInstance.getInstance();
      return {
        nextUpdateTime: scheduleJobInstance && scheduleJobInstance.nextInvocation() || 0,
      };
    }
    // 终止schedule
    @Get([storageListItemDto.pathName + '/stop'])
    async stop(@Query() query) {
      const scheduleJobInstance = this.scheduleInfo.scheduleJobInstance.getInstance();
      return {
        isCancelled: scheduleJobInstance && scheduleJobInstance.cancel(),
      };
    }
  }
  return ScheduleController;
}
