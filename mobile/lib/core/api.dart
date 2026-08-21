import 'package:dio/dio.dart';
import 'package:nyumbalink_mobile/core/config.dart';
import 'package:nyumbalink_mobile/core/storage.dart';
import 'package:nyumbalink_mobile/core/models.dart';

/// Thin HTTP client for talking to the NyumbaLink backend.
///
/// All media is streamed from the backend / cloud storage; this client only
/// moves JSON and small multipart uploads. It attaches the bearer token
/// automatically and reports failures in a consistent way.
class ApiClient {
  static late Dio dio;
  static String server = kDefaultApiBaseUrl;

  /// Initialise the client. Call once at startup (after loading saved server).
  static void init() {
    dio = Dio(BaseOptions(
      baseUrl: '$server$kApiVersionPath',
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
    ));
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await AppStorage.getToken();
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
    ));
  }

  /// Update the backend host and persist it for next launch.
  static Future<void> setServer(String url) async {
    server = _normalize(url);
    dio.options.baseUrl = '$server$kApiVersionPath';
    await AppStorage.saveServer(server);
  }

  static String _normalize(String url) {
    url = url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://$url';
    while (url.endsWith('/')) url = url.substring(0, url.length - 1);
    return url;
  }

  static Future<Response> _get(String path, {Map<String, dynamic>? query}) =>
      dio.get(path, queryParameters: query);

  static Future<Response> _post(String path, {dynamic data, Map<String, dynamic>? query}) =>
      dio.post(path, data: data, queryParameters: query);

  // ---------------- Auth ----------------
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await _post('/auth/login', data: {'email': email, 'password': password});
    return res.data as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> register(Map<String, dynamic> payload) async {
    final res = await _post('/auth/register', data: payload);
    return res.data as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> me() async {
    final res = await _get('/auth/me');
    return res.data as Map<String, dynamic>;
  }

  // ---------------- Map / discovery ----------------
  /// Viewport based property query. Only returns what is visible on screen,
  /// keeping payloads tiny (spec #60).
  static Future<List<PropertySummary>> propertiesInBounds({
    required double south,
    required double west,
    required double north,
    required double east,
    int zoom = 12,
  }) async {
    final res = await _get('/maps/properties-in-bounds', query: {
      'south': south,
      'west': west,
      'north': north,
      'east': east,
      'zoom': zoom,
      'verified_only': true,
    });
    final data = res.data as Map<String, dynamic>;
    final list = (data['properties'] as List? ?? []);
    return list.map((e) => PropertySummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<Map<String, dynamic>> propertyDetail(String id) async {
    final res = await _get('/properties/$id');
    return res.data as Map<String, dynamic>;
  }

  static Future<List<Map<String, dynamic>>> listProperties({String? ownerId}) async {
    final res = await _get('/properties', query: ownerId != null ? {'owner_id': ownerId} : null);
    final data = res.data;
    if (data is List) return data.cast<Map<String, dynamic>>();
    if (data is Map && data['properties'] is List) return (data['properties'] as List).cast<Map<String, dynamic>>();
    return [];
  }

  static Future<Map<String, dynamic>> createProperty(Map<String, dynamic> payload) async {
    final res = await _post('/properties', data: payload);
    return res.data as Map<String, dynamic>;
  }

  /// Server-side, viewport/query based search (spec #60: never preload all).
  static Future<List<Map<String, dynamic>>> searchProperties(
    String query, {
    String? county,
    String? city,
    String? type,
    double? minPrice,
    double? maxPrice,
  }) async {
    final res = await _get('/properties/search', query: {
      'q': query,
      if (county != null) 'county': county,
      if (city != null) 'city': city,
      if (type != null) 'property_type': type,
      if (minPrice != null) 'min_price': minPrice,
      if (maxPrice != null) 'max_price': maxPrice,
    });
    final data = res.data;
    if (data is Map && data['properties'] is List) {
      return (data['properties'] as List).cast<Map<String, dynamic>>();
    }
    if (data is List) return data.cast<Map<String, dynamic>>();
    return [];
  }

  // ---------------- Bookings ----------------
  static Future<List<Booking>> myBookings() async {
    final res = await _get('/bookings/my-bookings');
    final data = res.data;
    final list = data is List ? data : (data is Map && data['bookings'] is List ? data['bookings'] : []);
    return (list as List).map((e) => Booking.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<Map<String, dynamic>> createBooking(Map<String, dynamic> payload) async {
    final res = await _post('/bookings', data: payload);
    return res.data as Map<String, dynamic>;
  }

  // ---------------- Chat ----------------
  static Future<List<Conversation>> conversations() async {
    final res = await _get('/chat/conversations');
    final data = res.data;
    final list = data is List ? data : (data is Map && data['conversations'] is List ? data['conversations'] : []);
    return (list as List).map((e) => Conversation.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<List<ChatMessage>> conversationMessages(String id, String myId) async {
    final res = await _get('/chat/conversations/$id/messages');
    final data = res.data;
    final list = data is List ? data : (data is Map && data['messages'] is List ? data['messages'] : []);
    return (list as List).map((e) => ChatMessage.fromJson(e as Map<String, dynamic>, myId)).toList();
  }

  static Future<Map<String, dynamic>> sendMessage(String id, String body) async {
    final res = await _post('/chat/conversations/$id/messages', data: {'body': body});
    return res.data as Map<String, dynamic>;
  }

  // ---------------- Notifications ----------------
  static Future<List<AppNotification>> notifications() async {
    final res = await _get('/notifications');
    final data = res.data;
    final list = data is List ? data : (data is Map && data['notifications'] is List ? data['notifications'] : []);
    return (list as List).map((e) => AppNotification.fromJson(e as Map<String, dynamic>)).toList();
  }

  // ---------------- Officer verification queue ----------------
  static Future<List<Map<String, dynamic>>> verificationQueue() async {
    final res = await _get('/admin/verification-queue');
    final data = res.data;
    if (data is List) return data.cast<Map<String, dynamic>>();
    if (data is Map && data['queue'] is List) return (data['queue'] as List).cast<Map<String, dynamic>>();
    return [];
  }

  // ---------------- Favorites ----------------
  static Future<List<String>> favorites() async {
    final res = await _get('/favorites');
    final data = res.data;
    final list = data is List ? data : (data is Map && data['favorites'] is List ? data['favorites'] : []);
    return (list as List).map((e) {
      if (e is Map) return e['property_id']?.toString() ?? '';
      return e.toString();
    }).where((e) => e.isNotEmpty).toList();
  }

  static Future<void> toggleFavorite(String propertyId, bool add) async {
    if (add) {
      await _post('/favorites/$propertyId');
    } else {
      await dio.delete('/favorites/$propertyId');
    }
  }

  /// Upload a captured photo (camera / gallery) for verification.
  static Future<Map<String, dynamic>> uploadPhoto(String filePath, String purpose) async {
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
      'purpose': purpose,
    });
    final res = await dio.post('/verification/photos/upload', data: form);
    return res.data as Map<String, dynamic>;
  }
}
