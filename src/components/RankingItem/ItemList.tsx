"use client";

import { PaginatedResults } from "@/types/rankings";
import { SnobGroup } from "@/types/snobGroup";
import { Box, Typography } from "@mui/material";
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

const ItemList = ({
  group,
  paginatedResults,
}: {
  group: SnobGroup;
  paginatedResults: PaginatedResults;
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
          size={{ md: 6, xs: 12 }}
          paddingBottom={2}
          display={"flex"}
          alignItems={"center"}
        >
          <Typography variant="h5">
            {formatNumber(paginatedResults.total)} items
          </Typography>
        </Grid>
        <Grid
          size={{ md: 6, xs: 12 }}
          display={"flex"}
          sx={{ justifyContent: { xs: "flex-start", md: "flex-end" } }}
          paddingBottom={2}
        >
          <SearchBox updateQuery={updateQuery} />
        </Grid>
        <Grid
          size={{ md: 6, xs: 9 }}
          display={"flex"}
          justifyContent={"flex-start"}
          alignItems={"center"}
          paddingBottom={2}
        >
          <SortByMenu updateQuery={updateQuery} />
        </Grid>
        <Grid
          size={{ md: 6, xs: 3 }}
          display={"flex"}
          sx={{ justifyContent: "flex-end" }}
          paddingBottom={2}
        >
          <NewItemButton />
        </Grid>
      </Grid>
      {loading ? (
        <LoadingPage />
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
