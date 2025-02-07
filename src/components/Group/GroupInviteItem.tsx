import { Avatar, Box, IconButton, Typography, styled } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Clear';
import { useSnackbar } from 'notistack';
import { useState, useTransition } from 'react';
import PersonIcon from '@mui/icons-material/Person';
import { SnobGroupInvite } from '@/types/snobGroup';
import ConfirmModal from '../Modal/ConfirmModal';
import { deleteGroupInvite } from '@/server/actions/group/delete-group-invite';

export const InviteContainer = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
}));

export const Text = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(1),
}));

const GroupInviteItem = ({ invite }: { invite: SnobGroupInvite }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, startTransition] = useTransition();

  const deleteInvite = async () => {
    startTransition(async () => {
      const results = await deleteGroupInvite(invite);
      if (results.success) {
        enqueueSnackbar('Group invite deleted successfully', {
          variant: 'success',
        });
      } else {
        enqueueSnackbar('Failed to delete group invite', { variant: 'error' });
      }
    });
  };

  return (
    <>
      <InviteContainer>
        <Avatar sx={{ width: 30, height: 30 }}>
          <PersonIcon />
        </Avatar>
        <Text>{invite.email}</Text>
        <IconButton onClick={() => setModalOpen(true)} disabled={loading}>
          <DeleteIcon />
        </IconButton>
      </InviteContainer>
      <ConfirmModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onConfirm={deleteInvite}
        title="Are you sure you want to delete this invite?"
        loading={loading}
      />
    </>
  );
};

export default GroupInviteItem;
