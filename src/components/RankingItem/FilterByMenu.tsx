import {
  Badge,
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  styled,
  Typography,
} from "@mui/material";
import { useState } from "react";
import FilterListIcon from "@mui/icons-material/FilterList";
import { SnobGroupSearchParams } from "@/types/snobGroup";

const FilterContainer = styled(Box)(({ theme }) => ({
  width: theme.spacing(30),
  padding: theme.spacing(1),
}));

const HeaderText = styled(Typography)(({ theme }) => ({
  paddingBottom: theme.spacing(2),
}));

const Buttons = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  gap: theme.spacing(1),
  display: 'flex',
  justifyContent: "flex-end",
}));

const filterDefaults = {
  status: "all"
}

const FilterByMenu = ({
  updateQuery,
  searchParams
}: {
  updateQuery: (newParams: Record<string, string>) => void;
  searchParams: SnobGroupSearchParams;
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [status, setStatus] = useState(searchParams.status ?? filterDefaults.status);
  const open = Boolean(anchorEl);
  const filtersApplied = (status === filterDefaults.status ? 0 : 1);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const applyfilters = () => {
    updateQuery({ status });
    setAnchorEl(null);
  }

  const resetFilters = () => {
    setStatus(filterDefaults.status);
    updateQuery({
      status: filterDefaults.status
    });
    setAnchorEl(null);
  }

  return (
    <Box display="flex" alignItems="center">
      <IconButton
        id="filter-by-button"
        aria-controls={open ? "filter-by-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
      >
        <Badge badgeContent={filtersApplied} color="secondary">
          <FilterListIcon />
        </Badge>
      </IconButton>
      <Menu
        id="filter-by-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
      >
        <FilterContainer>
          <HeaderText>Filter Options</HeaderText>
          <FormControl fullWidth>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              id="status-filter"
              label="Status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
              }}
            >
              <MenuItem value={"all"}>All</MenuItem>
              <MenuItem value={"ranked"}>Ranked</MenuItem>
              <MenuItem value={"pending"}>Pending</MenuItem>
            </Select>
          </FormControl>
        </FilterContainer>
        <Buttons>
          <Button onClick={resetFilters}>RESET</Button>
          <Button variant="contained" onClick={applyfilters}>APPLY</Button>
        </Buttons>
      </Menu>
    </Box>
  );
};

export default FilterByMenu;
