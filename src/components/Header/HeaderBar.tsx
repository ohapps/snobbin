'use client';

import { AppBar, styled } from '@mui/material';
import { Toolbar as MuiToolbar } from '@mui/material';
import Logo from './Logo';
import MainNavigation from './MainNavigation';
import NavigationMenu from './NavigationMenu';
import UserMenu from './UserMenu';

export const HeaderItemsWrapper = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

export const Toolbar = styled(MuiToolbar)(({ theme }) => ({
  justifyContent: 'space-between',
}));

const HeaderBar = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <HeaderItemsWrapper>
          <NavigationMenu />
          <Logo />
          <MainNavigation />
        </HeaderItemsWrapper>
        <HeaderItemsWrapper>
          <UserMenu />
        </HeaderItemsWrapper>
      </Toolbar>
    </AppBar>
  );
};

export default HeaderBar;
