import { describe, it, expect, vi } from "vitest";
import {
  broadcastGroupEvent,
  subscribeToGroupEvents,
} from "../event-broadcaster";
import { GroupEvent } from "@/types/events";

describe("event-broadcaster", () => {
  it("broadcasts events to subscribers of the specific group", () => {
    const groupId = "test-group-123";
    const listener = vi.fn();

    const unsubscribe = subscribeToGroupEvents(groupId, listener);

    const event: GroupEvent = {
      type: "ITEM_ADDED",
      groupId,
      itemId: "item-1",
      description: "Test Item",
      createdBy: { id: "user-1", name: "User One" },
      timestamp: new Date().toISOString(),
    };

    broadcastGroupEvent(groupId, event);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(event);

    unsubscribe();
  });

  it("does not receive events for a different group", () => {
    const groupA = "group-a";
    const groupB = "group-b";
    const listenerA = vi.fn();

    const unsubscribe = subscribeToGroupEvents(groupA, listenerA);

    const eventB: GroupEvent = {
      type: "ITEM_ADDED",
      groupId: groupB,
      itemId: "item-2",
      description: "Item for B",
      createdBy: { id: "user-2", name: "User Two" },
      timestamp: new Date().toISOString(),
    };

    broadcastGroupEvent(groupB, eventB);

    expect(listenerA).not.toHaveBeenCalled();

    unsubscribe();
  });

  it("stops receiving events after unsubscribe", () => {
    const groupId = "test-group-unsub";
    const listener = vi.fn();

    const unsubscribe = subscribeToGroupEvents(groupId, listener);
    unsubscribe();

    const event: GroupEvent = {
      type: "ITEM_ADDED",
      groupId,
      itemId: "item-3",
      description: "Item 3",
      createdBy: { id: "user-1", name: "User One" },
      timestamp: new Date().toISOString(),
    };

    broadcastGroupEvent(groupId, event);

    expect(listener).not.toHaveBeenCalled();
  });

  it("broadcasts ITEM_MODIFIED and RANKING_ADDED events correctly", () => {
    const groupId = "group-mixed";
    const listener = vi.fn();

    const unsubscribe = subscribeToGroupEvents(groupId, listener);

    const modifiedEvent: GroupEvent = {
      type: "ITEM_MODIFIED",
      groupId,
      itemId: "item-10",
      description: "Updated Coffee",
      createdBy: { id: "user-1", name: "User One" },
      timestamp: new Date().toISOString(),
    };

    const rankingEvent: GroupEvent = {
      type: "RANKING_ADDED",
      groupId,
      itemId: "item-10",
      itemDescription: "Updated Coffee",
      ranking: 4.5,
      createdBy: { id: "user-2", name: "User Two" },
      timestamp: new Date().toISOString(),
    };

    broadcastGroupEvent(groupId, modifiedEvent);
    broadcastGroupEvent(groupId, rankingEvent);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, modifiedEvent);
    expect(listener).toHaveBeenNthCalledWith(2, rankingEvent);

    unsubscribe();
  });
});

