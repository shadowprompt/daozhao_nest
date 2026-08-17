# AppGallery 版本扫描服务交接说明

本文档用于后续 AI 或开发者继续接手当前项目的 AppGallery 应用版本扫描需求。

## 当前目标

项目新增了一个定期扫描华为 AppGallery 主流应用版本更新的服务。它会：

1. 维护一组需要监控的 App 包名列表。
2. 定期请求 AppGallery 详情接口获取当前版本。
3. 将版本快照保存在本地 `node-localstorage`。
4. 下次扫描时对比 `version` 和 `versionCode`，识别版本变化。
5. 提供接口查询监控列表、搜索包名、检查是否监控、查询单个应用版本、查看扫描结果。

## 相关文件

核心实现：

```text
src/schedule/appgallery/appgallery.dto.ts
src/schedule/appgallery/appgallery.service.ts
src/schedule/appgallery/appgallery.controller.ts
```

模块注册：

```text
src/schedule/schedule.module.ts
```

API 文档：

```text
.docs/schedule-handler-token-api.md
```

## 启动方式

启动 Nest 服务后，AppGallery 扫描服务会自动启动：

```bash
yarn start
```

或开发模式：

```bash
yarn start:dev
```

服务启动后会自动扫描一次，并设置下一次定时扫描。

默认端口：

```text
5566
```

## 环境变量

扫描周期，单位分钟：

```bash
APPGALLERY_SCAN_MINUTES=360
```

AppGallery 应用详情接口：

```bash
APPGALLERY_APPINFO_URL=https://web-drcn.hispace.dbankcloud.com/edge/webedge/appinfo
```

AppGallery 搜索接口：

```bash
APPGALLERY_SEARCH_URL=https://web-drcn.hispace.dbankcloud.com/edge/index/completeSearchWord
```

这些环境变量都不是必填；未配置时使用代码中的默认值。

## 当前接口

查看监控应用列表：

```bash
curl http://localhost:5566/appgallery/apps
```

更新监控应用列表：

```bash
curl -X POST http://localhost:5566/appgallery/apps \
  -H "Content-Type: application/json" \
  -d '{
    "list": [
      {
        "packageName": "com.tencent.mm",
        "name": "微信"
      }
    ]
  }'
```

检查某个包名是否已监控：

```bash
curl http://localhost:5566/appgallery/apps/com.tencent.mm/watched
```

按应用名搜索包名：

```bash
curl "http://localhost:5566/appgallery/search?keyword=微信"
```

查询单个应用当前版本：

```bash
curl http://localhost:5566/appgallery/apps/com.tencent.mm/version
```

手动触发扫描：

```bash
curl -X POST http://localhost:5566/appgallery/scan \
  -H "Content-Type: application/json" \
  -d '{}'
```

查看最近一次扫描结果：

```bash
curl http://localhost:5566/appgallery/versions
```

查看下一次扫描时间：

```bash
curl http://localhost:5566/appgallery/list
```

停止定时扫描：

```bash
curl http://localhost:5566/appgallery/stop
```

## 默认监控列表

默认列表定义在：

```text
src/schedule/appgallery/appgallery.dto.ts
```

当前包含：

```text
com.tencent.mm - 微信
com.tencent.mobileqq - QQ
com.eg.android.AlipayGphone - 支付宝
com.ss.android.ugc.aweme - 抖音
com.taobao.taobao - 淘宝
com.jingdong.app.mall - 京东
com.sina.weibo - 微博
com.baidu.searchbox - 百度
com.autonavi.minimap - 高德地图
com.tencent.mtt - QQ浏览器
com.netease.cloudmusic - 网易云音乐
com.tencent.qqmusic - QQ音乐
```

注意：一旦通过 `POST /appgallery/apps` 写入过列表，本地 storage 中的列表会覆盖默认列表。

## 本地存储

该服务沿用项目已有的 `node-localstorage` 机制。

存储 key 定义在：

```text
src/schedule/appgallery/appgallery.dto.ts
```

包含：

```text
appgallery/watchedApps
appgallery/versionSnapshot
appgallery/lastScanResult
```

含义：

```text
watchedApps - 当前监控列表
versionSnapshot - 各包名最近一次成功获取到的版本快照
lastScanResult - 最近一次扫描结果，包含 changed/unchanged/failed
```

## 实现细节

`AppGalleryService` 启动时会调用 `scan({ isStartup: true })`。

定时任务通过项目已有的 `ScheduleFactoryService` 创建：

```text
type: appgallery
key: versionScanner
```

扫描时对每个 watched app 调用 AppGallery 详情接口：

```text
POST https://web-drcn.hispace.dbankcloud.com/edge/webedge/appinfo
```

请求体：

```json
{
  "pkgName": "com.tencent.mm"
}
```

返回中的 `version` 和 `versionCode` 会被用于判断是否更新。

首次扫描只建立基线，未命中的包不会进入 `changed`。

## 已验证

已验证 AppGallery 详情接口能返回微信版本信息：

```text
packageName: com.tencent.mm
version: 8.0.76
versionCode: 3141
appId: C5683
```

已验证 AppGallery 搜索接口能通过关键词 `微信` 返回：

```text
packageName: com.tencent.mm
name: 微信
version: 8.0.76
```

项目构建通过：

```bash
./node_modules/.bin/nest build
```

注意：`yarn build` 在当前机器上会被 Yarn/Corepack 配置拦住，之前使用 `./node_modules/.bin/nest build` 完成编译验证。

## 后续扩展建议

可继续补的能力：

1. 新增通知能力：当 `changed` 非空时发送企业微信、邮件或 webhook。
2. 新增历史记录：目前只保留最新快照和最近一次扫描结果，没有保存每次变更历史。
3. 新增单个应用加入监控接口：当前更新列表需要整体提交 `list`。
4. 新增删除单个应用接口。
5. 新增扫描并只返回变更的轻量接口。
6. 如果部署多实例，建议把 `node-localstorage` 换成 Redis 或数据库，避免多实例状态不一致。

## 注意事项

1. AppGallery 接口不是项目自有接口，未来可能变更字段或鉴权策略。
2. 搜索接口返回的字段是 `package`，服务中统一转换成 `packageName`。
3. 详情接口返回的字段是 `pkgName`，服务中统一转换成 `packageName`。
4. 不要删除现有 `console.log`，项目规则明确禁止清理调试用 console。
5. 新增文档应放在 `.docs/` 目录下。
