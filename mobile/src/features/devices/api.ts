import { api } from '@/lib/api';

export function registerDeviceToken(token: string, platform: 'ios' | 'android') {
  return api.post<void>('/device-tokens', { token, platform });
}
