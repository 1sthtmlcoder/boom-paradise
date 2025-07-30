import { getSecrets, getConfig } from './config_obfuscated.js';
import { containsProfanity, countProfanity } from './chat_filter.js';
const { PHOTON_REALTIME_APPID } = getSecrets();
const { REGION } = getConfig();

export class Net {
  constructor(roomId, on) {
    this.roomId = roomId;
    this.on = on;
    this.client = null;
  }
  connect(region = REGION) {
    if (!window.Photon || !Photon.LoadBalancing) {
      this.on.down?.('photon_sdk_missing');
      return;
    }
    const LBC = Photon.LoadBalancing.LoadBalancingClient;
    this.client = new LBC(Photon.LoadBalancing.Constants.Protocol.Wss, PHOTON_REALTIME_APPID, '1.0');
    this.client.onStateChange = (state) => {
      if (state === Photon.LoadBalancing.LoadBalancingClient.State.Joined) this.on.connected?.();
    };
    this.client.onError = (code, msg) => this.on.down?.('photon_error:' + msg);
    this.client.onActorJoin = (actor) => this.on.playerJoin?.(actor);
    this.client.onActorLeave = (actor) => this.on.playerLeave?.(actor);
    this.client.onEvent = (code, content, actorNr) => {
      switch(code) {
        case 1: this.on.playerMove?.(content); break;
        case 2: this.on.chat?.(content); break;
        case 3: this.on.dance?.(content); break;
        case 4: this.on.cosmetics?.(content); break;
      }
    };
    this.client.connectToRegionMaster(region);
    const t = setInterval(() => {
      if (this.client && this.client.isConnectedToMaster()) {
        clearInterval(t);
        this.client.joinOrCreateRoom(this.roomId, { maxPlayers: 16 });
      }
    }, 200);
  }
  sendMove(x, y) { this.client.raiseEvent(1, { x,y, id: this.client.myActor().actorNr }, { receivers: Photon.LoadBalancing.Constants.ReceiverGroup.All }); }
  sendChat(name, text) {
    const prof = containsProfanity(text);
    this.client.raiseEvent(2, { name, text, prof, ts: Date.now() }, { receivers: Photon.LoadBalancing.Constants.ReceiverGroup.All });
    return countProfanity(text);
  }
  sendDance(dance) { this.client.raiseEvent(3, { id: this.client.myActor().actorNr, dance }, { receivers: Photon.LoadBalancing.Constants.ReceiverGroup.All }); }
  sendCosmetics(cosmetics) { this.client.raiseEvent(4, { id: this.client.myActor().actorNr, cosmetics }, { receivers: Photon.LoadBalancing.Constants.ReceiverGroup.All }); }
}
