import { Injectable } from "@nestjs/common";

import { AccessTokenFactoryService } from "./accessTokenFactory.service";
import { weixinAccessTokenDto } from "../dto/schedule.dto";
import { AutoStartService } from "./AutoStart.service";
const {WXMIN_APPID, WXMIN_APPSECRET, WXMIN_API_URL, DAOZHAO_SCHEDULE_SERVER} = require('@daozhao/config');

const params = {
  grant_type: 'client_credential',
  appid: WXMIN_APPID,
  secret: WXMIN_APPSECRET,
};

@Injectable()
export class WeixinService extends AutoStartService{
  public scheduleInfo;
  constructor(private readonly accessTokenServiceFactoryService: AccessTokenFactoryService) {
    super();
    this.scheduleInfo = this.make();
  }
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
