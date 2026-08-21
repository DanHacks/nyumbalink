import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:nyumbalink_mobile/core/api.dart';
import 'package:nyumbalink_mobile/core/models.dart';
import 'package:nyumbalink_mobile/core/storage.dart';

/// Holds the signed-in user and auth token, and exposes simple actions used
/// across the app. Wired through the `provider` package at the root.
class AuthProvider with ChangeNotifier {
  User? _user;
  bool _loading = false;
  String? _error;
  bool _initialized = false;

  User? get user => _user;
  bool get loading => _loading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;
  UserRole get role => _user?.role ?? UserRole.unknown;
  String get userId => _user?.id ?? '';

  /// Load saved session (token + cached user) for a fast startup.
  Future<void> bootstrap() async {
    if (_initialized) return;
    _initialized = true;
    final token = await AppStorage.getToken();
    if (token == null) {
      notifyListeners();
      return;
    }
    final cached = await AppStorage.getUser();
    if (cached != null) {
      _user = User.fromJson(cached);
      notifyListeners();
    }
    // Refresh the profile from the backend in the background.
    try {
      final me = await ApiClient.me();
      _user = User.fromJson(me);
      await AppStorage.saveUser(me);
      notifyListeners();
    } catch (_) {
      // Token may be invalid; keep cached user until next protected call.
    }
  }

  Future<bool> login(String email, String password) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final res = await ApiClient.login(email, password);
      final token = res['access_token'] as String?;
      if (token == null) throw Exception('No access token returned');
      await AppStorage.saveToken(token);
      final me = await ApiClient.me();
      _user = User.fromJson(me);
      await AppStorage.saveUser(me);
      _loading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = _friendlyError(e);
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register(Map<String, dynamic> payload) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final res = await ApiClient.register(payload);
      final token = res['access_token'] as String?;
      if (token == null) throw Exception('No access token returned');
      await AppStorage.saveToken(token);
      final me = await ApiClient.me();
      _user = User.fromJson(me);
      await AppStorage.saveUser(me);
      _loading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = _friendlyError(e);
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await AppStorage.clearSession();
    _user = null;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  static String _friendlyError(dynamic e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map && data['detail'] != null) {
        final detail = data['detail'];
        if (detail is List && detail.isNotEmpty) return detail.first['msg'] ?? 'Request failed';
        return detail.toString();
      }
      if (e.response?.statusCode == 401) return 'Invalid email or password.';
      return 'Network error. Check your connection and server URL.';
    }
    return e.toString().replaceFirst('Exception: ', '');
  }
}
