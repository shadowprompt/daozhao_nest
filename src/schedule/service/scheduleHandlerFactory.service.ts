import { UpdateListService } from "../../common/service/storage/updateList.service";

const { dLog } = require('@daozhao/utils');
import { ScheduleFactoryService } from './scheduleFactory.service';
import Enum from '../../utils/Enum';
import { AbstractHttpAdapter, HttpAdapterHost } from "@nestjs/core";
import { scheduleStorageDto } from "../dto/schedule.dto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ScheduleHandlerFactoryService {
  private httpAdapter: AbstractHttpAdapter;
  constructor(private adapterHost: HttpAdapterHost,
              private scheduleFactoryService: ScheduleFactoryService,
              private updateListService:  UpdateListService
  ) {
    this.httpAdapter = this.adapterHost?.httpAdapter;
  }
  make(type, key, fetchData, defaultScheduleMinutes = 60) {

    const label = `${key}-@-${type}`;

    const { setSchedule, scheduleJobInstance } = this.scheduleFactoryService.make(type, key, fetchData);

    const that = this;

    function indexHandler(requestBody) {
      return fetchData().then(() => {
        // 从localStorage动态获取最新的配置
        const oldList = that.updateListService.get(scheduleStorageDto)
        const target = oldList.find(item => item.type === type && item.key === key);
        const scheduleMinutes = target && target.scheduleMinutes || defaultScheduleMinutes;

        const instance = setSchedule(scheduleMinutes);

        dLog(`---查询${label}成功`);
        return{
          success: true,
          nextUpdateTime: instance.nextInvocation(),
        };
      }).catch((err) => {
        dLog(`---查询${label}失败`, err);
        return {
          success: false,
          errMsg: err.errMsg
        };
      });
    }
    // 注册handler型的路由
    const router = require('express').Router();
    const instance = this.httpAdapter.getInstance();
    instance.get('/schedule/abc', (req, res) => {
      indexHandler({}).then(result => {
        res.send(result);
      });
    });

    instance.get('/schedule/list', (req, res) => {
      res.send({
        nextUpdateTime: scheduleJobInstance.getInstance() && scheduleJobInstance.getInstance().nextInvocation() || 0,
      })
    });

    return {
      label,
      setSchedule,
      scheduleJobInstance,
      indexHandler,
      router,
    }
  }
}
