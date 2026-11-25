import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { BACKEND_URL } from '../constants';

export interface UpdateStatus {
  /** Installed build is below the minimum: block until the user updates. */
  required: boolean;
  /** Newer build exists (dismissible nudge). */
  available: boolean;
  /** Build number of the newest release, used to remember a dismissal. */
  latestVersionCode: number;
  storeUrl: string;
}

const CONFIG_TIMEOUT_MS = 5_000;

/**
 * Asks the backend (GET /api/app-config) whether this installed build is too
 * old. Fails OPEN: on any error, timeout, missing store link or unreadable
 * build number it returns null and the app simply carries on.
 */
export async function checkForUpdate(): Promise<UpdateStatus | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS);
  try {
    const installed = Number(DeviceInfo.getBuildNumber());
    if (!Number.isFinite(installed) || installed <= 0) return null;

    const res = await fetch(`${BACKEND_URL}/api/app-config`, { signal: controller.signal });
    if (!res.ok) return null;
    const cfg: any = await res.json();

    const min = Number(cfg?.minVersionCode) || 0;
    const latest = Number(cfg?.latestVersionCode) || 0;
    const storeUrl: unknown = Platform.OS === 'ios' ? cfg?.storeUrls?.ios : cfg?.storeUrls?.android;
    // Without a store link there is nowhere to send the user — never dead-end them.
    if (typeof storeUrl !== 'string' || storeUrl.length === 0) return null;

    const required = min > 0 && installed < min;
    const available = latest > 0 && installed < latest;
    if (!required && !available) return null;
    return { required, available, latestVersionCode: Math.max(latest, min), storeUrl };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}