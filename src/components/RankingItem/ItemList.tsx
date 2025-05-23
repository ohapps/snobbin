'use client';

import { PaginatedResults } from '@/types/rankings';
import { SnobGroup } from '@/types/snobGroup';
import { Box, styled, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import SearchBox from './SearchBox';
import ItemListPage from './ItemListPage';
import { PagingNavigation } from './PagingNavigation';
import SortByMenu from './SortByMenu';
import NewItemButton from './NewItemButton';
import { formatNumber } from '@/utils/format-number';
import { useUpdateQueryParams } from '@/hooks/useUpdateQueryParams';
import { useTransition } from 'react';
import LoadingPage from '../Page/LoadingPage';
import GroupAvatar from '../Group/GroupAvatar';

const GroupAvatarContainer = styled(Box)(({ theme }) => ({
  paddingRight: theme.spacing(2),
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const ItemList = ({
  group,
  paginatedResults,
  hideGroupSummary,
  setHideGroupSummary,
}: {
  group: SnobGroup;
  paginatedResults: PaginatedResults;
  hideGroupSummary: boolean;
  setHideGroupSummary: (hide: boolean) => void;
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
          display={'flex'}
          alignItems={'center'}
        >
          <Typography variant="h5" display={'flex'} alignItems={'center'}>
            {hideGroupSummary && (
              <GroupAvatarContainer onClick={() => setHideGroupSummary(false)}>
                <GroupAvatar group={group} />
              </GroupAvatarContainer>
            )}
            {formatNumber(paginatedResults.total)} items
          </Typography>
        </Grid>
        <Grid
          size={{ md: 6, xs: 12 }}
          display={'flex'}
          sx={{ justifyContent: { xs: 'flex-start', md: 'flex-end' } }}
          paddingBottom={2}
        >
          <SearchBox updateQuery={updateQuery} />
        </Grid>
        <Grid
          size={{ md: 6, xs: 9 }}
          display={'flex'}
          justifyContent={'flex-start'}
          alignItems={'center'}
          paddingBottom={2}
        >
          <SortByMenu updateQuery={updateQuery} />
        </Grid>
        <Grid
          size={{ md: 6, xs: 3 }}
          display={'flex'}
          sx={{ justifyContent: 'flex-end' }}
          paddingBottom={2}
        >
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
