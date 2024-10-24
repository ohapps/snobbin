'use client';

import { styled } from '@mui/material';

export const Container = styled('div')(({ theme }) => ({
  maxWidth: theme.spacing(150),
  padding: theme.spacing(2),
  margin: 'auto',
}));

const PageContainer = ({ children }: { children: React.ReactNode }) => {
  return <Container>{children}</Container>;
};

export default PageContainer;
