import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:nyumbalink_mobile/core/api.dart';
import 'package:nyumbalink_mobile/core/models.dart';
import 'package:nyumbalink_mobile/providers/auth_provider.dart';
import 'package:nyumbalink_mobile/screens/booking/booking_screen.dart';
import 'package:nyumbalink_mobile/screens/messages/messages_screen.dart';

/// Detailed view of a single property. Everything (photos, data) streams from
/// the backend; nothing is bundled in the app (spec #60).
class PropertyDetailScreen extends StatefulWidget {
  final String propertyId;
  const PropertyDetailScreen({super.key, required this.propertyId});

  @override
  State<PropertyDetailScreen> createState() => _PropertyDetailScreenState();
}

class _PropertyDetailScreenState extends State<PropertyDetailScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;
  bool _favorite = false;
  bool _favBusy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  String? _primaryImage() {
    if (_data == null) return null;
    if (_data!['photo_url'] != null && _data!['photo_url'].toString().isNotEmpty) return _data!['photo_url'];
    final photos = _data!['photos'];
    if (photos is List && photos.isNotEmpty) {
      final first = photos.first;
      if (first is String) return first;
      if (first is Map && first['url'] != null) return first['url'];
    }
    return null;
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _data = await ApiClient.propertyDetail(widget.propertyId);
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleFav() async {
    if (_favBusy) return;
    setState(() => _favBusy = true);
    try {
      await ApiClient.toggleFavorite(widget.propertyId, !_favorite);
      setState(() => _favorite = !_favorite);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not update favorite')));
    } finally {
      if (mounted) setState(() => _favBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final name = _data?['property_name'] ?? 'Property';
    final county = _data?['county'] ?? '';
    final city = _data?['city'] ?? '';
    final min = _data?['min_rent'];
    final max = _data?['max_rent'];
    final trust = _data?['trust_score'];
    final vacant = _data?['vacant_rooms'];
    final total = _data?['total_rooms'];
    final desc = _data?['description'] ?? '';

    return Scaffold(
      appBar: AppBar(title: Text(name.toString())),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : ListView(
                  children: [
                    CachedNetworkImage(
                      imageUrl: _primaryImage() ?? '',
                      height: 220,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(color: Colors.grey[200], child: const Center(child: CircularProgressIndicator())),
                      errorWidget: (_, __, ___) => Container(
                        height: 220,
                        color: Colors.teal[50],
                        child: const Center(child: Icon(Icons.home_work_rounded, size: 56, color: Colors.teal)),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name.toString(), style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Text([city, county].where((e) => e != null && e.toString().isNotEmpty).join(', '),
                              style: const TextStyle(color: Colors.grey)),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              _Stat(label: 'Rent', value: min != null ? 'Ksh $min' : 'On request'),
                              if (trust != null) _Stat(label: 'Trust', value: '$trust/100'),
                              if (vacant != null && total != null) _Stat(label: 'Rooms', value: '$vacant/$total free'),
                            ],
                          ),
                          const SizedBox(height: 16),
                          if (desc.toString().isNotEmpty) ...[
                            const Text('About this home', style: TextStyle(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 6),
                            Text(desc.toString()),
                            const SizedBox(height: 16),
                          ],
                          Row(
                            children: [
                              Expanded(
                                child: FilledButton.icon(
                                  onPressed: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => BookingScreen(propertyId: widget.propertyId)),
                                  ),
                                  icon: const Icon(Icons.calendar_month),
                                  label: const Text('Book / Viewing'),
                                ),
                              ),
                              const SizedBox(width: 10),
                              IconButton.outlined(
                                onPressed: _toggleFav,
                                icon: Icon(_favorite ? Icons.favorite : Icons.favorite_border, color: Colors.red),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          OutlinedButton.icon(
                            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MessagesScreen())),
                            icon: const Icon(Icons.chat_bubble_outline),
                            label: const Text('Message the owner / agent'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String label;
  final String value;
  const _Stat({required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Expanded(
        child: Container(
          margin: const EdgeInsets.only(right: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.teal[50], borderRadius: BorderRadius.circular(12)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
              const SizedBox(height: 2),
              Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      );
}
