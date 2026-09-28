import {
  addClient, removeClient, subscribe, unsubscribe,
} from '~~/server/utils/broadcast';

export default defineWebSocketHandler({
  open(peer) {
    addClient(peer);
  },
  message(peer, message) {
    const text = message.text();
    if (text === 'ping') {
      peer.send('pong');
      return;
    }

    let payload: any;
    try { 
      payload = JSON.parse(text); 
    } 
    catch { 
      return; 
    }

    switch (payload?.type) {
      case 'subscribe':
        subscribe(peer, payload.channel);
        break;
      case 'unsubscribe':
        unsubscribe(peer, payload.channel);
        break;
    }
  },
  close(peer) { 
    removeClient(peer); 
  },
  error(peer, err) { 
    console.error('ws error', err); 
    removeClient(peer); 
  },
});