import { Injectable } from '@nestjs/common';
import { VersionService } from '../../common/service/storage/version.service';
import { pwaVersionStorage } from '../dto/storage.dto';

@Injectable()
export class PostService {
  // 直接使用VersionService的能力
  constructor(private readonly versionService: VersionService) {}

  getQuery(query): Object {
    const version = this.versionService.get(pwaVersionStorage);

    const [prevVersion, newVersion] = this.versionService.set(
      pwaVersionStorage,
      query,
      (lastVersion, bodyParams) => {
        const targetVersionText = bodyParams.version || lastVersion;
        const [main, sub, fix] = targetVersionText.split('.');
        const fixNum = parseInt(fix) + 1 + '';
        return [main, sub, fixNum.padStart(4, '0')].join('.');
      },
    );

    return {
      version,
      prevVersion,
      newVersion,
    };
  }
}
