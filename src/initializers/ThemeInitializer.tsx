"use client";

import { ThemeProvider } from "@mui/material";
import DefaultTheme from "../theme/default";

const ThemeInitializer = ({ children }: { children: React.ReactNode }) => {
  return <ThemeProvider theme={DefaultTheme}>{children}</ThemeProvider>;
};

export default ThemeInitializer;
