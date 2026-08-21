import 'package:flutter/material.dart';
import 'package:nyumbalink_mobile/core/api.dart';
import 'package:nyumbalink_mobile/core/models.dart';
import 'package:nyumbalink_mobile/screens/property/property_detail_screen.dart';
import 'package:nyumbalink_mobile/widgets/property_card.dart';

/// Search screen. Submits a server-side query and renders a scrollable list of
/// results (no bulk preloading — spec #60).
class SearchScreen extends StatefulWidget {
  final String? initialQuery;
  const SearchScreen({super.key, this.initialQuery});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _controller = TextEditingController();
  List<Map<String, dynamic>> _results = [];
  bool _loading = false;
  bool _searched = false;

  @override
  void initState() {
    super.initState();
    _controller.text = widget.initialQuery ?? '';
    if (widget.initialQuery != null && widget.initialQuery!.isNotEmpty) _run(widget.initialQuery!);
  }

  Future<void> _run(String q) async {
    if (q.trim().isEmpty) return;
    setState(() => _loading = true);
    try {
      _results = await ApiClient.searchProperties(q.trim());
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Search failed: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
      _searched = true;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Search homes')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _controller,
              onSubmitted: _run,
              decoration: InputDecoration(
                hintText: 'e.g. bedsitter under 8000 near Kisumu',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(icon: const Icon(Icons.arrow_forward), onPressed: () => _run(_controller.text)),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          if (_loading) const LinearProgressIndicator(),
          Expanded(
            child: _searched && _results.isEmpty && !_loading
                ? const Center(child: Text('No matching homes found.'))
                : ListView.builder(
                    itemCount: _results.length,
                    itemBuilder: (context, i) {
                      final map = _results[i];
                      final summary = PropertySummary.fromJson(map);
                      return PropertyCard(
                        property: summary,
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => PropertyDetailScreen(propertyId: summary.id)),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
