import { sys, view } from 'cc';

const host: any = globalThis as any;
const api = host.wx || host.tt;
const key = 'sunlight-studio-v2';

export const platform = {
  read(name = key): string | null {
    const value = api ? api.getStorageSync(name) : sys.localStorage.getItem(name);
    return value === '' || value == null ? null : String(value);
  },
  write(value: string, name = key) {
    if (api) api.setStorageSync(name, value);
    else sys.localStorage.setItem(name, value);
  },
  insets() {
    const visible = view.getVisibleSize();
    if (!api) return { top: 18, bottom: 16 };
    try {
      const info = api.getWindowInfo ? api.getWindowInfo() : api.getSystemInfoSync();
      const scale = visible.width / info.windowWidth;
      const capsule = api.getMenuButtonBoundingClientRect?.();
      const top = Math.max(info.statusBarHeight || 24, capsule?.bottom || 80, info.safeArea?.top || 0);
      const bottom = Math.max(0, (info.screenHeight || info.windowHeight) - (info.safeArea?.bottom || info.screenHeight || info.windowHeight));
      return { top: (top + 10) * scale, bottom: Math.max(16, bottom * scale) };
    } catch {
      return { top: 96, bottom: 24 };
    }
  },
  onHide(callback: () => void) {
    api?.onHide?.(callback);
  },
  async copy(text: string): Promise<void> {
    if (api) {
      return new Promise((resolve, reject) => api.setClipboardData({ data: text, success: () => resolve(), fail: reject }));
    }
    if (host.navigator?.clipboard) return host.navigator.clipboard.writeText(text);
    throw new Error('剪贴板不可用，请使用存档窗口中的文本。');
  },
  async download(text: string) {
    if (api || !host.document) return this.copy(text);
    const url = host.URL.createObjectURL(new host.Blob([text], { type: 'application/json' }));
    const link = host.document.createElement('a');
    link.href = url;
    link.download = 'sunlight-studio-save.json';
    link.click();
    host.setTimeout(() => host.URL.revokeObjectURL(url), 1000);
  }
};