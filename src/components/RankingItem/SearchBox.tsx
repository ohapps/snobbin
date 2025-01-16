'use client';

import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import {
  Box,
  IconButton,
  InputAdornment,
  TextField,
  styled,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useUpdateQueryParams } from '@/hooks/useUpdateQueryParams';

export const Container = styled(Box)(({ theme }) => ({
  marginRight: theme.spacing(1),
}));

const SearchTextField = styled(TextField)(({ theme }) => ({
  background: theme.palette.common.white,
}));

const SearchBox = () => {
  const updateQueryParams = useUpdateQueryParams();
  const [keyword, setKeyword] = useState('');

  const handleSearch = () => {
    updateQueryParams({ keyword: keyword, page: '1' });
  };

  useEffect(() => {
    handleSearch();
  }, [keyword]);

  return (
    <Container>
      <SearchTextField
        placeholder="Search…"
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
              <IconButton onClick={() => setKeyword('')} disabled={!keyword}>
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ background: 'white' }}
      />
    </Container>
  );
};

export default SearchBox;
