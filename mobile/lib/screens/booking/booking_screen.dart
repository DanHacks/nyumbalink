import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:nyumbalink_mobile/core/api.dart';
import 'package:nyumbalink_mobile/core/models.dart';

/// Bookings: lists the user's bookings, or (when opened from a property) shows
/// a short request form. Booking integrity is never sacrificed for size (spec
/// #60) — it still talks to the secured backend.
class BookingScreen extends StatefulWidget {
  final String? propertyId;
  const BookingScreen({super.key, this.propertyId});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  List<Booking> _bookings = [];
  bool _loading = true;
  final _notes = TextEditingController();
  DateTime _start = DateTime.now().add(const Duration(days: 1));

  @override
  void initState() {
    super.initState();
    if (widget.propertyId == null) _loadMine();
  }

  Future<void> _loadMine() async {
    setState(() => _loading = true);
    try {
      _bookings = await ApiClient.myBookings();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to load bookings: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    try {
      await ApiClient.createBooking({
        'property_id': widget.propertyId,
        'start_date': DateFormat('yyyy-MM-dd').format(_start),
        'notes': _notes.text,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Booking request sent')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.propertyId != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Request booking')),
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              ListTile(
                title: const Text('Preferred move-in date'),
                subtitle: Text(DateFormat.yMMMd().format(_start)),
                trailing: const Icon(Icons.calendar_today),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: _start,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (picked != null) setState(() => _start = picked);
                },
              ),
              TextField(controller: _notes, maxLines: 3, decoration: const InputDecoration(labelText: 'Notes (optional)')),
              const SizedBox(height: 16),
              SizedBox(width: double.infinity, child: FilledButton(onPressed: _submit, child: const Text('Send request'))),
            ],
          ),
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('My bookings')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _bookings.isEmpty
              ? const Center(child: Text('No bookings yet.'))
              : ListView.builder(
                  itemCount: _bookings.length,
                  itemBuilder: (context, i) {
                    final b = _bookings[i];
                    return ListTile(
                      leading: const Icon(Icons.calendar_month, color: Colors.teal),
                      title: Text(b.propertyName ?? 'Property'),
                      subtitle: Text('Status: ${b.status}'),
                      trailing: b.startDate != null ? Text(b.startDate!) : null,
                    );
                  },
                ),
    );
  }
}
