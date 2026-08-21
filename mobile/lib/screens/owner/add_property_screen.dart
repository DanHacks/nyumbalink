import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:nyumbalink_mobile/core/api.dart';
import 'package:nyumbalink_mobile/core/models.dart';
import 'package:nyumbalink_mobile/providers/auth_provider.dart';

/// Landlord flow to list a new property. Captures a photo with the camera
/// (uploaded to the backend, never bundled — spec #60) and posts the listing.
class AddPropertyScreen extends StatefulWidget {
  const AddPropertyScreen({super.key});

  @override
  State<AddPropertyScreen> createState() => _AddPropertyScreenState();
}

class _AddPropertyScreenState extends State<AddPropertyScreen> {
  final _name = TextEditingController();
  final _county = TextEditingController();
  final _city = TextEditingController();
  final _min = TextEditingController();
  final _max = TextEditingController();
  final _rooms = TextEditingController();
  final _desc = TextEditingController();
  final _lat = TextEditingController();
  final _lng = TextEditingController();
  String _type = 'apartment';
  String? _photoPath;
  bool _saving = false;

  final _types = ['house', 'apartment', 'hostel', 'guest_house', 'airbnb', 'commercial'];

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final img = await picker.pickImage(source: ImageSource.camera, maxWidth: 1024, imageQuality: 70);
    if (img != null) setState(() => _photoPath = img.path);
  }

  Future<void> _submit() async {
    setState(() => _saving = true);
    try {
      final payload = {
        'property_name': _name.text.trim(),
        'property_type': _type,
        'description': _desc.text.trim(),
        'address': {'county': _county.text.trim(), 'city': _city.text.trim()},
        'location': {
          'latitude': double.tryParse(_lat.text) ?? -1.2864,
          'longitude': double.tryParse(_lng.text) ?? 36.8172,
        },
        'min_rent': double.tryParse(_min.text) ?? 0,
        'max_rent': double.tryParse(_max.text) ?? 0,
        'total_rooms': int.tryParse(_rooms.text) ?? 1,
      };

      // Upload a captured photo first (cloud storage) and attach its URL.
      if (_photoPath != null) {
        try {
          final up = await ApiClient.uploadPhoto(_photoPath!, 'property');
          if (up['url'] != null) payload['photo_url'] = up['url'];
        } catch (_) {
          // Non-fatal: listing can still be created without the photo.
        }
      }

      await ApiClient.createProperty(payload);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Property listed')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add property')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            GestureDetector(
              onTap: _pickPhoto,
              child: Container(
                height: 160,
                width: double.infinity,
                decoration: BoxDecoration(color: Colors.grey[200], borderRadius: BorderRadius.circular(12)),
                child: _photoPath == null
                    ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.camera_alt, size: 36), Text('Tap to add a photo')]))
                    : const Center(child: Icon(Icons.check_circle, color: Colors.teal, size: 36)),
              ),
            ),
            const SizedBox(height: 12),
            TextField(controller: _name, decoration: const InputDecoration(labelText: 'Property name')),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              value: _type,
              items: _types.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
              onChanged: (v) => setState(() => _type = v ?? 'apartment'),
              decoration: const InputDecoration(labelText: 'Type'),
            ),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: TextField(controller: _county, decoration: const InputDecoration(labelText: 'County'))),
              const SizedBox(width: 10),
              Expanded(child: TextField(controller: _city, decoration: const InputDecoration(labelText: 'City'))),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: TextField(controller: _lat, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Latitude'))),
              const SizedBox(width: 10),
              Expanded(child: TextField(controller: _lng, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Longitude'))),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: TextField(controller: _min, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Min rent'))),
              const SizedBox(width: 10),
              Expanded(child: TextField(controller: _max, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Max rent'))),
            ]),
            const SizedBox(height: 10),
            TextField(controller: _rooms, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Total rooms')),
            const SizedBox(height: 10),
            TextField(controller: _desc, maxLines: 3, decoration: const InputDecoration(labelText: 'Description')),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _saving ? null : _submit,
                child: _saving ? const CircularProgressIndicator(strokeWidth: 2, color: Colors.white) : const Text('List property'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
