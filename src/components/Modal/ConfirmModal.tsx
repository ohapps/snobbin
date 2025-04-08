"use client";

import { LoadingButton } from "@mui/lab";
import { Button, Dialog, DialogActions, DialogTitle } from "@mui/material";

const ConfirmModal = ({
  open,
  onCancel,
  onConfirm,
  title = "Are you sure?",
  loading = false,
  confirmText = "Yes",
  cancelText = "Cancel",
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
}) => {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogActions>
        <Button onClick={onCancel}>{cancelText}</Button>
        <LoadingButton
          onClick={onConfirm}
          variant="contained"
          loading={loading}
        >
          {confirmText}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmModal;
