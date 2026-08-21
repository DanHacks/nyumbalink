import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Secure, minimal local storage for the light client.
///
/// Only the auth token is stored securely (keystore / keychain). Everything
/// else (server URL, cached user, recent searches) is plain shared preferences
/// and is safe to clear. We deliberately do NOT cache full-resolution media.
class AppStorage {
  static const _secure = FlutterSecureStorage(
    aOptions: const AndroidOptions(),
  );
  static const _tokenKey = 'nl_token';
  static const _serverKey = 'nl_server';
  static const _userKey = 'nl_user';
  static const _recentSearchesKey = 'nl_recent_searches';

  // ---- Auth token (secure) ----
  static Future<void> saveToken(String token) => _secure.write(key: _tokenKey, value: token);
  static Future<String?> getToken() => _secure.read(key: _tokenKey);
  static Future<void> deleteToken() => _secure.delete(key: _tokenKey);

  // ---- Server URL (user-configurable) ----
  static Future<void> saveServer(String url) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_serverKey, url);
  }

  static Future<String?> getServer() async {
    final p = await SharedPreferences.getInstance();
    return p.getString(_serverKey);
  }

  // ---- Cached user (for fast startup) ----
  static Future<void> saveUser(Map<String, dynamic> user) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_userKey, jsonEncode(user));
  }

  static Future<Map<String, dynamic>?> getUser() async {
    final p = await SharedPreferences.getInstance();
    final s = p.getString(_userKey);
    if (s == null) return null;
    try {
      return jsonDecode(s) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  // ---- Recent searches (lightweight offline experience) ----
  static Future<List<String>> getRecentSearches() async {
    final p = await SharedPreferences.getInstance();
    return p.getStringList(_recentSearchesKey) ?? [];
  }

  static Future<void> addRecentSearch(String query) async {
    final p = await SharedPreferences.getInstance();
    final list = p.getStringList(_recentSearchesKey) ?? [];
    list.remove(query);
    list.insert(0, query);
    await p.setStringList(_recentSearchesKey, list.take(10).toList());
  }

  /// Wipe credentials but keep cached preferences (lightweight offline mode).
  static Future<void> clearSession() async {
    await deleteToken();
    final p = await SharedPreferences.getInstance();
    await p.remove(_userKey);
  }
}
