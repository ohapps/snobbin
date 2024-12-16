'use client';

import Grid from '@mui/material/Grid2';
import GroupCard from './GroupCard';
import { SnobGroup } from '@/types/snobGroup';

interface Props {
  groups: SnobGroup[];
}

const GroupList = ({ groups }: Props) => {
  return (
    <Grid container spacing={2}>
      {groups.map((group) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={group.id}>
          <GroupCard group={group} />
        </Grid>
      ))}
    </Grid>
  );
};

export default GroupList;
