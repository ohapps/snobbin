'use client';

import { SnobGroupInvite } from '@/types/snobGroup';
import {
  Card as MuiCard,
  CardContent,
  Typography,
  styled,
  Divider,
  List,
} from '@mui/material';
import PendingInvite from './PendingInvite';

const Card = styled(MuiCard)(({ theme }) => ({
  backgroundColor: theme.palette.grey[200],
}));

const Title = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  padding: theme.spacing(2),
}));

const PendingInvites = ({ invites }: { invites: SnobGroupInvite[] }) => {
  return (
    <Card>
      <CardContent sx={{ padding: 0 }}>
        <Title>Pending Invites</Title>
        <Divider />
        {invites.length === 0 && (
          <Typography sx={{ padding: 2 }}>No pending invites</Typography>
        )}
        <List>
          {invites.map((invite) => (
            <PendingInvite key={invite.id} invite={invite} />
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default PendingInvites;
