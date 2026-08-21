import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:nyumbalink_mobile/core/api.dart';
import 'package:nyumbalink_mobile/providers/auth_provider.dart';

/// Officer-only screen. Shows the verification queue and lets the officer
/// approve / reject submitted photos. Uses the secured backend endpoints.
class VerificationScreen extends StatefulWidget {
  const VerificationScreen({super.key});

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  List<Map<String, dynamic>> _queue = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _queue = await ApiClient.verificationQueue();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to load queue: $e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _decide(Map<String, dynamic> item, bool approve) async {
    final photos = item['photos'];
    if (photos is List && photos.isNotEmpty) {
      for (final p in photos) {
        final id = p is Map ? p['id'] : null;
        if (id == null) continue;
        try {
          await ApiClient.dio.post('/verification/photos/$id/${approve ? 'approve' : 'reject'}');
        } catch (_) {
          // continue with remaining photos
        }
      }
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(approve ? 'Marked verified' : 'Rejected')),
      );
      setState(() => _queue.remove(item));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verification queue')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _queue.isEmpty
              ? const Center(child: Text('Queue is clear. Nothing to verify.'))
              : ListView.builder(
                  itemCount: _queue.length,
                  itemBuilder: (context, i) {
                    final item = _queue[i];
                    final name = item['property_name'] ?? item['name'] ?? 'Property';
                    return Card(
                      margin: const EdgeInsets.all(12),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(name.toString(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            const SizedBox(height: 4),
                            Text(item['county']?.toString() ?? '', style: const TextStyle(color: Colors.grey)),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: () => _decide(item, false),
                                    icon: const Icon(Icons.close, color: Colors.red),
                                    label: const Text('Reject'),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: FilledButton.icon(
                                    onPressed: () => _decide(item, true),
                                    icon: const Icon(Icons.check),
                                    label: const Text('Approve'),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
