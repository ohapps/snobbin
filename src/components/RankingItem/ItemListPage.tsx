import { RankingItem } from "@/types/rankings";
import { SnobGroup } from "@/types/snobGroup";
import { Stack } from "@mui/material";
import ItemCard from "./ItemCard";

const ItemListPage = ({
  group,
  items,
  readOnly = false,
}: {
  group: SnobGroup;
  items: RankingItem[];
  /** Offline read-only mode: hide per-item write actions. */
  readOnly?: boolean;
}) => {
  return (
    <Stack spacing={2}>
      {items.map((item) => (
        <ItemCard
          key={item.id}
          group={group}
          item={item}
          readOnly={readOnly}
        />
      ))}
    </Stack>
  );
};

export default ItemListPage;
