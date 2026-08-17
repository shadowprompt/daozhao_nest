import { Injectable, OnModuleInit } from "@nestjs/common";
import { AccessTokenFactoryService } from "./accessTokenFactory.service";
import { AccessTokenScheduleInfoDto } from "../dto/schedule.dto";

const qs = require('querystring');
const daozhaoConfig = require('@daozhao/config');

type AccessTokenPlatformConfig = {
  type: string;
  key?: string;
  scheduleMinutes?: number;
  daozhaoPath: string;
  requestOptions: () => any;
  httpError?: (data: any) => string;
};

const readConfig = (key: string) => process.env[key] || daozhaoConfig[key];

const weixinError = (data) => {
  if (data.errcode || data.errmsg) {
    return data.errcode + ':' + data.errmsg;
  }
}

const makeWeixinOptions = (appidKey: string, secretKey: string) => ({
  url: readConfig('WXMIN_API_URL') + '/cgi-bin/token',
  method: 'GET',
  params: {
    grant_type: 'client_credential',
    appid: readConfig(appidKey),
    secret: readConfig(secretKey),
  },
});

const makeHmsOptions = (clientIdKey: string, clientSecretKey: string) => ({
  url: readConfig('HMS_API_URL'),
  method: 'post',
  data: qs.stringify({
    grant_type: 'client_credentials',
    client_id: readConfig(clientIdKey),
    client_secret: readConfig(clientSecretKey),
  }),
  headers: {
    'content-type': 'application/x-www-form-urlencoded;charset=utf-8'
  }
});

export const ACCESS_TOKEN_PLATFORMS: AccessTokenPlatformConfig[] = [
  {
    type: 'weixin',
    daozhaoPath: '/weixin',
    requestOptions: () => makeWeixinOptions('WXMIN_APPID', 'WXMIN_APPSECRET'),
    httpError: weixinError,
  },
  {
    type: 'weixinFitconverter',
    daozhaoPath: '/weixinFitconverter',
    requestOptions: () => makeWeixinOptions('FITCONVERTER_WX_APPID', 'FITCONVERTER_WX_APPSECRET'),
    httpError: weixinError,
  },
  {
    type: 'wxminFitconverter',
    daozhaoPath: '/wxminFitconverter',
    requestOptions: () => makeWeixinOptions('FITCONVERTER_WXMIN_APPID', 'FITCONVERTER_WXMIN_APPSECRET'),
    httpError: weixinError,
  },
  {
    type: 'HMS',
    daozhaoPath: '/HMS',
    requestOptions: () => makeHmsOptions('HMS_CLIENT_ID', 'HMS_CLIENT_SECRET'),
    httpError: weixinError,
  },
  {
    type: 'HMS_HI',
    daozhaoPath: '/HMS_HI',
    requestOptions: () => makeHmsOptions('HMS_CLIENT_ID_HI', 'HMS_CLIENT_SECRET_HI'),
    httpError: weixinError,
  },
  {
    type: 'HMS_webPush',
    daozhaoPath: '/HMS_webPush',
    requestOptions: () => makeHmsOptions('HMS_CLIENT_ID_WEB', 'HMS_CLIENT_SECRET_WEB'),
    httpError: weixinError,
  },
];

export const ACCESS_TOKEN_TYPES = ACCESS_TOKEN_PLATFORMS.map(item => item.type);
export const ACCESS_TOKEN_POST_PATHS = ACCESS_TOKEN_TYPES.concat(['access-token/:type']);
export const ACCESS_TOKEN_LIST_PATHS = ACCESS_TOKEN_TYPES.map(type => `${type}/list`).concat(['access-token/:type/list']);

@Injectable()
export class AccessTokenRegistryService implements OnModuleInit {
  private scheduleInfoMap = new Map<string, any>();
  private platformMap = new Map<string, AccessTokenPlatformConfig>(
    ACCESS_TOKEN_PLATFORMS.map(item => [item.type, item]),
  );

  constructor(private readonly accessTokenFactoryService: AccessTokenFactoryService) {}

  onModuleInit() {
    ACCESS_TOKEN_TYPES.forEach(type => {
      Promise.resolve().then(async () => {
        // 平台 token 服务启动时主动刷新一次，保证首次调用不拿旧缓存。
        await this.getScheduleInfo(type).requestHandler({ isDirect: true });
      }).catch(err => {
        console.log('access token auto start error -> ', type, err.message);
      });
    });
  }

  getTypes() {
    return ACCESS_TOKEN_TYPES;
  }

  getScheduleInfo(type: string) {
    const platform = this.platformMap.get(type);
    if (!platform) {
      throw new Error(`unknown access token type: ${type}`);
    }

    if (!this.scheduleInfoMap.has(type)) {
      const scheduleInfoDto: AccessTokenScheduleInfoDto = {
        type,
        key: platform.key || 'accessToken',
        scheduleMinutes: platform.scheduleMinutes || 120,
      };
      this.scheduleInfoMap.set(type, this.accessTokenFactoryService.make(
        scheduleInfoDto,
        platform.requestOptions(),
        platform.httpError || (() => ''),
        readConfig('DAOZHAO_SCHEDULE_SERVER') + platform.daozhaoPath,
      ));
    }

    return this.scheduleInfoMap.get(type);
  }

  request(type: string, body: any) {
    return this.getScheduleInfo(type).requestHandler(body || {});
  }

  getNextUpdateTime(type: string) {
    const scheduleJobInstance = this.getScheduleInfo(type).scheduleJobInstance.getInstance();
    return scheduleJobInstance && scheduleJobInstance.nextInvocation() || 0;
  }
}
