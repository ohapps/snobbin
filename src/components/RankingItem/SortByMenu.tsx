import { useUpdateQueryParams } from '@/hooks/useUpdateQueryParams';
import { RankingItemSortDirection, RankingItemSoryBy } from '@/types/rankings';
import { enumToDisplay } from '@/utils/enum-to-display';
import { Box, Button, Menu, MenuItem, styled, Typography } from '@mui/material';
import { useState } from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const SortByButton = styled(Button)(({ theme }) => ({
  fontSize: 12,
  height: theme.spacing(4.5),
  marginLeft: theme.spacing(1),
  marginRight: theme.spacing(1),
}));

const SortByMenu = () => {
  const updateQueryParams = useUpdateQueryParams();
  const [sortBy, setSortBy] = useState(RankingItemSoryBy.AVERAGE_RANKING);
  const [sortDirection, setSortDirection] = useState(
    RankingItemSortDirection.ASC
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
    updateQueryParams({ sortBy, sortDirection });
  };

  return (
    <Box display="flex" alignItems="center">
      <Typography>Sorted By:</Typography>
      <SortByButton
        id="sort-by-button"
        aria-controls={open ? 'sort-by-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        variant="contained"
        endIcon={<KeyboardArrowDownIcon />}
      >
        {enumToDisplay(sortBy)} {enumToDisplay(sortDirection)}
      </SortByButton>
      <Menu
        id="sort-by-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
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
          description asc
        </MenuItem>
        <MenuItem
          onClick={() =>
            handleClose(
              RankingItemSoryBy.DESCRIPTION,
              RankingItemSortDirection.DESC
            )
          }
        >
          description desc
        </MenuItem>
        <MenuItem
          onClick={() =>
            handleClose(
              RankingItemSoryBy.AVERAGE_RANKING,
              RankingItemSortDirection.ASC
            )
          }
        >
          average ranking asc
        </MenuItem>
        <MenuItem
          onClick={() =>
            handleClose(
              RankingItemSoryBy.AVERAGE_RANKING,
              RankingItemSortDirection.DESC
            )
          }
        >
          average ranking desc
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default SortByMenu;
