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

const ItemList = ({
  group,
  paginatedResults,
}: {
  group: SnobGroup;
  paginatedResults: PaginatedResults;
}) => {
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
          <SearchBox />
        </Grid>
        <Grid
          size={{ md: 6, xs: 9 }}
          display={"flex"}
          justifyContent={"flex-start"}
          alignItems={"center"}
          paddingBottom={2}
        >
          <SortByMenu />
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
      <ItemListPage group={group} items={paginatedResults.items} />
      <PagingNavigation paginatedResults={paginatedResults} />
    </Box>
  );
};

export default ItemList;
