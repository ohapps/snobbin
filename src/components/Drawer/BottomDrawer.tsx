import { Box, Drawer, IconButton, Typography, styled } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import React from 'react';

const Container = styled(Box)(({ theme }) => ({
  borderTopColor: theme.palette.primary.main,
  borderTopStyle: 'solid',
  borderTopWidth: 4,
  padding: theme.spacing(2),
}));

const Content = styled(Box)(({ theme }) => ({
  margin: 'auto',
  maxWidth: theme.spacing(150),
}));

const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const Title = styled(Typography)(({ theme }) => ({}));

const BottomDrawer = ({
  open,
  close,
  title,
  children,
}: {
  open: boolean;
  close: () => void;
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <Drawer anchor="bottom" open={open} onClose={close}>
      <Container>
        <Content>
          <Header>
            <Title variant="h5">{title}</Title>
            <IconButton aria-label="close drawer" onClick={close}>
              <CloseIcon />
            </IconButton>
          </Header>
          {children}
        </Content>
      </Container>
    </Drawer>
  );
};

export default BottomDrawer;
