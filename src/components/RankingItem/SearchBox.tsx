"use client";

import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import { IconButton, InputAdornment, TextField, styled } from "@mui/material";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { SnobGroupSearchParams } from "@/types/snobGroup";

const SearchTextField = styled(TextField)(({ theme }) => ({
  background: theme.palette.common.white,
}));

const SearchBox = ({
  updateQuery,
  searchParams: searchParamsProp,
}: {
  updateQuery: (newParams: Record<string, string>) => void;
  /**
   * The effective query params. Offline, the keyword lives in local state, so
   * reading `useSearchParams()` would desync the input from the active search.
   */
  searchParams?: SnobGroupSearchParams;
}) => {
  const urlSearchParams = useSearchParams();
  const defaultKeyword = searchParamsProp
    ? (searchParamsProp.keyword ?? "")
    : (urlSearchParams.get("keyword") ?? "");
  const [searchValue, setSearchValue] = useState(defaultKeyword);

  useEffect(() => {
    setSearchValue(defaultKeyword);
  }, [defaultKeyword]);

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
