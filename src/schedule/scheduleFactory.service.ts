import { Injectable } from "@nestjs/common";

const nodeSchedule = require('node-schedule');

import { instanceStore } from  '../utils';
const { dLog } = require('@daozhao/utils');

@Injectable()
export class ScheduleFactoryService {
  constructor() {
  }
  make(type, key, fetchData, scheduleMinutes = 60) {
    const label = `${key}-@-${type}`;

    const scheduleJobInstance = {
      getInstance() {
        return instanceStore.getItem(type);
      },
      setInstance(value) {
        return instanceStore.setItem(type, value);
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
      if (scheduleJobInstance.getInstance()) {
        scheduleJobInstance.getInstance().cancel();
      }

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

    return {
      label,
      setSchedule,
      scheduleJobInstance,
    }
  }
}
