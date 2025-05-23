"use client";

import Grid from "@mui/material/Grid2";
import { SnobGroup, SnobGroupAttributeSummary } from "@/types/snobGroup";
import ItemList from "../RankingItem/ItemList";
import { PaginatedResults } from "@/types/rankings";
import GroupSummary from "./GroupSummary";
import { Button, useMediaQuery, useTheme } from "@mui/material";
import { useEffect, useState } from "react";

interface Props {
  group: SnobGroup;
  paginatedResults: PaginatedResults;
  attributeSummary: SnobGroupAttributeSummary[];
}

const GroupDetails = ({ group, paginatedResults, attributeSummary }: Props) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));
  const [hideGroupSummary, setHideGroupSummary] = useState(true);
  const showLargeGroupSummary = !hideGroupSummary && !isSmallScreen;
  const showSmallGroupSummary = !hideGroupSummary && isSmallScreen;

  useEffect(() => {
    setHideGroupSummary(isSmallScreen);
  }, [isSmallScreen]);

  return (
    <Grid container spacing={4}>
      {showSmallGroupSummary && (
        <Grid
          size={{ xs: 12, md: 4 }}
          display={"flex"}
          flexDirection={"column"}
          alignItems={"center"}
        >
          <GroupSummary group={group} attributeSummary={attributeSummary} />
          <Button
            onClick={() => setHideGroupSummary(true)}
            variant="outlined"
            sx={{ m: 2 }}
          >
            hide group summary
          </Button>
        </Grid>
      )}
      <Grid size={{ xs: 12, md: 8 }}>
        <ItemList
          group={group}
          paginatedResults={paginatedResults}
          hideGroupSummary={hideGroupSummary}
          setHideGroupSummary={setHideGroupSummary}
        />
      </Grid>
      {showLargeGroupSummary && (
        <Grid size={{ xs: 12, sm: 4 }}>
          <GroupSummary group={group} attributeSummary={attributeSummary} />
        </Grid>
      )}
    </Grid>
  );
};

export default GroupDetails;
