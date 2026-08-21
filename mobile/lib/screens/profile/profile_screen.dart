import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:nyumbalink_mobile/core/api.dart';
import 'package:nyumbalink_mobile/core/config.dart';
import 'package:nyumbalink_mobile/providers/auth_provider.dart';
import 'package:nyumbalink_mobile/core/models.dart';
import 'package:nyumbalink_mobile/screens/home/map_home_screen.dart';
import 'package:nyumbalink_mobile/screens/owner/add_property_screen.dart';
import 'package:nyumbalink_mobile/screens/officer/verification_screen.dart';

/// Profile & settings. Lets the user inspect their role, change the backend
/// server URL (remote configuration, spec #60), and sign out.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _server = TextEditingController();

  @override
  void initState() {
    super.initState();
    _server.text = ApiClient.server;
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final role = auth.role;
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          CircleAvatar(radius: 36, child: Text((user?.fullName.isNotEmpty == true ? user!.fullName[0] : '?').toUpperCase())),
          const SizedBox(height: 10),
          Text(user?.fullName ?? 'Member', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          Text(user?.email ?? '', style: const TextStyle(color: Colors.grey)),
          Chip(label: Text(role.label)),
          const Divider(height: 24),
          if (role == UserRole.landlord)
            ListTile(
              leading: const Icon(Icons.add_home),
              title: const Text('Add a property'),
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AddPropertyScreen())),
            ),
          if (role == UserRole.officer)
            ListTile(
              leading: const Icon(Icons.verified),
              title: const Text('Verification queue'),
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VerificationScreen())),
            ),
          ListTile(
            leading: const Icon(Icons.map),
            title: const Text('Open map'),
            onTap: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const MapHomeScreen())),
          ),
          const Divider(height: 24),
          TextField(
            controller: _server,
            decoration: const InputDecoration(labelText: 'Backend server URL', prefixIcon: Icon(Icons.cloud_outlined)),
          ),
          const SizedBox(height: 10),
          FilledButton.tonal(
            onPressed: () async {
              await ApiClient.setServer(_server.text.trim().isEmpty ? kDefaultApiBaseUrl : _server.text.trim());
              if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Server updated')));
            },
            child: const Text('Save server'),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () async {
              await auth.logout();
              if (mounted) {
                Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const MapHomeScreen()));
              }
            },
            icon: const Icon(Icons.logout),
            label: const Text('Log out'),
          ),
        ],
      ),
    );
  }
}
