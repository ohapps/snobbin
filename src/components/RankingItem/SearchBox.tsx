"use client";

import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import { IconButton, InputAdornment, TextField, styled } from "@mui/material";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

const SearchTextField = styled(TextField)(({ theme }) => ({
  background: theme.palette.common.white,
}));

const SearchBox = ({
  updateQuery,
}: {
  updateQuery: (newParams: Record<string, string>) => void;
}) => {
  const searchParams = useSearchParams();
  const defaultKeyword = searchParams.get("keyword") ?? "";
  const [searchValue, setSearchValue] = useState(defaultKeyword);

  const handleSearch = useDebouncedCallback((keyword: string) => {
    updateQuery({ keyword, page: "1" });
  }, 300);

  const handleClear = () => {
    setSearchValue("");
    handleSearch("");
  };

  return (
    <SearchTextField
      placeholder="Search…"
      fullWidth
      size="small"
      value={searchValue}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchValue(value);
        handleSearch(value);
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={handleClear} disabled={!searchValue}>
              <ClearIcon />
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={{ background: "white" }}
    />
  );
};

export default SearchBox;
