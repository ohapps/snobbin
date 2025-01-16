'use client';

import { defaultNewRankingItem, PaginatedResults } from '@/types/rankings';
import { SnobGroup } from '@/types/snobGroup';
import { Box, Button, styled } from '@mui/material';
import Grid from '@mui/material/Grid2';
import ItemListSort from './ItemListSort';
import SearchBox from './SearchBox';
import ItemListPage from './ItemListPage';
import { useAtom } from 'jotai';
import { selectedRankingItem } from '@/atoms/app';
import { PagingNavigation } from './PagingNavigation';

const NewItemButton = styled(Button)(({ theme }) => ({
  fontSize: 12,
  height: '40px',
}));

const ItemList = ({
  group,
  paginatedResults,
}: {
  group: SnobGroup;
  paginatedResults: PaginatedResults;
}) => {
  const [, setSelectedRankingItem] = useAtom(selectedRankingItem);

  const newItem = () => {
    setSelectedRankingItem(defaultNewRankingItem);
  };

  return (
    <Box>
      <Grid container>
        <Grid
          size={{ md: 6, xs: 12 }}
          display={'flex'}
          sx={{ justifyContent: { xs: 'flex-end', md: 'flex-start' } }}
          alignItems={'center'}
          paddingBottom={2}
        >
          <ItemListSort total={paginatedResults.total} />
        </Grid>
        <Grid
          size={{ md: 6, xs: 12 }}
          display={'flex'}
          paddingBottom={2}
          justifyContent={'flex-end'}
        >
          <SearchBox />
          <NewItemButton variant="contained" size="small" onClick={newItem}>
            New Item
          </NewItemButton>
        </Grid>
      </Grid>
      <ItemListPage group={group} items={paginatedResults.items} />
      <PagingNavigation paginatedResults={paginatedResults} />
    </Box>
  );
};

export default ItemList;
