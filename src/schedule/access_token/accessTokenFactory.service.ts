import { axios, getLocalData, setLocalData } from "../../utils/index";
const { dLog } = require('@daozhao/utils');
import { AccessTokenScheduleInfoDto } from "../dto/schedule.dto";
import { Injectable } from "@nestjs/common";
import { ScheduleHandlerFactoryService } from "../scheduleHandlerFactory.service";
import { StorageDto } from "../../common/dto/storage.dto";

type AccessTokenResult = {
  accessToken: any;
  _source: string;
};

// 完成对官网接口请求的组装任务
@Injectable()
export class AccessTokenFactoryService {
  constructor(private readonly scheduleHandlerFactoryService: ScheduleHandlerFactoryService) {
  }
  make (
    accessTokenScheduleInfoDto: AccessTokenScheduleInfoDto,
    params: any,
    httpError: (data: any) => string,
    daozhaoUrl: any) {

    const storage: StorageDto = {
      name: accessTokenScheduleInfoDto.type,
      key: accessTokenScheduleInfoDto.key,
      emptyValue: `{}`,
    }
    const label = `${accessTokenScheduleInfoDto.key}-@-${accessTokenScheduleInfoDto.type}`;

    const isAccessTokenValidated = () : null | object => {
      dLog(`尝试从缓存取${label}`);
      const oldAccessToken = getLocalData(storage);
      const expires_in = oldAccessToken && oldAccessToken.expires_in;

      if (expires_in && expires_in > Date.now()) {
        return oldAccessToken;
      }

      return null;
    };

    const fetchAccessToken = async (requestBody: any = {}): Promise<AccessTokenResult> => {
      const queryAccessTokenFromOfficial = async () => {
        dLog(`直接官网请求${label}`);
        try {
          const response = await axios(params);
          const data = response.data || {};
          const errMsg = httpError(data);
          if (errMsg) {
            throw {
              errMsg,
            };
          }

          const newAccessToken = {
            ...data,
            expires_in: Date.now() + data.expires_in * 1000 - 600000, // 避免和官网服务器时间不一致，减少10分钟有效期
          };
          setLocalData(storage, newAccessToken);
          return {
            accessToken: newAccessToken,
            _source: 'official',
          };
        } catch (err) {
          throw {
            errMsg: err.errMsg || `官网请求${label}失败：${err.message}`,
          };
        }
      };

      const queryAccessTokenFromDaozhao = async () => {
        try {
          const res = await axios.post(daozhaoUrl);
          const data = res.data;
          return {
            accessToken: data.accessToken,
            _source: 'Daozhao',
          };
        } catch (err) {
          throw {
            errMsg: `Daozhao代理请求${label}失败：${err.message}`,
          };
        }
      }

      const isDirect = requestBody.isDirect;
      // 用isDirect=true，直接走官网请求
      if (isDirect) {
        return queryAccessTokenFromOfficial();
      } else if (process.env.NODE_ENV === 'development' ) {
        return queryAccessTokenFromDaozhao();
      }

      const oldAccessToken = isAccessTokenValidated();
      if (oldAccessToken) {
        return {
          accessToken: oldAccessToken,
          _source: 'local cache',
        };
      }

      return queryAccessTokenFromOfficial();
    };

    function requestHandler(requestBody) {
      return fetchAccessToken(requestBody)
        .then(({ accessToken, _source }) => {
          // 以下场景需要新建定时任务了
          // 1. 是从微信官网新获取的token;
          // 2. 是从缓存获取的token，但是没有定时任务实例了
          let instance = scheduleJobInstance.getInstance();
          if (_source === 'official' || !instance) {
            instance = setSchedule(accessTokenScheduleInfoDto.scheduleMinutes);
          }
          dLog(`---取${label}成功`, '来源 = ' + _source);
          return {
            accessToken,
            nextUpdateTime: instance.nextInvocation(),
          };
        })
        .catch((err) => {
          dLog(`---取${label}失败`, err);
          return {
            success: false,
            errMsg: err.errMsg
          };
        });
    }

    // 仅使用ScheduleHandlerFactoryService中make的schedule功能，并不使用其requestHandler等功能
    const { setSchedule, scheduleJobInstance } = this.scheduleHandlerFactoryService.make(accessTokenScheduleInfoDto, fetchAccessToken);

    return {
      label,
      setSchedule,
      scheduleJobInstance,
      fetchData: fetchAccessToken,
      requestHandler,
    }
  }
}
