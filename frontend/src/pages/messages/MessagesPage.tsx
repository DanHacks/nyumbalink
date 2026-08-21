import { useCallback, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { chatApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import EmptyState from '@/components/EmptyState';

interface Conversation {
  id: string;
  other_user_id: string;
  other_user_name?: string | null;
  last_message_preview?: string | null;
  last_message_at?: string | null;
  unread_count: number;
  property_id?: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  content?: string | null;
  media_url?: string | null;
  message_type: string;
  created_at: string;
}

export default function MessagesPage() {
  usePageMeta('Messages', 'Chat with owners, caretakers and tenants.');
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const response = await chatApi.listConversations();
      setConversations(response.data.conversations ?? []);
    } catch {
      setError('Could not load conversations.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingThread(true);
    try {
      const response = await chatApi.getMessages(conversationId);
      setMessages(response.data.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    const interval = setInterval(() => loadMessages(activeId), 5000);
    return () => clearInterval(interval);
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    setSending(true);
    const content = draft.trim();
    setDraft('');
    try {
      const response = await chatApi.sendMessage(activeId, { content });
      setMessages((prev) => [...prev, response.data]);
      loadConversations();
    } catch {
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  const active = conversations.find((c) => c.id === activeId);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Messages</h1>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <div className="mt-6 grid h-[calc(100vh-16rem)] min-h-[480px] grid-cols-1 overflow-hidden rounded-xl border md:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <aside
          className={`overflow-y-auto border-r ${activeId ? 'hidden md:block' : ''}`}
          aria-label="Conversations"
        >
          {loadingList ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <EmptyState
              icon="search"
              title="No messages yet"
              message="Start a conversation from any property page."
            />
          ) : (
            <ul>
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setActiveId(c.id)}
                    className={`w-full border-b px-4 py-3 text-left transition hover:bg-muted/60 ${
                      activeId === c.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">
                        {c.other_user_name || 'NyumbaLink user'}
                      </span>
                      {c.unread_count > 0 && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {c.last_message_preview || 'No messages yet'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Thread */}
        <section className={`flex flex-col ${activeId ? '' : 'hidden md:flex'}`} aria-label="Chat thread">
          {!active ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState icon="search" title="Select a conversation" />
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between border-b px-4 py-3">
                <button
                  className="text-sm font-medium text-primary md:hidden"
                  onClick={() => setActiveId(null)}
                >
                  ← Back
                </button>
                <h2 className="truncate font-semibold">{active.other_user_name || 'Conversation'}</h2>
              </header>

              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {loadingThread ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-10 w-2/3 animate-pulse rounded-xl bg-muted" />
                    ))}
                  </div>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                            mine
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {m.media_url && !m.content && (
                            <span className="italic opacity-80">📎 Media message</span>
                          )}
                          {m.content}
                          <span className={`mt-1 block text-right text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {new Date(m.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={send} className="flex gap-2 border-t p-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  aria-label="Message"
                  className="flex-1 rounded-full border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
