import { useState } from "react";
import {
  SnobGroupAttribute,
  SnobGroupAttributeSummary,
} from "@/types/snobGroup";
import { RankingItemAttribute } from "@/types/rankings";

interface IdentifyItemRequest {
  imageUrl: string;
  groupName: string;
  groupDescription: string;
  attributes: {
    id: string;
    name: string;
    existingValues: string[];
  }[];
}

interface IdentifyItemResponse {
  description: string;
  attributes: {
    id: string;
    value: string;
  }[];
}

interface UseIdentifyItemResult {
  identifyItem: (imageUrl: string) => Promise<{
    description: string;
    attributes: RankingItemAttribute[];
  } | null>;
  isIdentifying: boolean;
  error: string | null;
}

export const useIdentifyItem = (
  groupName: string,
  groupDescription: string,
  groupAttributes: SnobGroupAttribute[],
  attributeSummary: SnobGroupAttributeSummary[],
): UseIdentifyItemResult => {
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identifyItem = async (imageUrl: string) => {
    setIsIdentifying(true);
    setError(null);

    try {
      const attributes = groupAttributes.map((attr) => ({
        id: attr.id,
        name: attr.name,
        existingValues: attributeSummary
          .filter((s) => s.attributeId === attr.id)
          .map((s) => s.attributeValue),
      }));

      const requestBody: IdentifyItemRequest = {
        imageUrl,
        groupName,
        groupDescription,
        attributes,
      };

      const response = await fetch("/api/identify-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Failed to identify item");
      }

      const data: IdentifyItemResponse = await response.json();

      return {
        description: data.description,
        attributes: data.attributes.map((attr) => ({
          id: "",
          attributeId: attr.id,
          attributeValue: attr.value,
        })),
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to identify item";
      setError(message);
      return null;
    } finally {
      setIsIdentifying(false);
    }
  };

  return { identifyItem, isIdentifying, error };
};
