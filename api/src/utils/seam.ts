import crypto from 'crypto';

// Lazy-load the Seam SDK to avoid startup errors if not installed
let SeamClass: any = null;

async function loadSeam() {
  if (!SeamClass) {
    try {
      const mod = await import('seam');
      SeamClass = mod.Seam || mod.default;
    } catch {
      console.warn('Seam SDK not available');
    }
  }
  return SeamClass;
}

const PLACEHOLDER_KEYS = ['seam_test_placeholder_use_real_key', '', undefined];

export function isSeamConfigured(): boolean {
  const key = process.env.SEAM_API_KEY;
  return !!key && !PLACEHOLDER_KEYS.includes(key);
}

export function isSeamMockMode(): boolean {
  return process.env.SEAM_MOCK === 'true';
}

// Get a Seam client instance (null if not configured and not mock mode)
let seamInstance: any = null;
export async function getSeamClient(): Promise<any | null> {
  if (isSeamMockMode()) return null; // mock mode doesn't use real client
  if (!isSeamConfigured()) return null;
  if (seamInstance) return seamInstance;
  const Seam = await loadSeam();
  if (!Seam) return null;
  seamInstance = new Seam({ apiKey: process.env.SEAM_API_KEY });
  return seamInstance;
}

// Create a Seam Connect Webview for igloohome
export async function createConnectWebview(redirectUrl: string): Promise<{ connect_webview_id: string; url: string } | null> {
  if (isSeamMockMode()) {
    const mockId = `mock_webview_${crypto.randomUUID()}`;
    // In mock mode, redirect directly back with the webview ID so the status check can run
    const sep = redirectUrl.includes('?') ? '&' : '?';
    return { connect_webview_id: mockId, url: `${redirectUrl}${sep}seam_webview_id=${mockId}&mock=1` };
  }
  const seam = await getSeamClient();
  if (!seam) return null;
  try {
    const webview = await seam.connectWebviews.create({
      accepted_providers: ['igloohome'],
      custom_redirect_url: redirectUrl,
    });
    return { connect_webview_id: webview.connect_webview_id, url: webview.url };
  } catch (err) {
    console.error('Seam createConnectWebview error:', err);
    return null;
  }
}

// Check status of a Connect Webview and return connected_account_id if authorized
export async function getConnectWebviewStatus(
  connectWebviewId: string
): Promise<{ status: string; connected_account_id?: string } | null> {
  if (isSeamMockMode()) {
    // In mock mode, always return "authorized" immediately with a fake connected_account_id
    const mockAccountId = `mock_account_${connectWebviewId}`;
    return { status: 'authorized', connected_account_id: mockAccountId };
  }
  const seam = await getSeamClient();
  if (!seam) return null;
  try {
    const webview = await seam.connectWebviews.get({ connect_webview_id: connectWebviewId });
    return {
      status: webview.status,
      connected_account_id: webview.connected_account_id ?? undefined,
    };
  } catch (err) {
    console.error('Seam getConnectWebviewStatus error:', err);
    return null;
  }
}

// List igloohome devices for a connected account
export async function listDevices(connectedAccountId: string): Promise<Array<{ device_id: string; display_name: string; device_type: string }>> {
  if (isSeamMockMode()) {
    return [
      { device_id: `mock_device_${connectedAccountId}_1`, display_name: 'igloohome Keybox 3', device_type: 'igloohome_keybox' },
      { device_id: `mock_device_${connectedAccountId}_2`, display_name: 'igloohome Keybox 3 (Rear)', device_type: 'igloohome_keybox' },
    ];
  }
  const seam = await getSeamClient();
  if (!seam) return [];
  try {
    const devices = await seam.devices.list({ connected_account_id: connectedAccountId });
    return devices
      .filter((d: any) => d.device_type?.toLowerCase().includes('igloohome'))
      .map((d: any) => ({
        device_id: d.device_id,
        display_name: d.display_name || d.properties?.name || 'Unknown device',
        device_type: d.device_type,
      }));
  } catch (err) {
    console.error('Seam listDevices error:', err);
    return [];
  }
}

// Create an offline algoPIN access code on an igloohome device
export async function createOfflineAccessCode(
  deviceId: string,
  memberName: string,
  startsAt: Date,
  endsAt: Date
): Promise<{ code: string; access_code_id: string } | null> {
  if (isSeamMockMode()) {
    // Generate a realistic 7-9 digit algoPIN
    const len = 7 + Math.floor(Math.random() * 3);
    const num = Math.floor(Math.random() * (Math.pow(10, len) - Math.pow(10, len - 1))) + Math.pow(10, len - 1);
    const code = String(num);
    const access_code_id = `mock_code_${crypto.randomUUID()}`;
    console.log(`[Seam MOCK] Created offline algoPIN: ${code} for device ${deviceId}`);
    return { code, access_code_id };
  }

  const seam = await getSeamClient();
  if (!seam) return null;

  try {
    const result = await seam.accessCodes.create({
      device_id: deviceId,
      name: `GymAccess - ${memberName}`,
      is_offline_access_code: true,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    });
    return { code: result.code, access_code_id: result.access_code_id };
  } catch (err) {
    console.error('Seam createOfflineAccessCode error:', err);
    return null;
  }
}

// Delete an access code from Seam
export async function deleteAccessCode(accessCodeId: string): Promise<boolean> {
  if (isSeamMockMode()) {
    console.log(`[Seam MOCK] Deleted access code: ${accessCodeId}`);
    return true;
  }
  if (accessCodeId.startsWith('mock_')) return true; // skip mock IDs in real mode

  const seam = await getSeamClient();
  if (!seam) return false;

  try {
    await seam.accessCodes.delete({ access_code_id: accessCodeId });
    return true;
  } catch (err) {
    console.error('Seam deleteAccessCode error:', err);
    return false;
  }
}
