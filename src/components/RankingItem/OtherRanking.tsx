import { Ranking } from "@/types/rankings";
import { SnobGroup } from "@/types/snobGroup";
import { getGroupMemberForRanking } from "@/utils/get-group-member-for-ranking";
import { getSnobIdentifier } from "@/utils/get-snob-identifier";
import { Divider, Rating, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";

const OtherRanking = ({
  group,
  ranking,
}: {
  group: SnobGroup;
  ranking: Ranking;
}) => {
  const groupMember = getGroupMemberForRanking(group, ranking);
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Divider sx={{ mt: 2 }} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography>{getSnobIdentifier(groupMember?.snob)}</Typography>
      </Grid>
      <Grid
        size={{ xs: 12, md: 6 }}
        sx={{ display: "flex", flexDirection: "row" }}
      >
        <Rating
          value={ranking.ranking}
          precision={group.increments}
          max={group.maxRanking}
          readOnly
        />
        <Typography pl={1}>({ranking.ranking} stars)</Typography>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Typography sx={{ fontStyle: "italic" }}>{ranking.notes}</Typography>
      </Grid>
    </Grid>
  );
};

export default OtherRanking;
