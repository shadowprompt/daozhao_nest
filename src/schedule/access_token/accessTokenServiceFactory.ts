import { axios, nodeStore } from '../../utils/index';
const { dLog } = require('@daozhao/utils');
import serviceFactory from './serviceFactory';
import { AccessTokenInfoDto } from "../dto/schedule.dto";

// 完成对官网接口请求的组装任务
function accessTokenServiceFactory(accessTokenInfoDto: AccessTokenInfoDto,
                                   params,
                                   httpError: (data) => string,
                                   daozhaoUrl) {
  const localStorage = nodeStore('../../../localStorage/' + accessTokenInfoDto.type);
  const label = `${accessTokenInfoDto.key}-@-${accessTokenInfoDto.type}`;

  const isAccessTokenValidated = () => {
    return new Promise((resolve) => {
      dLog(`尝试从缓存取${label}`);
      const oldAccessToken = localStorage.getItem(accessTokenInfoDto.key);
      let expires_in = 0;
      let access_token;
      if (oldAccessToken) {
        const accessTokenObj = JSON.parse(oldAccessToken);
        expires_in = accessTokenObj.expires_in;
        access_token = accessTokenObj.access_token;
      }
      if (expires_in && expires_in - Date.now()) {
        resolve({
          access_token,
          expires_in,
        });
      } else {
        resolve({});
      }
    });
  };

  const fetchAccessToken = (requestBody) => {
    return new Promise(async (resolve, reject) => {
      const queryAccessTokenFromOfficial = () => {
        dLog(`直接官网请求${label}`);
        // 更加params实现各自官网请求access_token流程
        axios(params).then((response) => {
          const data = response.data || {};
          const errMsg = httpError(data);
          if (errMsg) {
            return reject({
              errMsg,
            })
          }

          const newAccessToken = {
            ...data,
            expires_in: Date.now() + data.expires_in * 1000 - 60000, // 避免和官网服务器之前时间不一致，减少1分钟有效期
          };
          localStorage.setItem(accessTokenInfoDto.key, JSON.stringify(newAccessToken));
          resolve({
            accessToken: newAccessToken,
            _source: 'official',
          });
        }).catch((err) => {
          const msg = {
            errMsg: `官网请求${label}失败：${err.message}`,
          };
          return reject(msg);
        });
      };

      const queryAccessTokenFromDaozhao = () => {
        axios.post(daozhaoUrl).then(res => {
          const data = res.data;
          resolve({
            accessToken: data.accessToken,
            _source: 'Daozhao',
          })
        })
      }

      const isDirect = requestBody.isDirect;
      // 用isDirect=true，直接走官网请求
      if (isDirect) {
        return queryAccessTokenFromOfficial();
      } else if (process.env.NODE_ENV === 'development' ) {
        return queryAccessTokenFromDaozhao();
      }
      const oldAccessToken = await isAccessTokenValidated();
      if (oldAccessToken) {
        resolve({
          accessToken: oldAccessToken,
          _source: 'local cache',
        });
      } else {
        queryAccessTokenFromOfficial();
      }
    });
  };

  function requestHandler(requestBody) {
    return fetchAccessToken(requestBody)
      .then(({ accessToken, _source }) => {
        // 以下场景需要新建定时任务了
        // 1. 是从微信官网新获取的token;
        // 2. 是从缓存获取的token，但是没有定时任务实例了
        let instance = scheduleJobInstance.getInstance();
        if (_source === 'official' || !instance) {
          instance = setSchedule(accessTokenInfoDto.TOKEN_SCHEDULE_MINUTES);
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

  const { setSchedule, scheduleJobInstance } = serviceFactory(accessTokenInfoDto, fetchAccessToken);

  return {
    label,
    setSchedule,
    scheduleJobInstance,
    fetchData: fetchAccessToken,
    requestHandler,
  }
}

export default accessTokenServiceFactory;
