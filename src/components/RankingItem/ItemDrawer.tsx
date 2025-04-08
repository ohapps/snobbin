"use client";

import BottomDrawer from "@/components/Drawer/BottomDrawer";
import ItemForm from "./ItemForm";
import { SnobGroup } from "@/types/snobGroup";
import { useAtom } from "jotai";
import { selectedRankingItem } from "@/atoms/app";

const ItemDrawer = ({ group }: { group: SnobGroup }) => {
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
        />
      )}
    </BottomDrawer>
  );
};

export default ItemDrawer;
