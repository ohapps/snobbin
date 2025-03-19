import Grid from '@mui/material/Grid2';
import GroupCard from './GroupCard';
import { SnobGroup } from '@/types/snobGroup';
import ItemList from '../RankingItem/ItemList';
import { PaginatedResults } from '@/types/rankings';

interface Props {
  group: SnobGroup;
  paginatedResults: PaginatedResults;
}

const GroupDetails = ({ group, paginatedResults }: Props) => {
  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, sm: 8 }}>
        <ItemList group={group} paginatedResults={paginatedResults} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <GroupCard group={group} expanded />
      </Grid>
    </Grid>
  );
};

export default GroupDetails;
