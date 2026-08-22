/**
 * Minimal Google Identity Services integration.
 * The backend accepts the Google `id_token` (credential) at POST /auth/google.
 * Requires VITE_GOOGLE_CLIENT_ID to be configured in the environment.
 */

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (document.getElementById('google-gis-client')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gis-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google sign-in'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function googleClientId(): string | undefined {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID;
}

/** Resolves to the Google Identity Services global once the script is loaded. */
export async function ensureGoogle(): Promise<any> {
  const clientId = googleClientId();
  if (!clientId) {
    throw new Error('Google sign-in is not configured (VITE_GOOGLE_CLIENT_ID missing)');
  }
  await loadScript();
  const g = (window as any).google;
  if (!g?.accounts?.id) {
    throw new Error('Google Identity Services is unavailable');
  }
  return g;
}
