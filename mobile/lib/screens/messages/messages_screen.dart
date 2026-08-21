import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:nyumbalink_mobile/core/api.dart';
import 'package:nyumbalink_mobile/core/models.dart';
import 'package:nyumbalink_mobile/providers/auth_provider.dart';

/// In-app messaging. Lists conversations and lets the user read / send messages
/// in a thread. Notifications are pulled from the backend (no FCM SDK) to keep
/// the binary small (spec #60).
class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  List<Conversation> _conversations = [];
  bool _loading = true;
  String? _openId;
  List<ChatMessage> _messages = [];
  final _controller = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _conversations = await ApiClient.conversations();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to load messages: $e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openConversation(String id) async {
    setState(() {
      _openId = id;
      _messages = [];
    });
    try {
      final myId = Provider.of<AuthProvider>(context, listen: false).userId;
      _messages = await ApiClient.conversationMessages(id, myId);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
      }
    }
    if (mounted) setState(() {});
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _openId == null) return;
    _controller.clear();
    try {
      await ApiClient.sendMessage(_openId!, text);
      await _openConversation(_openId!);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Send failed: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_openId != null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Conversation'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => setState(() => _openId = null),
          ),
        ),
        body: Column(
          children: [
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: _messages.length,
                itemBuilder: (context, i) {
                  final m = _messages[i];
                  return Align(
                    alignment: m.isMine ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: m.isMine ? Colors.teal : Colors.grey[200],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(m.body, style: TextStyle(color: m.isMine ? Colors.white : Colors.black87)),
                    ),
                  );
                },
              ),
            ),
            SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      decoration: const InputDecoration(
                        hintText: 'Type a message',
                        contentPadding: EdgeInsets.symmetric(horizontal: 16),
                      ),
                    ),
                  ),
                  IconButton(icon: const Icon(Icons.send, color: Colors.teal), onPressed: _send),
                ],
              ),
            ),
          ],
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Inbox')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _conversations.isEmpty
              ? const Center(child: Text('No conversations yet.'))
              : ListView.builder(
                  itemCount: _conversations.length,
                  itemBuilder: (context, i) {
                    final c = _conversations[i];
                    return ListTile(
                      leading: const CircleAvatar(child: Icon(Icons.person)),
                      title: Text(c.otherPartyName ?? c.propertyName ?? 'Chat'),
                      subtitle: Text(c.lastMessage ?? ''),
                      onTap: () => _openConversation(c.id),
                    );
                  },
                ),
    );
  }
}
