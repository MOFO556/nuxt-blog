type Peer = { send: (msg: string) => void };

const clients = new Set<Peer>();
const rooms = new Map<string, Set<Peer>>();
const peerRooms = new Map<Peer, Set<string>>();

export function addClient(peer: Peer) {
  clients.add(peer);
  peerRooms.set(peer, new Set());
}

export function removeClient(peer: Peer) {
  clients.delete(peer);
  const subs = peerRooms.get(peer);
  if (subs) {
    for (const ch of subs) {
      const set = rooms.get(ch);
      if (!set) 
        continue;
      set.delete(peer);
      if (set.size === 0) 
        rooms.delete(ch);
    }
  }
  peerRooms.delete(peer);
}

export function subscribe(peer: Peer, channel: string) {
  let set = rooms.get(channel);
  if (!set) 
    rooms.set(channel, (set = new Set()));
  set.add(peer);
  peerRooms.get(peer)?.add(channel);
}

export function unsubscribe(peer: Peer, channel: string) {
  rooms.get(channel)?.delete(peer);
  peerRooms.get(peer)?.delete(channel);
}

export function broadcast(channel: string, data: unknown) {
  const set = rooms.get(channel);
  if (!set || set.size === 0) return;
  const msg = JSON.stringify({ channel, data });
  for (const peer of [...set]) {
    try {
      peer.send(msg);
    } catch {
      removeClient(peer);
    }
  }
}