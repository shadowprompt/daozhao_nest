import { Injectable } from "@nestjs/common";

import { AccessTokenFactoryService } from "./accessTokenFactory.service";
import { weixinAccessTokenDto } from "./dto/schedule.dto";
const {WXMIN_APPID, WXMIN_APPSECRET, WXMIN_API_URL, DAOZHAO_SCHEDULE_SERVER} = require('@daozhao/config');

const params = {
  grant_type: 'client_credential',
  appid: WXMIN_APPID,
  secret: WXMIN_APPSECRET,
};

@Injectable()
export class WeixinService {
  constructor(private readonly accessTokenServiceFactoryService: AccessTokenFactoryService) {}
  make() {
    return this.accessTokenServiceFactoryService.make(weixinAccessTokenDto, {
      url: WXMIN_API_URL + '/cgi-bin/token',
      method: 'GET',
      params,
    }, (data) => {
      if (data.errcode || data.errmsg) {
        return data.errcode + ':' + data.errmsg;
      }
    }, DAOZHAO_SCHEDULE_SERVER + '/weixin');
  }
}
