import {
  Button,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material';
import AcceptIcon from '@mui/icons-material/Check';
import RejectIcon from '@mui/icons-material/ThumbDownAlt';
import { useSnackbar } from 'notistack';
import { SnobGroupInvite } from '@/types/snobGroup';
import { useTransition } from 'react';
import { acceptGroupInvite } from '@/server/actions/group/accept-group-invite';
import { declineGroupInvite } from '@/server/actions/group/decline-group-invite';

const PendingInvite = ({ invite }: { invite: SnobGroupInvite }) => {
  const [loading, startTransition] = useTransition();
  const { enqueueSnackbar } = useSnackbar();

  const acceptInvite = () => {
    startTransition(async () => {
      const results = await acceptGroupInvite(invite.id);
      if (results.success) {
        enqueueSnackbar('Invite accepted successfully', {
          variant: 'success',
        });
      } else {
        enqueueSnackbar('Failed to accept invite', { variant: 'error' });
      }
    });
  };

  const declineInvite = () => {
    startTransition(async () => {
      const results = await declineGroupInvite(invite.id);
      if (results.success) {
        enqueueSnackbar('Invite declined successfully', {
          variant: 'success',
        });
      } else {
        enqueueSnackbar('Failed to decline invite', { variant: 'error' });
      }
    });
  };

  return (
    <ListItem>
      <ListItemText>
        <Typography>{invite.groupName}</Typography>
      </ListItemText>
      <ListItemAvatar>
        <Button
          color="primary"
          variant="contained"
          startIcon={<AcceptIcon />}
          disabled={loading}
          onClick={acceptInvite}
          sx={{ mr: 2 }}
        >
          ACCEPT
        </Button>
        <Button
          color="error"
          variant="text"
          startIcon={<RejectIcon />}
          disabled={loading}
          onClick={declineInvite}
        >
          DECLINE
        </Button>
      </ListItemAvatar>
    </ListItem>
  );
};

export default PendingInvite;
