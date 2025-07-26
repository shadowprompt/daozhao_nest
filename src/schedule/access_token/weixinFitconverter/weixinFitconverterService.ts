import { Injectable } from "@nestjs/common";

import { AccessTokenFactoryService } from "../accessTokenFactory.service";
import { weixinFitconverterAccessTokenDto } from "../../dto/schedule.dto";
const {FITCONVERTER_WX_APPID, FITCONVERTER_WX_APPSECRET, WXMIN_API_URL, DAOZHAO_SCHEDULE_SERVER} = process.env;

const params = {
  grant_type: 'client_credential',
  appid: FITCONVERTER_WX_APPID,
  secret: FITCONVERTER_WX_APPSECRET,
};

@Injectable()
export class weixinFitconverterService {
  public scheduleInfo;
  constructor(private readonly accessTokenServiceFactoryService: AccessTokenFactoryService) {
    this.scheduleInfo = this.make();
  }
  make() {
    return this.accessTokenServiceFactoryService.make(weixinFitconverterAccessTokenDto, {
      url: WXMIN_API_URL + '/cgi-bin/token',
      method: 'GET',
      params,
    }, (data) => {
      if (data.errcode || data.errmsg) {
        return data.errcode + ':' + data.errmsg;
      }
    }, DAOZHAO_SCHEDULE_SERVER + '/weixinFitconverter');
  }
}
