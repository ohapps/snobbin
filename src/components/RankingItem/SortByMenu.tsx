import { useUpdateQueryParams } from "@/hooks/useUpdateQueryParams";
import { RankingItemSoryBy } from "@/types/rankings";
import { enumToDisplay } from "@/utils/enum-to-display";
import { Box, Button, Menu, MenuItem, styled, Typography } from "@mui/material";
import { useState } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

const SortByButton = styled(Button)(({ theme }) => ({
  fontSize: 12,
  height: theme.spacing(4.5),
  marginLeft: theme.spacing(1),
  marginRight: theme.spacing(1),
}));

const SortByMenu = () => {
  const updateQueryParams = useUpdateQueryParams();
  const [sortBy, setSortBy] = useState(RankingItemSoryBy.MOST_RECENT);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (sortBy: RankingItemSoryBy) => {
    setSortBy(sortBy);
    setAnchorEl(null);
    updateQueryParams({ sortBy });
  };

  return (
    <Box display="flex" alignItems="center">
      <Typography>Sorted By:</Typography>
      <SortByButton
        id="sort-by-button"
        aria-controls={open ? "sort-by-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        variant="contained"
        endIcon={<KeyboardArrowDownIcon />}
      >
        {enumToDisplay(sortBy)}
      </SortByButton>
      <Menu
        id="sort-by-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        {Object.values(RankingItemSoryBy).map((sortBy) => (
          <MenuItem key={sortBy} onClick={() => handleClose(sortBy)}>
            {enumToDisplay(sortBy)}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default SortByMenu;
