import { AppGalleryService } from './appgallery.service';
import { axios } from '../../utils';

const mockStorage: Record<string, any> = {};

jest.mock('@daozhao/utils', () => ({
  dLog: jest.fn(),
}));

jest.mock('../../utils', () => ({
  axios: {
    post: jest.fn(),
  },
  getLocalData: jest.fn((storage) => {
    if (mockStorage[storage.key] !== undefined) {
      return JSON.parse(JSON.stringify(mockStorage[storage.key]));
    }
    return JSON.parse(storage.emptyValue);
  }),
  setLocalData: jest.fn((storage, value) => {
    mockStorage[storage.key] = JSON.parse(JSON.stringify(value));
    return value;
  }),
}));

describe('AppGalleryService notification outbox', () => {
  const scheduleFactoryService = {
    make: jest.fn(() => ({
      setSchedule: jest.fn(),
      cancelSchedule: jest.fn(),
      scheduleJobInstance: {
        getInstance: jest.fn(() => ({
          nextInvocation: jest.fn(() => 0),
        })),
      },
    })),
  };

  function createService() {
    return new AppGalleryService(scheduleFactoryService as any);
  }

  function mockFetchAppInfo(service: AppGalleryService, version: string, versionCode: number) {
    jest.spyOn(service as any, 'fetchAppInfo').mockResolvedValue({
      appId: 'C100',
      packageName: 'com.test.app',
      name: '测试应用',
      version,
      versionCode,
      developerName: 'tester',
      detailUrl: 'https://appgallery.huawei.com/app/C100',
      updatedAt: 1000,
    });
  }

  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    mockStorage.watchedApps = [{ packageName: 'com.test.app', name: '测试应用' }];
    (axios.post as jest.Mock).mockReset();
    delete process.env.ECHOQB_NOTIFY_ENABLED;
    delete process.env.ECHOQB_APP_API_KEY;
    delete process.env.ECHOQB_API_BASE_URL;
    delete process.env.ECHOQB_APP_KEY;
    delete process.env.ECHOQB_CHANNEL_KEY;
    delete process.env.APPGALLERY_NOTIFY_TTL_SECONDS;
  });

  it('does not enqueue notification on baseline scan', async () => {
    const service = createService();
    mockFetchAppInfo(service, '1.0.0', 100);

    await service.scan({ skipSetSchedule: true });

    expect(service.getNotificationStatus().outbox).toEqual([]);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('enqueues and sends one aggregated notification when version changes', async () => {
    process.env.ECHOQB_NOTIFY_ENABLED = 'true';
    process.env.ECHOQB_APP_API_KEY = 'eqa_test';
    process.env.ECHOQB_API_BASE_URL = 'http://echoqb.local';
    process.env.ECHOQB_APP_KEY = 'appgallery-monitor';
    process.env.ECHOQB_CHANNEL_KEY = 'app-version-updates';
    mockStorage.versionSnapshot = {
      'com.test.app': {
        packageName: 'com.test.app',
        name: '测试应用',
        version: '1.0.0',
        versionCode: 100,
        detailUrl: 'https://appgallery.huawei.com/app/C100',
      },
    };
    (axios.post as jest.Mock).mockResolvedValue({
      data: {
        message_id: 'msg_1',
        status: 'queued',
        recipient_count: 1,
        delivery_count: 2,
      },
    });
    const service = createService();
    mockFetchAppInfo(service, '1.1.0', 110);

    await service.scan({ skipSetSchedule: true });

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, body, options] = (axios.post as jest.Mock).mock.calls[0];
    expect(url).toBe('http://echoqb.local/api/v1/open/apps/appgallery-monitor/channels/app-version-updates/messages');
    expect(body.title).toBe('AppGallery 应用版本更新');
    expect(body.content).toBe('测试应用 1.0.0 → 1.1.0');
    expect(body.action_url).toBe('https://appgallery.huawei.com/app/C100');
    expect(body.payload.type).toBe('scanner.appgallery.version_changed');
    expect(body.ttl_seconds).toBe(86400);
    expect(options.headers['X-App-API-Key']).toBe('eqa_test');
    expect(options.headers['Idempotency-Key']).toMatch(/^appgallery-version:/);
    expect(mockStorage.notificationOutbox[0].status).toBe('sent');
    expect(mockStorage.notificationOutbox[0].messageId).toBe('msg_1');
  });

  it('keeps failed notification in outbox and sends it on retry', async () => {
    process.env.ECHOQB_NOTIFY_ENABLED = 'true';
    process.env.ECHOQB_APP_API_KEY = 'eqa_test';
    mockStorage.versionSnapshot = {
      'com.test.app': {
        packageName: 'com.test.app',
        name: '测试应用',
        version: '1.0.0',
        versionCode: 100,
        detailUrl: 'https://appgallery.huawei.com/app/C100',
      },
    };
    (axios.post as jest.Mock).mockRejectedValueOnce(new Error('echoqB offline'));
    const service = createService();
    mockFetchAppInfo(service, '1.1.0', 110);

    await service.scan({ skipSetSchedule: true });

    expect(mockStorage.notificationOutbox[0].status).toBe('failed');
    expect(mockStorage.notificationOutbox[0].attempts).toBe(1);
    const idempotencyKey = mockStorage.notificationOutbox[0].idempotencyKey;

    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: {
        message_id: 'msg_retry',
        status: 'queued',
        recipient_count: 1,
        delivery_count: 2,
      },
    });

    await service.retryNotifications();

    expect(axios.post).toHaveBeenCalledTimes(2);
    expect((axios.post as jest.Mock).mock.calls[1][2].headers['Idempotency-Key']).toBe(idempotencyKey);
    expect(mockStorage.notificationOutbox[0].status).toBe('sent');
    expect(mockStorage.notificationOutbox[0].attempts).toBe(2);
    expect(mockStorage.notificationOutbox[0].messageId).toBe('msg_retry');
  });
});
