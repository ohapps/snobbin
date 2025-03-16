'use client';

import { Box, CircularProgress } from '@mui/material';

const LoadingPage = () => {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
    >
      <CircularProgress size="3rem" />
    </Box>
  );
};

export default LoadingPage;
