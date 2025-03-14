import { Card, CardContent, Typography, styled, Divider } from '@mui/material';

const StyledCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.grey[200],
}));

const Title = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  padding: theme.spacing(2),
}));

const CardContainer = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <StyledCard>
      <CardContent sx={{ padding: 0 }}>
        <Title>{title}</Title>
        <Divider />
        {children}
      </CardContent>
    </StyledCard>
  );
};

export default CardContainer;
