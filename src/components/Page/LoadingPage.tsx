'use client';

import { Box, CircularProgress } from '@mui/material';

const LoadingPage = ({ fullHeight = true }: { fullHeight?: boolean }) => {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight={fullHeight ? '100vh' : '200px'}
    >
      <CircularProgress size="3rem" />
    </Box>
  );
};

export default LoadingPage;
