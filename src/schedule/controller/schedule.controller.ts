import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { UpdateListService } from "../../common/service/storage/updateList.service";
import { scheduleStorageDto } from "../dto/schedule.dto";
import { StorageListItemDto } from "../../common/dto/storage.dto";

@Controller('/schedule')
export class ScheduleController {
  constructor(
    private readonly updateListService: UpdateListService,
  ) {
  }

  @Get()
  getList(@Query() query): Object {
    return this.updateListService.get(scheduleStorageDto)
  }

  @Post()
  updateList(@Body() body): Object {
    const list: Array<StorageListItemDto> = body.list || [];
    return this.updateListService.set(scheduleStorageDto, list)
  }
}
