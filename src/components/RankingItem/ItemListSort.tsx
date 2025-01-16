import { useUpdateQueryParams } from '@/hooks/useUpdateQueryParams';
import { RankingItemSortDirection, RankingItemSoryBy } from '@/types/rankings';
import { enumToDisplay } from '@/utils/enum-to-display';
import { Button, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';

const ItemListSort = ({ total }: { total: number }) => {
  const updateQueryParams = useUpdateQueryParams();
  const [sortBy, setSortBy] = useState(RankingItemSoryBy.AVERAGE_RANKING);
  const [sortDirection, setSortDirection] = useState(
    RankingItemSortDirection.DESC
  );

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (
    sortBy: RankingItemSoryBy,
    sortDirection: RankingItemSortDirection
  ) => {
    setSortBy(sortBy);
    setSortDirection(sortDirection);
    setAnchorEl(null);
    updateQueryParams({ sortBy: sortBy, sortDirection: sortDirection });
  };

  return (
    <>
      <Button
        id="sort-button"
        aria-controls={open ? 'sort-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        variant="outlined"
      >
        {total.toLocaleString()} items sorted by {enumToDisplay(sortBy)}{' '}
        {enumToDisplay(sortDirection)}
      </Button>
      <Menu
        id="sort-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => handleClose(sortBy, sortDirection)}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
      >
        <MenuItem
          onClick={() =>
            handleClose(
              RankingItemSoryBy.DESCRIPTION,
              RankingItemSortDirection.ASC
            )
          }
        >
          sort by description asc
        </MenuItem>
        <MenuItem
          onClick={() =>
            handleClose(
              RankingItemSoryBy.DESCRIPTION,
              RankingItemSortDirection.DESC
            )
          }
        >
          sort by description desc
        </MenuItem>
        <MenuItem
          onClick={() =>
            handleClose(
              RankingItemSoryBy.AVERAGE_RANKING,
              RankingItemSortDirection.ASC
            )
          }
        >
          sort by average ranking asc
        </MenuItem>
        <MenuItem
          onClick={() =>
            handleClose(
              RankingItemSoryBy.AVERAGE_RANKING,
              RankingItemSortDirection.DESC
            )
          }
        >
          sort by average ranking desc
        </MenuItem>
      </Menu>
    </>
  );
};

export default ItemListSort;
