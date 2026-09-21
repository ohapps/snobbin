import { RankingItemSoryBy } from "@/types/rankings";
import { enumToDisplay } from "@/utils/enum-to-display";
import { Box, IconButton, Menu, MenuItem } from "@mui/material";
import { useState } from "react";
import SwapVertIcon from '@mui/icons-material/SwapVert';
import CheckIcon from '@mui/icons-material/Check';
import { SnobGroupSearchParams } from "@/types/snobGroup";

const SortByMenu = ({
  updateQuery,
  searchParams
}: {
  updateQuery: (newParams: Record<string, string>) => void;
  searchParams: SnobGroupSearchParams;
}) => {
  const [sortBy, setSortBy] = useState(searchParams.sortBy ?? RankingItemSoryBy.MOST_RECENT);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (sortBy: RankingItemSoryBy) => {
    setSortBy(sortBy);
    setAnchorEl(null);
    updateQuery({ sortBy });
  };

  return (
    <Box display="flex" alignItems="center">
      <IconButton
        id="sort-by-button"
        aria-controls={open ? "sort-by-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
      >
        <SwapVertIcon />
      </IconButton>
      <Menu
        id="sort-by-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        {Object.values(RankingItemSoryBy).map((sortByOption) => (
          <MenuItem key={sortByOption} onClick={() => handleClose(sortByOption)}>
            {sortBy === sortByOption && <CheckIcon sx={{ mr: 1 }} />} sort by {enumToDisplay(sortByOption)}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default SortByMenu;
