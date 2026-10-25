"use client";

import { Box, Button, styled } from "@mui/material";
import PageTitle from "../Page/PageTitle";
import { useAtom } from "jotai";
import { selectedSnobGroup } from "@/atoms/app";
import { newSnobGroup } from "@/types/snobGroup";

export const NewGroupButton = styled(Button)(({ theme }) => ({
  fontSize: 12,
  height: theme.spacing(4.5),
}));

const GroupToolbar = ({ readOnly = false }: { readOnly?: boolean }) => {
  const [, setSelectedSnobGroup] = useAtom(selectedSnobGroup);

  const newGroup = () => {
    setSelectedSnobGroup(newSnobGroup);
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <PageTitle title="My Groups" />
      {/* Offline the app is read-only, so group creation is unavailable. */}
      {!readOnly && (
        <NewGroupButton variant="contained" size="small" onClick={newGroup}>
          New Group
        </NewGroupButton>
      )}
    </Box>
  );
};

export default GroupToolbar;
