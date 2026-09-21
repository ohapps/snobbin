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
import { useEffect, useState } from "react";
import FilterListIcon from "@mui/icons-material/FilterList";
import {
  SnobGroup,
  SnobGroupAttributeSummary,
  SnobGroupSearchParams,
} from "@/types/snobGroup";

const FilterContainer = styled(Box)(({ theme }) => ({
  width: theme.spacing(32),
  maxHeight: "75vh",
  overflowY: "auto",
  padding: theme.spacing(2),
}));

const HeaderText = styled(Typography)(({ theme }) => ({
  paddingBottom: theme.spacing(2),
  fontWeight: theme.typography.fontWeightBold,
}));

const Buttons = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5),
  gap: theme.spacing(1),
  display: "flex",
  justifyContent: "flex-end",
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const filterDefaults = {
  status: "all",
};

interface FilterByMenuProps {
  group: SnobGroup;
  attributeSummary: SnobGroupAttributeSummary[];
  updateQuery: (newParams: Record<string, string>) => void;
  searchParams: SnobGroupSearchParams;
}

const FilterByMenu = ({
  group,
  attributeSummary,
  updateQuery,
  searchParams,
}: FilterByMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [status, setStatus] = useState(
    searchParams.status ?? filterDefaults.status,
  );

  const getInitialAttributeFilters = () => {
    const initial: Record<string, string> = {};
    group.attributes.forEach((attr) => {
      initial[attr.id] = searchParams[`attr_${attr.id}`] ?? "all";
    });
    return initial;
  };

  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, string>
  >(getInitialAttributeFilters);

  useEffect(() => {
    setStatus(searchParams.status ?? filterDefaults.status);
    const updated: Record<string, string> = {};
    group.attributes.forEach((attr) => {
      updated[attr.id] = searchParams[`attr_${attr.id}`] ?? "all";
    });
    setSelectedAttributes(updated);
  }, [searchParams, group.attributes]);

  const open = Boolean(anchorEl);

  const statusApplied = status && status !== filterDefaults.status ? 1 : 0;
  const attributesApplied = Object.values(selectedAttributes).filter(
    (val) => val && val !== "all",
  ).length;
  const filtersApplied = statusApplied + attributesApplied;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const applyfilters = () => {
    const queryParams: Record<string, string> = {
      status,
      page: "1",
    };
    group.attributes.forEach((attr) => {
      queryParams[`attr_${attr.id}`] = selectedAttributes[attr.id] ?? "all";
    });
    updateQuery(queryParams);
    setAnchorEl(null);
  };

  const resetFilters = () => {
    setStatus(filterDefaults.status);
    const resetAttrs: Record<string, string> = {};
    const queryParams: Record<string, string> = {
      status: filterDefaults.status,
      page: "1",
    };
    group.attributes.forEach((attr) => {
      resetAttrs[attr.id] = "all";
      queryParams[`attr_${attr.id}`] = "all";
    });
    setSelectedAttributes(resetAttrs);
    updateQuery(queryParams);
    setAnchorEl(null);
  };

  const getAttributeOptions = (attributeId: string) => {
    const valuesFromSummary = attributeSummary
      .filter(
        (attr) =>
          attr.attributeId === attributeId && Boolean(attr.attributeValue),
      )
      .map((attr) => attr.attributeValue);
    const selectedVal = selectedAttributes[attributeId];
    if (
      selectedVal &&
      selectedVal !== "all" &&
      !valuesFromSummary.includes(selectedVal)
    ) {
      valuesFromSummary.push(selectedVal);
    }
    return Array.from(new Set(valuesFromSummary)).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  };

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
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
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
          {group.attributes.map((attribute) => {
            const options = getAttributeOptions(attribute.id);
            return (
              <FormControl
                fullWidth
                size="small"
                key={attribute.id}
                sx={{ mb: 2 }}
              >
                <InputLabel id={`attr-filter-label-${attribute.id}`}>
                  {attribute.name}
                </InputLabel>
                <Select
                  labelId={`attr-filter-label-${attribute.id}`}
                  id={`attr-filter-${attribute.id}`}
                  label={attribute.name}
                  value={selectedAttributes[attribute.id] ?? "all"}
                  onChange={(e) => {
                    setSelectedAttributes((prev) => ({
                      ...prev,
                      [attribute.id]: e.target.value,
                    }));
                  }}
                >
                  <MenuItem value={"all"}>All</MenuItem>
                  {options.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          })}
        </FilterContainer>
        <Buttons>
          <Button onClick={resetFilters}>RESET</Button>
          <Button variant="contained" onClick={applyfilters}>
            APPLY
          </Button>
        </Buttons>
      </Menu>
    </Box>
  );
};

export default FilterByMenu;
