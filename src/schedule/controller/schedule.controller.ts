import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { UpdateListService } from "../../common/service/storage/updateList.service";
import { scheduleStorageDto } from "../dto/schedule.dto";
import { StorageListItemDto } from "../../common/dto/storage.dto";
import { ScheduleService } from "../service/schedule.service";

@Controller('/schedule')
export class ScheduleController {
  constructor(
    private readonly updateListService: UpdateListService,
    private readonly scheduleService: ScheduleService,
  ) {
  }

  @Get()
  getList(@Query() query): Object {
    return this.updateListService.get(scheduleStorageDto)
  }

  // @Post()
  // updateList(@Body() body): Object {
  //   const list: Array<StorageListItemDto> = body.list || [];
  //   return this.updateListService.set(scheduleStorageDto, list)
  // }

  @Post()
  showList(@Body() body): Object {
    const list: Array<StorageListItemDto> = body.list || [];
    const res = this.scheduleService.make(list[0])
    console.log('res -> ', res);
    return 'abc'
  }
}
