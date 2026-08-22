import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { api, setAuthToken, fetchMe } from '@/lib/api';
import * as SecureStore from 'expo-secure-store';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '319632867370-o8hnhe1b0dfl614gn7c2dq3kne4qlqo5.apps.googleusercontent.com';

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: WEB_CLIENT_ID,
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
