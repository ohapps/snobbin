import Grid from '@mui/material/Grid2';
import GroupCard from './GroupCard';
import { SnobGroup } from '@/types/snobGroup';

interface Props {
  group: SnobGroup;
}

const GroupDetails = ({ group }: Props) => {
  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, sm: 4 }}>
        <GroupCard group={group} expanded />
      </Grid>
      <Grid size={{ xs: 12, sm: 8 }}>{/* <ItemList group={group} /> */}</Grid>
    </Grid>
  );
};

export default GroupDetails;
