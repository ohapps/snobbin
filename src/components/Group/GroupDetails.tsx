import Grid from "@mui/material/Grid2";
import { SnobGroup, SnobGroupAttributeSummary } from "@/types/snobGroup";
import ItemList from "../RankingItem/ItemList";
import { PaginatedResults } from "@/types/rankings";
import GroupSummary from "./GroupSummary";

interface Props {
  group: SnobGroup;
  paginatedResults: PaginatedResults;
  attributeSummary: SnobGroupAttributeSummary[];
}

const GroupDetails = ({ group, paginatedResults, attributeSummary }: Props) => {
  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, sm: 8 }}>
        <ItemList group={group} paginatedResults={paginatedResults} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <GroupSummary group={group} attributeSummary={attributeSummary} />
      </Grid>
    </Grid>
  );
};

export default GroupDetails;
