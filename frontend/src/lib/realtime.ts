import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

export type RealtimeEvent = { type: string } & Record<string, unknown>;
export type ConnectionState = 'offline' | 'connecting' | 'online';

type Listener = (event: RealtimeEvent) => void;
type StateListener = (state: ConnectionState) => void;

const listeners = new Set<Listener>();
const stateListeners = new Set<StateListener>();
let socket: WebSocket | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let attempts = 0;
let currentToken: string | null = null;
let stopped = true;
let connection: ConnectionState = 'offline';

function setConnection(next: ConnectionState) {
  if (connection === next) return;
  connection = next;
  stateListeners.forEach((fn) => fn(next));
}

function wsUrl(token: string) {
  const configured = import.meta.env.VITE_WS_URL as string | undefined;
  if (configured) return `${configured.replace(/\/$/, '')}/api/v1/chat/ws?token=${encodeURIComponent(token)}`;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/api/v1/chat/ws?token=${encodeURIComponent(token)}`;
}

function emit(event: RealtimeEvent) {
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch {
      // a broken consumer must not kill the socket
    }
  });
}

function clearTimers() {
  if (pingTimer) clearInterval(pingTimer);
  if (retryTimer) clearTimeout(retryTimer);
  pingTimer = null;
  retryTimer = null;
}

function scheduleReconnect() {
  if (stopped || !currentToken) return;
  setConnection('connecting');
  const delay = Math.min(30_000, 1000 * 2 ** attempts);
  attempts += 1;
  retryTimer = setTimeout(connect, delay);
}

function connect() {
  if (stopped || !currentToken) return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  let ws: WebSocket;
  try {
    ws = new WebSocket(wsUrl(currentToken));
  } catch {
    scheduleReconnect();
    return;
  }
  socket = ws;
  setConnection('connecting');

  ws.onopen = () => {
    attempts = 0;
    setConnection('online');
    pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: 'ping' }));
    }, 25_000);
  };

  ws.onmessage = (msg) => {
    let data: RealtimeEvent;
    try {
      data = JSON.parse(msg.data);
    } catch {
      return;
    }
    if (data.type === 'pong') return;
    emit(data);
  };

  ws.onclose = (evt) => {
    clearTimers();
    if (socket === ws) socket = null;
    if (evt.code === 4401) {
      // Token rejected: stay quiet until a fresh token arrives via startRealtime.
      currentToken = null;
      setConnection('offline');
      return;
    }
    scheduleReconnect();
  };

  ws.onerror = () => ws.close();
}

/** Start (or re-point) the single shared socket for this browser tab. */
export function startRealtime(token: string | null) {
  if (!token) {
    stopRealtime();
    return;
  }
  if (currentToken === token && socket) return;
  stopped = false;
  currentToken = token;
  attempts = 0;
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }
  clearTimers();
  connect();
}

export function stopRealtime() {
  stopped = true;
  currentToken = null;
  clearTimers();
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }
  setConnection('offline');
}

export function subscribeRealtime(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Subscribe to realtime events for the lifetime of a component. */
export function useRealtime(onEvent?: Listener): ConnectionState {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [state, setState] = useState<ConnectionState>(connection);
  const handler = useRef<Listener | undefined>(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      stopRealtime();
      return;
    }
    startRealtime(accessToken);
    const onState: StateListener = (next) => setState(next);
    stateListeners.add(onState);
    setState(connection);
    const unsub = subscribeRealtime((event: RealtimeEvent) => handler.current?.(event));
    return () => {
      stateListeners.delete(onState);
      unsub();
    };
  }, [accessToken, isAuthenticated]);

  return state;
}
