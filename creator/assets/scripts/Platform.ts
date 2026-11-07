import { sys, view } from 'cc';

const host: any = globalThis as any;
const api = host.wx || host.tt;

// Browser notch/home-indicator insets in CSS pixels (0 when the page is not edge-to-edge).
function webSafeArea() {
  const document = host.document;
  if (!document?.body || !host.getComputedStyle) return { top: 0, bottom: 0 };
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
  document.body.appendChild(probe);
  const style = host.getComputedStyle(probe);
  const result = { top: parseFloat(style.paddingTop) || 0, bottom: parseFloat(style.paddingBottom) || 0 };
  probe.remove();
  return result;
}

export const platform = {
  // True on the mini program (wx/tt), where the native capsule sits on top of the canvas and the
  // layout has to leave room for it. Web builds are only constrained by the notch safe area.
  get mini(): boolean { return !!api; },
  read(name: string): string | null {
    const value = api ? api.getStorageSync(name) : sys.localStorage.getItem(name);
    return value === '' || value == null ? null : String(value);
  },
  write(value: string, name: string) {
    if (api) api.setStorageSync(name, value);
    else sys.localStorage.setItem(name, value);
  },
  remove(name: string) {
    if (api) api.removeStorageSync(name);
    else sys.localStorage.removeItem(name);
  },
  insets() {
    const visible = view.getVisibleSize();
    if (!api) {
      const safe = webSafeArea();
      const scale = host.innerWidth ? visible.width / host.innerWidth : 1;
      return { top: Math.max(18, (safe.top + 8) * scale), bottom: Math.max(16, safe.bottom * scale) };
    }
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
  // Studio header shares the capsule row, so it starts at the status bar instead of below the capsule.
  // Returns the header top plus the width the capsule occupies on the right.
  header() {
    const visible = view.getVisibleSize();
    if (!api) {
      const safe = webSafeArea();
      const scale = host.innerWidth ? visible.width / host.innerWidth : 1;
      return { top: Math.max(14, safe.top * scale), capsule: 0 };
    }
    try {
      const info = api.getWindowInfo ? api.getWindowInfo() : api.getSystemInfoSync();
      const scale = visible.width / info.windowWidth;
      const capsule = api.getMenuButtonBoundingClientRect?.();
      const status = info.statusBarHeight || 24;
      const top = Math.max(status, info.safeArea?.top || 0, (capsule?.top || status) - 4);
      const reserved = capsule ? (info.windowWidth - capsule.left) * scale + 12 : 0;
      return { top: top * scale, capsule: reserved };
    } catch {
      return { top: 48, capsule: 96 };
    }
  },
  onHide(callback: () => void) {
    api?.onHide?.(callback);
  }
};