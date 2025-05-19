"use client";

import BottomDrawer from "@/components/Drawer/BottomDrawer";
import ItemForm from "./ItemForm";
import { SnobGroup, SnobGroupAttributeSummary } from "@/types/snobGroup";
import { useAtom } from "jotai";
import { selectedRankingItem } from "@/atoms/app";

const ItemDrawer = ({
  group,
  snobGroupAttributes,
}: {
  group: SnobGroup;
  snobGroupAttributes: SnobGroupAttributeSummary[];
}) => {
  const [rankingItem, setSelectedRankingItem] = useAtom(selectedRankingItem);

  const closeDrawer = () => {
    setSelectedRankingItem(undefined);
  };

  return (
    <BottomDrawer
      title={`${rankingItem?.id ? "Edit" : "New"} Item`}
      open={!!rankingItem}
      close={closeDrawer}
    >
      {rankingItem && (
        <ItemForm
          rankingGroup={group}
          rankingItem={rankingItem}
          onSave={closeDrawer}
          snobGroupAttributes={snobGroupAttributes}
        />
      )}
    </BottomDrawer>
  );
};

export default ItemDrawer;
