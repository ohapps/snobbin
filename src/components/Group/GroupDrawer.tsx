"use client";

import { selectedSnobGroup } from "@/atoms/app";
import { useAtom } from "jotai";
import BottomDrawer from "../Drawer/BottomDrawer";
import GroupForm from "./GroupForm";
import { useConnectivity } from "@/hooks/useConnectivity";

const GroupDrawer = () => {
  const [group, setGroup] = useAtom(selectedSnobGroup);
  const { online } = useConnectivity();

  const closeDrawer = () => {
    setGroup(undefined);
  };

  // Offline the app is read-only. If the drawer happened to be open when
  // connectivity dropped, close it rather than leave a submittable form.
  if (!online) {
    return null;
  }

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
