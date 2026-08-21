import 'dart:convert';

/// Shared data models for the NyumbaLink mobile client.
///
/// These models are intentionally tolerant of missing fields because the
/// backend is the source of truth and the mobile app must never crash on an
/// unexpected payload.

/// The role of a signed-in user. Drives which "home" experience they see.
enum UserRole { tenant, landlord, officer, agent, admin, unknown }

extension UserRoleX on UserRole {
  String get label {
    switch (this) {
      case UserRole.tenant:
        return 'Tenant';
      case UserRole.landlord:
        return 'Landlord';
      case UserRole.officer:
        return 'Verification Officer';
      case UserRole.agent:
        return 'Agent';
      case UserRole.admin:
        return 'Admin';
      case UserRole.unknown:
        return 'Member';
    }
  }
}

UserRole parseRole(String? value) {
  switch ((value ?? '').toString().toLowerCase()) {
    case 'tenant':
      return UserRole.tenant;
    case 'landlord':
      return UserRole.landlord;
    case 'officer':
      return UserRole.officer;
    case 'agent':
      return UserRole.agent;
    case 'admin':
      return UserRole.admin;
    default:
      return UserRole.unknown;
  }
}

double? _toDouble(dynamic v) => v == null ? null : (v is num ? v.toDouble() : double.tryParse(v.toString()));
int _toInt(dynamic v) => v == null ? 0 : (v is num ? v.toInt() : int.tryParse(v.toString()) ?? 0);

/// An authenticated NyumbaLink user.
class User {
  final String id;
  final String email;
  final String fullName;
  final UserRole role;
  final String? phone;
  final String? avatarUrl;

  const User({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.phone,
    this.avatarUrl,
  });

  factory User.fromJson(Map<String, dynamic> j) => User(
        id: j['id']?.toString() ?? '',
        email: j['email'] ?? '',
        fullName: j['full_name'] ?? j['fullName'] ?? '',
        role: parseRole(j['role']),
        phone: j['phone'],
        avatarUrl: j['avatar_url'] ?? j['avatarUrl'],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'full_name': fullName,
        'role': role.name,
        'phone': phone,
        'avatar_url': avatarUrl,
      };
}

/// A lightweight property record returned inside a map viewport query.
class PropertySummary {
  final String id;
  final String name;
  final String kind;
  final String? houseType;
  final String? houseTypeLabel;
  final double? latitude;
  final double? longitude;
  final double? minRent;
  final double? maxRent;
  final String? currency;
  final String? city;
  final String? county;
  final int vacantRooms;
  final int totalRooms;
  final bool hasVerifiedPhotos;
  final bool hasVideo;
  final double? trustScore;
  final double? averageRating;
  final String? propertyCode;
  final String? photoUrl;
  final bool isSponsored;

  const PropertySummary({
    required this.id,
    required this.name,
    required this.kind,
    this.houseType,
    this.houseTypeLabel,
    this.latitude,
    this.longitude,
    this.minRent,
    this.maxRent,
    this.currency,
    this.city,
    this.county,
    this.vacantRooms = 0,
    this.totalRooms = 0,
    this.hasVerifiedPhotos = false,
    this.hasVideo = false,
    this.trustScore,
    this.averageRating,
    this.propertyCode,
    this.photoUrl,
    this.isSponsored = false,
  });

  factory PropertySummary.fromJson(Map<String, dynamic> j) => PropertySummary(
        id: j['id']?.toString() ?? '',
        name: j['property_name'] ?? j['property_name'] ?? '',
        kind: j['kind'] ?? 'rental',
        houseType: j['house_type'],
        houseTypeLabel: j['house_type_label'],
        latitude: _toDouble(j['latitude']),
        longitude: _toDouble(j['longitude']),
        minRent: _toDouble(j['min_rent']),
        maxRent: _toDouble(j['max_rent']),
        currency: j['currency'],
        city: j['city'],
        county: j['county'],
        vacantRooms: _toInt(j['vacant_rooms']),
        totalRooms: _toInt(j['total_rooms']),
        hasVerifiedPhotos: j['has_verified_photos'] ?? false,
        hasVideo: j['has_video'] ?? false,
        trustScore: _toDouble(j['trust_score']),
        averageRating: _toDouble(j['average_rating']),
        propertyCode: j['property_code'],
        photoUrl: j['photo_url'],
        isSponsored: j['is_sponsored'] ?? false,
      );

  /// A short, human friendly rent label, e.g. "Ksh 12k".
  String get priceLabel {
    final v = minRent ?? maxRent;
    if (v == null) return 'Rent on request';
    if (v >= 1000) return 'Ksh ${(v / 1000).toStringAsFixed(0)}k';
    return 'Ksh ${v.toStringAsFixed(0)}';
  }

  String get locationLabel {
    final parts = [city, county].where((e) => e != null && e.isNotEmpty).toList();
    return parts.isEmpty ? 'Kenya' : parts.join(', ');
  }
}

/// A conversation in the in-app messaging system.
class Conversation {
  final String id;
  final String? propertyId;
  final String? propertyName;
  final String? otherPartyName;
  final String? lastMessage;
  final String? lastMessageAt;

  Conversation({
    required this.id,
    this.propertyId,
    this.propertyName,
    this.otherPartyName,
    this.lastMessage,
    this.lastMessageAt,
  });

  factory Conversation.fromJson(Map<String, dynamic> j) => Conversation(
        id: j['id']?.toString() ?? '',
        propertyId: j['property_id']?.toString(),
        propertyName: j['property_name'] ?? j['propertyName'],
        otherPartyName: j['other_party_name'] ?? j['otherPartyName'],
        lastMessage: j['last_message'] ?? j['lastMessage'],
        lastMessageAt: j['last_message_at'] ?? j['lastMessageAt'],
      );
}

/// A single chat message.
class ChatMessage {
  final String id;
  final String senderId;
  final String body;
  final String? createdAt;
  final bool isMine;

  ChatMessage({
    required this.id,
    required this.senderId,
    required this.body,
    this.createdAt,
    this.isMine = false,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> j, String myId) => ChatMessage(
        id: j['id']?.toString() ?? '',
        senderId: j['sender_id']?.toString() ?? '',
        body: j['body'] ?? '',
        createdAt: j['created_at'] ?? j['createdAt'],
        isMine: (j['sender_id']?.toString() ?? '') == myId,
      );
}

/// A booking record for a room/property.
class Booking {
  final String id;
  final String? propertyId;
  final String? propertyName;
  final String status;
  final String? startDate;
  final String? createdAt;

  Booking({
    required this.id,
    this.propertyId,
    this.propertyName,
    this.status = 'pending',
    this.startDate,
    this.createdAt,
  });

  factory Booking.fromJson(Map<String, dynamic> j) => Booking(
        id: j['id']?.toString() ?? '',
        propertyId: j['property_id']?.toString(),
        propertyName: j['property_name'] ?? j['propertyName'],
        status: j['status'] ?? 'pending',
        startDate: j['start_date'] ?? j['startDate'],
        createdAt: j['created_at'] ?? j['createdAt'],
      );
}

/// A push-style in-app notification (read from the backend, not FCM, to keep
/// the binary small per spec #60).
class AppNotification {
  final String id;
  final String title;
  final String body;
  final bool read;
  final String? createdAt;

  AppNotification({
    required this.id,
    required this.title,
    required this.body,
    this.read = false,
    this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: j['id']?.toString() ?? '',
        title: j['title'] ?? '',
        body: j['body'] ?? '',
        read: j['read'] ?? false,
        createdAt: j['created_at'] ?? j['createdAt'],
      );
}
