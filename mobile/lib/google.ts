import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { api, setAuthToken, fetchMe } from '@/lib/api';
import * as SecureStore from 'expo-secure-store';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '319632867370-2pdu6p82056qpo7tho0snf9v3k2globi.apps.googleusercontent.com';

// Android OAuth client id. Must match the Android OAuth client configured in
// Google Cloud for package name `com.nyumbalink.app` with the release signing
// certificate's SHA-1/SHA-256. The web client id is used as fallback.
const ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || WEB_CLIENT_ID;

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    // For a standalone Android release this resolves to the app scheme
    // (nyumbalink://). That redirect URI must be authorized in Google Cloud.
    redirectUri: AuthSession.makeRedirectUri(),
  });
  return { request, response, promptAsync };
}

export async function exchangeGoogleToken(idToken: string) {
  const res = await api.post('/auth/google', { id_token: idToken });
  const data = res.data;
  if (data?.access_token) {
    await SecureStore.setItemAsync('nl_access_token', data.access_token);
    if (data.refresh_token) {
      await SecureStore.setItemAsync('nl_refresh_token', data.refresh_token);
    }
    setAuthToken(data.access_token);
    return await fetchMe();
  }
  throw new Error('No token returned from server');
}
