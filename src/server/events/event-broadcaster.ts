import { EventEmitter } from "events";
import { GroupEvent } from "@/types/events";

// Global symbol to ensure a single EventEmitter instance in dev & server environments
const GLOBAL_EMITTER_KEY = Symbol.for("snobbin.eventBroadcaster");

type GlobalWithEmitter = typeof globalThis & {
  [GLOBAL_EMITTER_KEY]?: EventEmitter;
};

const getEmitter = (): EventEmitter => {
  const globalTarget = globalThis as GlobalWithEmitter;
  if (!globalTarget[GLOBAL_EMITTER_KEY]) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(0); // Unlimited listeners for concurrent SSE clients
    globalTarget[GLOBAL_EMITTER_KEY] = emitter;
  }
  return globalTarget[GLOBAL_EMITTER_KEY]!;
};

export const broadcastGroupEvent = (groupId: string, event: GroupEvent) => {
  const emitter = getEmitter();
  emitter.emit(`group:${groupId}`, event);
};

export const subscribeToGroupEvents = (
  groupId: string,
  listener: (event: GroupEvent) => void,
): (() => void) => {
  const emitter = getEmitter();
  const channel = `group:${groupId}`;
  emitter.on(channel, listener);

  return () => {
    emitter.off(channel, listener);
  };
};
