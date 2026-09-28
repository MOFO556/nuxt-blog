type Handler = (data: any) => void;

let ws: WebSocket | null = null;
let refs = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const handlers = new Map<string, Set<Handler>>();

function send(payload: unknown) {
  if (ws?.readyState === WebSocket.OPEN) 
    ws.send(JSON.stringify(payload));
}

function connect() {
  if (ws && ws.readyState <= WebSocket.OPEN) 
    return;

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/_ws`);

  ws.onopen = () => {
    for (const channel of handlers.keys())
      send({ type: 'subscribe', channel });
  };

  ws.onmessage = (e) => {
    try {
      const { channel, data } = JSON.parse(e.data);
      handlers.get(channel)?.forEach((fn) => fn(data));
    } catch (err) {
      throw createError({status: 400, statusMessage: "Failed to receive socket message", data: err})
    }
  };

  ws.onclose = () => {
    ws = null;
    if (refs > 0) 
      reconnectTimer = setTimeout(connect, 1000);
  };

  ws.onerror = () => {};
}

function close() {
  if (reconnectTimer)
    clearTimeout(reconnectTimer); reconnectTimer = null;
  const sock = ws;
  ws = null;
  if (!sock) 
    return;

  sock.onclose = null;
  sock.onerror = null;

  if (sock.readyState === WebSocket.CONNECTING)
    sock.addEventListener('open', () => sock.close(), { once: true });
  else if (sock.readyState === WebSocket.OPEN)
    sock.close();
}

function on(channel: string, fn: Handler) {
  let set = handlers.get(channel);
  if (!set) {
    set = new Set();
    handlers.set(channel, set);
    send({ type: 'subscribe', channel });
  }
  set.add(fn);

  return () => {
    const s = handlers.get(channel);
    if (!s) return;
    s.delete(fn);
    if (s.size === 0) {
      handlers.delete(channel);
      send({ type: 'unsubscribe', channel });
    }
  };
}

export function useRealtime() {
  if (import.meta.client) {
    refs++;
    onMounted(connect);
    onBeforeUnmount(() => {
      refs--;
      if (refs === 0) 
        close();
    });
  }
  return { on, connect };
}