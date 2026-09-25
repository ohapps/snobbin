"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import {
  GroupEvent,
  ItemAddedPayload,
  ItemModifiedPayload,
  RankingAddedPayload,
} from "@/types/events";

interface UseGroupEventsOptions {
  groupId?: string;
  currentUserId?: string | null;
  onEvent?: (event: GroupEvent) => void;
}

export const useGroupEvents = ({
  groupId,
  currentUserId,
  onEvent,
}: UseGroupEventsOptions) => {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (!groupId || typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }

    const eventSource = new EventSource(`/api/groups/${groupId}/events`);

    const handleItemAdded = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as ItemAddedPayload;

        if (!currentUserId || payload.createdBy.id !== currentUserId) {
          const author = payload.createdBy.name || "A member";
          enqueueSnackbar(`${author} added a new item: "${payload.description}"`, {
            variant: "info",
            autoHideDuration: 5000,
          });

          router.refresh();
        }

        if (onEvent) {
          onEvent(payload);
        }
      } catch (err) {
        console.error("Error parsing item_added SSE event:", err);
      }
    };

    const handleItemModified = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as ItemModifiedPayload;

        if (!currentUserId || payload.createdBy.id !== currentUserId) {
          const author = payload.createdBy.name || "A member";
          enqueueSnackbar(`${author} updated "${payload.description}"`, {
            variant: "info",
            autoHideDuration: 5000,
          });

          router.refresh();
        }

        if (onEvent) {
          onEvent(payload);
        }
      } catch (err) {
        console.error("Error parsing item_modified SSE event:", err);
      }
    };

    const handleRankingAdded = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as RankingAddedPayload;

        if (!currentUserId || payload.createdBy.id !== currentUserId) {
          const author = payload.createdBy.name || "A member";
          enqueueSnackbar(
            `${author} rated "${payload.itemDescription}" (${payload.ranking}★)`,
            {
              variant: "info",
              autoHideDuration: 5000,
            },
          );

          router.refresh();
        }

        if (onEvent) {
          onEvent(payload);
        }
      } catch (err) {
        console.error("Error parsing ranking_added SSE event:", err);
      }
    };

    eventSource.addEventListener("item_added", handleItemAdded);
    eventSource.addEventListener("item_modified", handleItemModified);
    eventSource.addEventListener("ranking_added", handleRankingAdded);

    eventSource.onerror = (err) => {
      console.debug("SSE connection issue:", err);
    };

    return () => {
      eventSource.removeEventListener("item_added", handleItemAdded);
      eventSource.removeEventListener("item_modified", handleItemModified);
      eventSource.removeEventListener("ranking_added", handleRankingAdded);
      eventSource.close();
    };
  }, [groupId, currentUserId, onEvent, router, enqueueSnackbar]);
};
