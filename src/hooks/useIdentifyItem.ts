import { useState } from "react";
import {
  SnobGroupAttribute,
  SnobGroupAttributeSummary,
} from "@/types/snobGroup";
import { RankingItemAttribute } from "@/types/rankings";
import { IdentifyItemRequest, IdentifyItemResponse } from "@/types/ai";
import { ItemImage } from "@/types/image";

interface UseIdentifyItemParams {
  imageUrl?: string;
  description?: string;
}

interface IdentifyItemResultData {
  description: string;
  attributes: RankingItemAttribute[];
  image?: ItemImage | null;
}

interface UseIdentifyItemResult {
  identifyItem: (
    params: UseIdentifyItemParams,
  ) => Promise<IdentifyItemResultData | null>;
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

  const identifyItem = async ({
    imageUrl,
    description,
  }: UseIdentifyItemParams): Promise<IdentifyItemResultData | null> => {
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
        imageUrl: imageUrl || undefined,
        description: description || undefined,
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
        image:
          data.imageUrl && data.imagePublicId
            ? {
                url: data.imageUrl,
                publicId: data.imagePublicId,
              }
            : null,
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
