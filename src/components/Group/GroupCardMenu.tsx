'use client';

import {
  IconButton,
  Menu as MuiMenu,
  MenuItem,
  styled,
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState, useTransition } from 'react';
import { useSnackbar } from 'notistack';
import { LoadingButton } from '@mui/lab';
import { SnobGroup } from '@/types/snobGroup';
import { selectedSnobGroup } from '@/atoms/app';
import { useAtom } from 'jotai';
import { deleteGroup } from '@/server/actions/group/delete-group';

const Menu = styled(MuiMenu)(({ theme }) => ({
  '& .MuiMenu-paper': {
    minWidth: theme.spacing(20),
  },
}));

const GroupCardMenu = ({ group }: { group: SnobGroup }) => {
  const [isDeleting, startTransition] = useTransition();
  const { enqueueSnackbar } = useSnackbar();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [, setSelectedSnobGroup] = useAtom(selectedSnobGroup);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    setSelectedSnobGroup(group);
    handleClose();
  };

  const closeConfirm = () => {
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(true);
    handleClose();
  };

  const handleDelete = async () => {
    startTransition(async () => {
      if (group.id) {
        const results = await deleteGroup(group.id);
        if (results.success) {
          enqueueSnackbar('Group deleted successfully', { variant: 'success' });
          closeConfirm();
        } else {
          enqueueSnackbar('Failed to delete group', { variant: 'error' });
        }
      }
    });
  };

  return (
    <>
      <IconButton
        aria-label="more"
        id="group-edit-button"
        aria-controls={open ? 'group-edit-menu' : undefined}
        aria-expanded={open ? 'true' : undefined}
        aria-haspopup="true"
        onClick={handleClick}
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        id="group-edit-menu"
        MenuListProps={{
          'aria-labelledby': 'group-edit-button',
        }}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        <MenuItem onClick={handleEdit}>Edit Group</MenuItem>
        <MenuItem onClick={handleConfirmDelete}>Delete Group</MenuItem>
      </Menu>
      <Dialog open={showDeleteConfirm} onClose={closeConfirm}>
        <DialogTitle>Are you sure you want to delete this group?</DialogTitle>
        <DialogActions>
          <Button onClick={closeConfirm}>Cancel</Button>
          <LoadingButton
            onClick={handleDelete}
            variant="contained"
            loading={isDeleting}
          >
            Yes
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GroupCardMenu;
