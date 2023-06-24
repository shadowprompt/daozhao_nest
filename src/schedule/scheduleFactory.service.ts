import { Injectable } from "@nestjs/common";

const nodeSchedule = require('node-schedule');

import { instanceStore } from  '../utils';
import { AccessTokenScheduleInfoDto } from "./dto/schedule.dto";
const { dLog } = require('@daozhao/utils');

@Injectable()
export class ScheduleFactoryService {
  constructor() {
  }
  make(accessTokenScheduleInfoDto: AccessTokenScheduleInfoDto, fetchData) {
    const label = `${accessTokenScheduleInfoDto.key}-@-${accessTokenScheduleInfoDto.type}`;

    const scheduleJobInstance = {
      getInstance() {
        return instanceStore.getItem(accessTokenScheduleInfoDto.type);
      },
      setInstance(value) {
        return instanceStore.setItem(accessTokenScheduleInfoDto.type, value);
      }
    };
    /**
     * 设置定时任务并返回定时任务实例
     * @param minutes
     * @returns {*}
     */
    function setSchedule(minutes) {
      dLog(`===更新 ${label} 定时任务 -> `);
      const nextTime = Date.now() + minutes * 60 * 1000;
      cancelSchedule();

      scheduleJobInstance.setInstance(
        nodeSchedule.scheduleJob(nextTime, () => {
          dLog(`执行 ${label} 定时任务`);
          fetchData({isDirect: true}).catch((err) =>
            dLog(`定时请求 ${label} 失败`, err),
          );
          setSchedule(minutes);
        }));
      return scheduleJobInstance.getInstance();
    }

    function cancelSchedule() {
      if (scheduleJobInstance.getInstance()) {
        scheduleJobInstance.getInstance().cancel();
      }
    }

    return {
      label,
      setSchedule,
      cancelSchedule,
      scheduleJobInstance,
    }
  }
}
