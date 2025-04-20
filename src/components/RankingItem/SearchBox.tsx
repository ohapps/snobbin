"use client";

import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import { IconButton, InputAdornment, TextField, styled } from "@mui/material";
import { useEffect, useState } from "react";

const SearchTextField = styled(TextField)(({ theme }) => ({
  background: theme.palette.common.white,
}));

const SearchBox = ({
  updateQuery,
}: {
  updateQuery: (newParams: Record<string, string>) => void;
}) => {
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    updateQuery({ keyword: keyword, page: "1" });
  }, [keyword]);

  return (
    <SearchTextField
      placeholder="Search…"
      fullWidth
      size="small"
      value={keyword}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
        setKeyword(event.target.value)
      }
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={() => setKeyword("")} disabled={!keyword}>
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
