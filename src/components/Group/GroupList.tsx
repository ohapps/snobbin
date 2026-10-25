"use client";

import Grid from "@mui/material/Grid2";
import GroupCard from "./GroupCard";
import { SnobGroup } from "@/types/snobGroup";

interface Props {
  groups: SnobGroup[];
  /** Offline read-only mode: hide per-group write actions. */
  readOnly?: boolean;
}

const GroupList = ({ groups, readOnly = false }: Props) => {
  return (
    <Grid container spacing={2}>
      {groups.map((group) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={group.id}>
          <GroupCard group={group} readOnly={readOnly} />
        </Grid>
      ))}
    </Grid>
  );
};

export default GroupList;
