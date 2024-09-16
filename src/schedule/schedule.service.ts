import { Injectable } from "@nestjs/common";
import { dLog } from '@daozhao/utils';
import { ScheduleHandlerFactoryService } from "./scheduleHandlerFactory.service";
import { StorageListItemDto } from "../common/dto/storage.dto";

import { axios } from '../utils';

const { DAOZHAO_CRAWL_SERVER, EXAM_SCHEDULE_MINUTES  } = require('@daozhao/config');

@Injectable()
export class ScheduleService {
  public scheduleInfo;
  constructor(private scheduleHandlerFactoryService: ScheduleHandlerFactoryService) {}

  make(handler: StorageListItemDto) {
    const type = handler.type || 'STORE_TYPE';
    const key = handler.key || 'STORE_KEY';
    const serverUrl = handler.serverUrl || DAOZHAO_CRAWL_SERVER;
    const pathName = handler.pathName || '/pathName';
    const minutes = handler.scheduleMinutes || EXAM_SCHEDULE_MINUTES;
    const postData = handler.postData || {};

    const fetchData = () => {
      dLog(`fetchData ${serverUrl + pathName}`);
      return axios.post(serverUrl + pathName, postData);
    }
    const { label, setSchedule, cancelSchedule, scheduleJobInstance, requestHandler } = this.scheduleHandlerFactoryService.make(handler, fetchData);
    
    return {
      label,
      pathName,
      fetchData,
      setSchedule,
      cancelSchedule,
      scheduleJobInstance,
      requestHandler,
    };
  }
}
