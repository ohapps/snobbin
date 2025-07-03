'use client';

import { Box, Button, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();
  return (
    <Box
      justifyContent="center"
      alignItems="center"
      display="flex"
      flexDirection="column"
      height="80vh"
    >
      <Typography variant="h5" padding={2}>
        Page Not Found
      </Typography>
      <Button variant="contained" onClick={() => router.push('/')}>
        Try again
      </Button>
    </Box>
  );
}
