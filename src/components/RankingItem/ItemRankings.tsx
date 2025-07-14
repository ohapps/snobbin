import { Divider, Slider, TextField, Typography } from "@mui/material";
import useCurrentGroupMember from "@/hooks/useCurrentGroupMember";
import { useEffect, useState, useTransition } from "react";
import { useSnackbar } from "notistack";
import { LoadingButton } from "@mui/lab";
import { SnobGroup } from "@/types/snobGroup";
import { RankingItem } from "@/types/rankings";
import OtherRanking from "./OtherRanking";
import Grid from "@mui/material/Grid2";
import { saveRanking } from "@/server/actions/items/save-ranking";

const ItemRankings = ({
  group,
  item,
}: {
  group: SnobGroup;
  item: RankingItem;
}) => {
  const [isPending, startTransition] = useTransition();
  const { enqueueSnackbar } = useSnackbar();
  const groupMember = useCurrentGroupMember(group);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");

  const currentRanking = item.rankings.find(
    (ranking) => ranking.groupMemberId === groupMember?.id,
  );

  const otherRankings = item.rankings.filter(
    (ranking) => ranking.groupMemberId !== groupMember?.id,
  );

  const isValid = rating > 0 && rating <= group.maxRanking;

  const onSave = async () => {
    startTransition(async () => {
      const results = await saveRanking({
        id: currentRanking?.id,
        itemId: item.id,
        ranking: rating,
        notes,
      });
      if (results.success) {
        enqueueSnackbar("Ranking saved successfully", { variant: "success" });
      } else {
        enqueueSnackbar("Failed to save ranking", { variant: "error" });
      }
    });
  };

  useEffect(() => {
    if (currentRanking) {
      setRating(currentRanking?.ranking ?? 0);
      setNotes(currentRanking?.notes ?? "");
    }
  }, [currentRanking]);

  return (
    <>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Divider />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography>Your Ranking</Typography>
        </Grid>
        <Grid
          size={{ xs: 12, md: 6 }}
          sx={{ display: "flex", flexDirection: "row" }}
        >
          <Slider
            value={rating}
            min={group.minRanking}
            max={group.maxRanking}
            step={group.increments}
            marks
            valueLabelDisplay="on"
            onChange={(_, newValue) => {
              setRating(newValue as number);
            }}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Notes"
            multiline
            rows={4}
            variant="filled"
            value={notes}
            fullWidth
            onChange={(event) => setNotes(event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12 }} sx={{ display: "flex", justifyContent: "end" }}>
          <LoadingButton
            variant="contained"
            onClick={onSave}
            disabled={!isValid}
            loading={isPending}
          >
            SAVE
          </LoadingButton>
        </Grid>
      </Grid>
      {otherRankings &&
        otherRankings.map((ranking) => (
          <OtherRanking key={ranking.id} group={group} ranking={ranking} />
        ))}
    </>
  );
};

export default ItemRankings;
