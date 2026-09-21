"use client";

import { PaginatedResults } from "@/types/rankings";
import { SnobGroup, SnobGroupSearchParams } from "@/types/snobGroup";
import { Box, styled, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import SearchBox from "./SearchBox";
import ItemListPage from "./ItemListPage";
import { PagingNavigation } from "./PagingNavigation";
import SortByMenu from "./SortByMenu";
import NewItemButton from "./NewItemButton";
import { formatNumber } from "@/utils/format-number";
import { useUpdateQueryParams } from "@/hooks/useUpdateQueryParams";
import { useTransition } from "react";
import LoadingPage from "../Page/LoadingPage";
import GroupAvatar from "../Group/GroupAvatar";
import FilterByMenu from "./FilterByMenu";

const GroupAvatarContainer = styled(Box)(({ theme }) => ({
  paddingRight: theme.spacing(2),
  cursor: "pointer",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

const ItemList = ({
  group,
  paginatedResults,
  hideGroupSummary,
  setHideGroupSummary,
  searchParams
}: {
  group: SnobGroup;
  paginatedResults: PaginatedResults;
  hideGroupSummary: boolean;
  setHideGroupSummary: (hide: boolean) => void;
  searchParams: SnobGroupSearchParams;
}) => {
  const updateQueryParams = useUpdateQueryParams();
  const [loading, startTransition] = useTransition();

  const updateQuery = (newParams: Record<string, string>) => {
    startTransition(() => {
      updateQueryParams(newParams);
    });
  };

  return (
    <Box>
      <Grid container>
        <Grid
          size={{ xs: 12 }}
          paddingBottom={2}
          display={"flex"}
          alignItems={"center"}
          justifyContent={"space-between"}
        >
          <Box>
            <Typography variant="h5" display={"flex"} alignItems={"center"}>
              {hideGroupSummary && (
                <GroupAvatarContainer onClick={() => setHideGroupSummary(false)}>
                  <GroupAvatar group={group} size="small" />
                </GroupAvatarContainer>
              )}
              {formatNumber(paginatedResults.total)} items
            </Typography>
          </Box>
          <Box display={"flex"}>
            <SortByMenu updateQuery={updateQuery} searchParams={searchParams} />
            <FilterByMenu updateQuery={updateQuery} searchParams={searchParams} />
          </Box>
        </Grid>
        <Grid
          size={{ xs: 12 }}
          display={"flex"}
          sx={{ justifyContent: { xs: "flex-start", md: "flex-end" } }}
          paddingBottom={2}
        >
          <SearchBox updateQuery={updateQuery} />
          <NewItemButton />
        </Grid>
      </Grid>
      {loading ? (
        <LoadingPage fullHeight={false} />
      ) : (
        <ItemListPage group={group} items={paginatedResults.items} />
      )}
      <PagingNavigation
        paginatedResults={paginatedResults}
        updateQuery={updateQuery}
      />
    </Box>
  );
};

export default ItemList;
