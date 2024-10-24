import { styled, Typography } from '@mui/material';

export const LogoText = styled(Typography)(({ theme }) => ({
  marginRight: theme.spacing(4),
  fontWeight: theme.typography.fontWeightBold,
}));

const Logo = () => {
  return (
    <LogoText variant="h6" noWrap>
      Snobbin
    </LogoText>
  );
};

export default Logo;
