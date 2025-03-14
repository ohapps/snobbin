'use client';

import { SnobGroupInvite } from '@/types/snobGroup';
import { Typography, List } from '@mui/material';
import PendingInvite from './PendingInvite';
import CardContainer from '../Card/CardContainer';

const PendingInvites = ({ invites }: { invites: SnobGroupInvite[] }) => {
  return (
    <CardContainer title="Pending Invites">
      {invites.length === 0 && (
        <Typography sx={{ padding: 2 }}>No pending invites</Typography>
      )}
      <List>
        {invites.map((invite) => (
          <PendingInvite key={invite.id} invite={invite} />
        ))}
      </List>
    </CardContainer>
  );
};

export default PendingInvites;
