import { RankingItem } from "./rankings";

export interface ItemImage {
  publicId: string;
  url: string;
}

export const placeholderImage: ItemImage = {
  publicId: "ezi8dwbkx5moy56fnxda",
  url: "http://res.cloudinary.com/dwv9pbgzh/image/upload/v1727662676/ezi8dwbkx5moy56fnxda.svg",
};

export const getImageOrPlaceholder = (rankingItem: RankingItem): ItemImage => {
  if (rankingItem.imageId && rankingItem.imageUrl) {
    return {
      publicId: rankingItem.imageId,
      url: rankingItem.imageUrl,
    };
  }
  return placeholderImage;
};
