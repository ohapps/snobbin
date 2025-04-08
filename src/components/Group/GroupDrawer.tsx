"use client";

import { selectedSnobGroup } from "@/atoms/app";
import { useAtom } from "jotai";
import BottomDrawer from "../Drawer/BottomDrawer";
import GroupForm from "./GroupForm";

const GroupDrawer = () => {
  const [group, setGroup] = useAtom(selectedSnobGroup);

  const closeDrawer = () => {
    setGroup(undefined);
  };

  return (
    <BottomDrawer
      title={`${group?.id ? "Edit" : "New"} Group`}
      open={!!group}
      close={closeDrawer}
    >
      {group && <GroupForm group={group} onSave={() => closeDrawer()} />}
    </BottomDrawer>
  );
};

export default GroupDrawer;
