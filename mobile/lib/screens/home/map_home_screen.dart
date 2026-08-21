import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';

import 'package:nyumbalink_mobile/core/config.dart';
import 'package:nyumbalink_mobile/core/api.dart';
import 'package:nyumbalink_mobile/core/models.dart';
import 'package:nyumbalink_mobile/providers/auth_provider.dart';
import 'package:nyumbalink_mobile/screens/property/property_detail_screen.dart';
import 'package:nyumbalink_mobile/screens/property/search_screen.dart';
import 'package:nyumbalink_mobile/screens/booking/booking_screen.dart';
import 'package:nyumbalink_mobile/screens/messages/messages_screen.dart';
import 'package:nyumbalink_mobile/screens/profile/profile_screen.dart';
import 'package:nyumbalink_mobile/screens/owner/add_property_screen.dart';
import 'package:nyumbalink_mobile/screens/officer/verification_screen.dart';

/// The primary screen for every role. NyumbaLink is map-first: the map is the
/// home. Properties are fetched only for the visible viewport (spec #60), so the
/// payload stays small. The satellite view draws an Esri reference layer so
/// place names remain visible on imagery.
class MapHomeScreen extends StatefulWidget {
  const MapHomeScreen({super.key});

  @override
  State<MapHomeScreen> createState() => _MapHomeScreenState();
}

class _MapHomeScreenState extends State<MapHomeScreen> {
  final MapController _mapController = MapController();
  final TextEditingController _searchController = TextEditingController();
  List<PropertySummary> _properties = [];
  bool _loading = false;
  bool _satellite = false;
  LatLng _center = const LatLng(-1.2864, 36.8172);
  double _zoom = 12;
  bool _locating = false;

  // Debounce viewport fetches so we don't spam the backend while panning.
  LatLng? _lastFetched;
  final Map<String, dynamic> _noState = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _moveToUserLocation());
    _fetchAround(_center, _zoom);
  }

  double _bboxDelta(double zoom) {
    // Fetch a larger area when zoomed out, a tighter one when zoomed in.
    final z = zoom.clamp(3, 18).round();
    return 0.04 * (1 << (14 - z));
  }

  Future<void> _moveToUserLocation() async {
    if (!mounted) return;
    setState(() => _locating = true);
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.deniedForever || perm == LocationPermission.denied) {
        return;
      }
      final pos = await Geolocator.getCurrentPosition();
      final c = LatLng(pos.latitude, pos.longitude);
      _mapController.move(c, 13);
      _center = c;
      _zoom = 13;
      _fetchAround(c, 13);
    } catch (_) {
      // Keep the default Nairobi center if location is unavailable.
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<void> _fetchAround(LatLng center, double zoom) async {
    if (!mounted) return;
    if (_lastFetched != null &&
        (_lastFetched!.latitude - center.latitude).abs() < 0.001 &&
        (_lastFetched!.longitude - center.longitude).abs() < 0.001) {
      return;
    }
    _lastFetched = center;
    setState(() => _loading = true);
    try {
      final delta = _bboxDelta(zoom);
      final props = await ApiClient.propertiesInBounds(
        south: center.latitude - delta,
        west: center.longitude - delta,
        north: center.latitude + delta,
        east: center.longitude + delta,
        zoom: zoom.round(),
      );
      if (mounted) setState(() => _properties = props);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not load map data. ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onMapEvent(MapEvent event) {
    if (event is MapEventMoveEnd) {
      final c = _mapController.camera.center;
      final z = _mapController.camera.zoom;
      _center = c;
      _zoom = z;
      _fetchAround(c, z);
    }
  }

  void _openDetail(PropertySummary p) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => PropertyDetailScreen(propertyId: p.id)),
    );
  }

  void _submitSearch(String q) {
    if (q.trim().isEmpty) return;
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => SearchScreen(initialQuery: q.trim())),
    );
  }

  List<Marker> get _markers {
    final out = <Marker>[];
    for (final p in _properties) {
      if (p.latitude == null || p.longitude == null) continue;
      out.add(Marker(
        point: LatLng(p.latitude!, p.longitude!),
        width: 116,
        height: 42,
        child: GestureDetector(
          onTap: () => _openDetail(p),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.teal,
              borderRadius: BorderRadius.circular(20),
              boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2))],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.home_work_rounded, size: 14, color: Colors.white),
                const SizedBox(width: 4),
                Text(p.priceLabel,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
              ],
            ),
          ),
        ),
      ));
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final role = Provider.of<AuthProvider>(context).role;
    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _center,
              initialZoom: _zoom,
              onMapEvent: _onMapEvent,
            ),
            children: [
              TileLayer(
                urlTemplate: _satellite ? kSatelliteTileTemplate : kOsmTileTemplate,
                userAgentPackageName: 'com.nyumbalink.nyumbalink_mobile',
                subdomains: const ['a', 'b', 'c'],
              ),
              // Place-name labels are drawn on top of the satellite imagery.
              if (_satellite)
                TileLayer(
                  urlTemplate: kSatelliteLabelsTemplate,
                  userAgentPackageName: 'com.ny	umbalink.nyumbalink_mobile',
                  subdomains: const ['a', 'b', 'c'],
                ),
              MarkerLayer(markers: _markers),
            ],
          ),

          // Top search bar (Uber / Bolt style)
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(30),
                        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 2))],
                      ),
                      child: TextField(
                        controller: _searchController,
                        onSubmitted: _submitSearch,
                        decoration: const InputDecoration(
                          hintText: 'Where do you want to live?',
                          prefixIcon: Icon(Icons.search, color: Colors.teal),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  _CircleButton(
                    icon: _satellite ? Icons.map : Icons.satellite_alt,
                    onTap: () => setState(() => _satellite = !_satellite),
                  ),
                ],
              ),
            ),
          ),

          if (_loading)
            const Positioned(
              top: 80,
              left: 0,
              right: 0,
              child: Center(child: Chip(label: Text('Updating map…'), avatar: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)))),
            ),

          // Bottom-right controls
          Positioned(
            right: 14,
            bottom: 90,
            child: Column(
              children: [
                _CircleButton(
                  icon: _locating ? Icons.hourglass_top : Icons.my_location,
                  onTap: _moveToUserLocation,
                ),
              ],
            ),
          ),

          // Results count pill
          Positioned(
            left: 14,
            bottom: 90,
            child: Chip(
              label: Text(_properties.isEmpty ? 'No homes here yet' : '${_properties.length} homes in view'),
              backgroundColor: Colors.white,
            ),
          ),
        ],
      ),
      floatingActionButton: _roleFab(role),
      bottomNavigationBar: _BottomNav(role: role),
    );
  }

  Widget _roleFab(UserRole role) {
    if (role == UserRole.landlord) {
      return FloatingActionButton(
        heroTag: 'roleFab',
        backgroundColor: Colors.teal,
        child: const Icon(Icons.add),
        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AddPropertyScreen())),
      );
    }
    if (role == UserRole.officer) {
      return FloatingActionButton(
        heroTag: 'roleFab',
        backgroundColor: Colors.teal,
        child: const Icon(Icons.verified),
        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VerificationScreen())),
      );
    }
    return FloatingActionButton(
      heroTag: 'roleFab',
      backgroundColor: Colors.teal,
      child: const Icon(Icons.search),
      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SearchScreen())),
    );
  }
}

class _CircleButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _CircleButton({required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        shape: const CircleBorder(),
        elevation: 4,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: Padding(padding: const EdgeInsets.all(12), child: Icon(icon, color: Colors.teal)),
        ),
      );
}

/// Bottom navigation. The map is always the base screen; other items open
/// dedicated routes that keep the map available behind them.
class _BottomNav extends StatelessWidget {
  final UserRole role;
  const _BottomNav({required this.role});

  @override
  Widget build(BuildContext context) {
    final items = <_NavItem>[
      _NavItem(icon: Icons.map_outlined, label: 'Map', route: null),
      _NavItem(icon: Icons.search, label: 'Search', route: (c) => const SearchScreen()),
      _NavItem(icon: Icons.calendar_month, label: 'Bookings', route: (c) => const BookingScreen()),
      _NavItem(icon: Icons.chat_bubble_outline, label: 'Inbox', route: (c) => const MessagesScreen()),
      _NavItem(icon: Icons.person_outline, label: 'Profile', route: (c) => const ProfileScreen()),
    ];
    return BottomNavigationBar(
      type: BottomNavigationBarType.fixed,
      selectedItemColor: Colors.teal,
      unselectedItemColor: Colors.grey,
      currentIndex: 0,
      onTap: (i) {
        final item = items[i];
        if (item.route != null) {
          Navigator.push(context, MaterialPageRoute(builder: item.route!));
        }
      },
      items: items
          .map((e) => BottomNavigationBarItem(icon: Icon(e.icon), label: e.label))
          .toList(),
    );
  }
}

class _NavItem {
  final IconData icon;
  final String label;
  final Widget Function(BuildContext)? route;
  _NavItem({required this.icon, required this.label, this.route});
}
