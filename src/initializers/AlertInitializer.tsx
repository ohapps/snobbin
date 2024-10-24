'use client';

import { SnackbarProvider } from 'notistack';

const AlertInitializer = ({ children }: { children: React.ReactNode }) => {
  return <SnackbarProvider maxSnack={3}>{children}</SnackbarProvider>;
};

export default AlertInitializer;
