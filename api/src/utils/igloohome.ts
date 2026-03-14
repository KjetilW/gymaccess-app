// igloohome Direct API integration (OAuth2 client_credentials)
// API docs: https://igloocompany.stoplight.io/docs/igloohome-api
// Base URL: https://api.igloodeveloper.co/igloohome
// Token URL: https://auth.igloohome.co/oauth2/token

interface TokenCache {
  token: string;
  expiresAt: number; // Unix ms
}

// Token cache keyed by clientId to avoid cross-gym token collisions
const tokenCache = new Map<string, TokenCache>();

export function isIgloohomeConfigured(clientId?: string | null, clientSecret?: string | null): boolean {
  return !!clientId && !!clientSecret;
}

function getTokenUrl(): string {
  return process.env.IGLOOHOME_TOKEN_URL || 'https://auth.igloohome.co/oauth2/token';
}

function getApiUrl(): string {
  return process.env.IGLOOHOME_API_URL || 'https://api.igloodeveloper.co/igloohome';
}

// Format a Date as YYYY-MM-DDThh:00:00+00:00 (igloohome algoPIN requires hour-aligned UTC datetimes)
function formatIgloohomeDate(date: Date): string {
  const d = new Date(date);
  // Round down to the hour
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
         `T${pad(d.getUTCHours())}:00:00+00:00`;
}

// Fetch OAuth2 access token with in-memory caching (refreshes 60s before expiry)
// Cache is keyed by clientId to avoid cross-gym token collisions
export async function getAccessToken(clientId: string, clientSecret: string): Promise<string | null> {
  const now = Date.now();
  const cached = tokenCache.get(clientId);
  if (cached && now < cached.expiresAt - 60_000) {
    return cached.token;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch(getTokenUrl(), {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`igloohome token request failed (${response.status}): ${body}`);
      return null;
    }

    const data: any = await response.json();
    const expiresIn: number = data.expires_in || 86400; // default 24h
    tokenCache.set(clientId, {
      token: data.access_token,
      expiresAt: now + expiresIn * 1000,
    });
    return data.access_token;
  } catch (err) {
    console.error('igloohome getAccessToken error:', err);
    return null;
  }
}

// Create a time-bound hourly algoPIN on an igloohome device
// lockId = Bluetooth device ID from igloohome app
// Returns { pin, pinId } or null on failure
export async function createAlgoPin(
  clientId: string,
  clientSecret: string,
  lockId: string,
  startsAt: Date,
  endsAt: Date,
  accessName: string = 'GymAccess Member'
): Promise<{ pin: string; pinId: string } | null> {
  const token = await getAccessToken(clientId, clientSecret);
  if (!token) return null;

  const apiUrl = getApiUrl();

  // Cap endDate to max 672 hours from startDate
  const maxEnd = new Date(startsAt.getTime() + 672 * 60 * 60 * 1000);
  const effectiveEnd = endsAt > maxEnd ? maxEnd : endsAt;

  const body = {
    variance: 1,
    startDate: formatIgloohomeDate(startsAt),
    endDate: formatIgloohomeDate(effectiveEnd),
    accessName: accessName.slice(0, 100), // trim to safe length
  };

  try {
    const response = await fetch(`${apiUrl}/devices/${lockId}/algopin/hourly`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`igloohome createAlgoPin failed (${response.status}): ${errBody}`);
      return null;
    }

    const data: any = await response.json();
    return { pin: String(data.pin), pinId: String(data.pinId) };
  } catch (err) {
    console.error('igloohome createAlgoPin error:', err);
    return null;
  }
}

// Format a Date as YYYY-MM-DDTHH:mm:00+00:00 (ekey API requires seconds to be 00)
function formatEkeyDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
         `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:00+00:00`;
}

// Generate a Bluetooth guest key (ekey) for a device
// Returns { keyId, bluetoothGuestKey } or null on failure
export async function createBluetoothGuestKey(
  clientId: string,
  clientSecret: string,
  lockId: string,
  startsAt: Date,
  endsAt: Date,
  permissions: string[] = ['UNLOCK', 'LOCK']
): Promise<{ keyId: string; bluetoothGuestKey: string } | null> {
  const token = await getAccessToken(clientId, clientSecret);
  if (!token) return null;

  const apiUrl = getApiUrl();
  const body = {
    startDate: formatEkeyDate(startsAt),
    endDate: formatEkeyDate(endsAt),
    permissions,
  };

  try {
    const response = await fetch(`${apiUrl}/devices/${lockId}/ekey`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`igloohome createBluetoothGuestKey failed (${response.status}): ${errBody}`);
      return null;
    }

    const data: any = await response.json();
    return { keyId: String(data.keyId), bluetoothGuestKey: String(data.bluetoothGuestKey) };
  } catch (err) {
    console.error('igloohome createBluetoothGuestKey error:', err);
    return null;
  }
}

// Attempt to delete an algoPIN from igloohome (best-effort; PIN auto-expires at endDate)
// The igloohome API may not support deletion — we log and return false if not supported
export async function deleteAlgoPin(clientId: string, clientSecret: string, lockId: string, pinId: string): Promise<boolean> {
  const token = await getAccessToken(clientId, clientSecret);
  if (!token) return false;

  const apiUrl = getApiUrl();
  try {
    const response = await fetch(`${apiUrl}/devices/${lockId}/algopin/${pinId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (response.status === 404 || response.status === 405) {
      // Endpoint may not exist — PIN will expire at endDate naturally
      console.log(`igloohome deleteAlgoPin: no delete endpoint available (${response.status}), PIN will expire naturally`);
      return false;
    }

    if (!response.ok) {
      const body = await response.text();
      console.error(`igloohome deleteAlgoPin failed (${response.status}): ${body}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error('igloohome deleteAlgoPin error:', err);
    return false;
  }
}
