"use client";

import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import { IconButton, InputAdornment, TextField, styled } from "@mui/material";
import { useEffect, useRef, useState } from "react";
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
  // Keywords this box has sent whose query update hasn't landed yet. Each
  // update lands a moment later, and by then the user may have typed more, so
  // those echoes must not be copied back into the input (doing so dropped the
  // newer characters).
  const pendingKeywords = useRef<string[]>([]);

  useEffect(() => {
    const pending = pendingKeywords.current;
    const echo = pending.indexOf(defaultKeyword);
    if (echo !== -1) {
      // Our own update (and any older ones it superseded): keep what's typed.
      pending.splice(0, echo + 1);
      return;
    }
    // Changed elsewhere: back/forward, clearing filters, restoring a
    // remembered filter…
    pendingKeywords.current = [];
    setSearchValue(defaultKeyword);
  }, [defaultKeyword]);

  const handleSearch = useDebouncedCallback((keyword: string) => {
    // Sending the keyword already in effect, with nothing in flight, doesn't
    // change it, so no echo comes back; remembering it would make a later
    // Back to that keyword look like our own echo and be ignored.
    const pending = pendingKeywords.current;
    if (pending.length > 0 || keyword !== defaultKeyword) {
      pending.push(keyword);
    }
    updateQuery({ keyword, page: "1" });
  }, 300);

  const handleClear = () => {
    setSearchValue("");
    handleSearch("");
  };

  return (
    <SearchTextField
      id="item-search"
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
