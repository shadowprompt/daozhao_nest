import { Injectable } from "@nestjs/common";

import { AccessTokenFactoryService } from "../accessTokenFactory.service";
import { wxminFitconverterAccessTokenDto } from "../../dto/schedule.dto";
const {FITCONVERTER_WXMIN_APPID, FITCONVERTER_WXMIN_APPSECRET, WXMIN_API_URL, DAOZHAO_SCHEDULE_SERVER} = process.env;

const params = {
  grant_type: 'client_credential',
  appid: FITCONVERTER_WXMIN_APPID,
  secret: FITCONVERTER_WXMIN_APPSECRET,
};

@Injectable()
export class wxminFitconverterService {
  public scheduleInfo;
  constructor(private readonly accessTokenServiceFactoryService: AccessTokenFactoryService) {
    this.scheduleInfo = this.make();
  }
  make() {
    return this.accessTokenServiceFactoryService.make(wxminFitconverterAccessTokenDto, {
      url: WXMIN_API_URL + '/cgi-bin/token',
      method: 'GET',
      params,
    }, (data) => {
      if (data.errcode || data.errmsg) {
        return data.errcode + ':' + data.errmsg;
      }
    }, DAOZHAO_SCHEDULE_SERVER + '/wxminFitconverter');
  }
}
