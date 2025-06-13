import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  styled,
  Typography,
} from "@mui/material";
import Settings from "@mui/icons-material/Settings";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { getSnobIdentifier } from "@/utils/get-snob-identifier";
import { SnobGroup, SnobGroupMember, SnobGroupRole } from "@/types/snobGroup";
import { useState, useTransition } from "react";
import { LoadingButton } from "@mui/lab";
import { makeMemberAdmin } from "@/server/actions/group/make-member-admin";
import { useSnackbar } from "notistack";
import { disableGroupMember } from "@/server/actions/group/disable-group-member";
import { enableGroupMember } from "@/server/actions/group/enable-group-member";
import ProfileAvatar from "../Profile/ProfileAvatar";

export const Text = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(1),
}));

const GroupMemberDetails = ({
  member,
  group,
}: {
  member: SnobGroupMember;
  group: SnobGroup;
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isUpdating, startTransition] = useTransition();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [showAdminConfirm, setShowAdminConfirm] = useState(false);
  const [showDisableMemberConfirm, setShowDisableMemberConfirm] =
    useState(false);
  const [showEnableMemberConfirm, setShowEnableMemberConfirm] = useState(false);
  const isAdmin = member.role === SnobGroupRole.ADMIN;
  const isDisabled = member.role === SnobGroupRole.DISABLED;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleShowConfirmAdmin = () => {
    setShowAdminConfirm(true);
    handleClose();
  };

  const handleMakeAdmin = () => {
    startTransition(async () => {
      if (member.snob.id && group.id) {
        const results = await makeMemberAdmin(group.id, member.snob.id);
        if (results.success) {
          enqueueSnackbar("Group member updated to admin successfully", {
            variant: "success",
          });
        } else {
          enqueueSnackbar("Failed to update group member to admin", {
            variant: "error",
          });
        }
      }
      setShowAdminConfirm(false);
    });
  };

  const handleShowDisableMemberConfirm = () => {
    setShowDisableMemberConfirm(true);
    handleClose();
  };

  const handleDisableMember = () => {
    startTransition(async () => {
      if (member.snob.id && group.id) {
        const results = await disableGroupMember(group.id, member.snob.id);
        if (results.success) {
          enqueueSnackbar("Group member disabled successfully", {
            variant: "success",
          });
        } else {
          enqueueSnackbar("Failed to disable group member", {
            variant: "error",
          });
        }
        setShowDisableMemberConfirm(false);
      }
    });
  };

  const handleShowEnableMemberConfirm = () => {
    setShowEnableMemberConfirm(true);
    handleClose();
  };

  const handleEnableMember = () => {
    startTransition(async () => {
      if (member.snob.id && group.id) {
        const results = await enableGroupMember(group.id, member.snob.id);
        if (results.success) {
          enqueueSnackbar("Group member enabled successfully", {
            variant: "success",
          });
        } else {
          enqueueSnackbar("Failed to enable group member", {
            variant: "error",
          });
        }
        setShowEnableMemberConfirm(false);
      }
    });
  };

  return (
    <Box display={"flex"} alignItems="center" justifyContent={"space-between"}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <ProfileAvatar snob={member.snob} size="small" />
        <Text key={member.snob.id}>
          {getSnobIdentifier(member.snob)}{" "}
          {isAdmin && <Chip label="admin" size="small" color="primary" />}
          {isDisabled && <Chip label="disabled" size="small" />}
        </Text>
      </Box>
      {!isAdmin && (
        <Box>
          <IconButton
            onClick={handleClick}
            size="small"
            aria-controls={open ? "account-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
          >
            <Settings />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            id="account-menu"
            open={open}
            onClose={handleClose}
            onClick={handleClose}
            slotProps={{
              paper: {
                elevation: 0,
                sx: {
                  overflow: "visible",
                  filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                  mt: 1.5,
                  "& .MuiAvatar-root": {
                    width: 32,
                    height: 32,
                    ml: -0.5,
                    mr: 1,
                  },
                  "&::before": {
                    content: '""',
                    display: "block",
                    position: "absolute",
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: "background.paper",
                    transform: "translateY(-50%) rotate(45deg)",
                    zIndex: 0,
                  },
                },
              },
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            {!isDisabled && (
              <MenuItem onClick={handleShowConfirmAdmin}>
                <ListItemIcon>
                  <AdminPanelSettingsIcon fontSize="small" />
                </ListItemIcon>
                Make Group Admin
              </MenuItem>
            )}
            {!isDisabled && (
              <MenuItem onClick={handleShowDisableMemberConfirm}>
                <ListItemIcon>
                  <PersonOffIcon fontSize="small" />
                </ListItemIcon>
                Disable Group Member
              </MenuItem>
            )}
            {isDisabled && (
              <MenuItem onClick={handleShowEnableMemberConfirm}>
                <ListItemIcon>
                  <PersonAddIcon fontSize="small" />
                </ListItemIcon>
                Enable Group Member
              </MenuItem>
            )}
          </Menu>
          <Dialog
            open={showAdminConfirm}
            onClose={() => setShowAdminConfirm(false)}
          >
            <DialogTitle>
              Are you sure you want to make this member an admin?
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                Admin users can modify group settings, manage members, and
                delete the group.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowAdminConfirm(false)}>Cancel</Button>
              <LoadingButton
                onClick={handleMakeAdmin}
                variant="contained"
                loading={isUpdating}
              >
                Yes
              </LoadingButton>
            </DialogActions>
          </Dialog>
          <Dialog
            open={showDisableMemberConfirm}
            onClose={() => setShowDisableMemberConfirm(false)}
          >
            <DialogTitle>
              Are you sure you want to disable this group member?
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                Disabled group mmembers will no longer be able to access the
                group but their current rankings will be preserved.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowDisableMemberConfirm(false)}>
                Cancel
              </Button>
              <LoadingButton
                onClick={handleDisableMember}
                variant="contained"
                loading={isUpdating}
              >
                Yes
              </LoadingButton>
            </DialogActions>
          </Dialog>
          <Dialog
            open={showEnableMemberConfirm}
            onClose={() => setShowEnableMemberConfirm(false)}
          >
            <DialogTitle>
              Are you sure you want to enable this group member?
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                Enabling this group member will allow them to access the group
                again and they will be able to participate in rankings.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowEnableMemberConfirm(false)}>
                Cancel
              </Button>
              <LoadingButton
                onClick={handleEnableMember}
                variant="contained"
                loading={isUpdating}
              >
                Yes
              </LoadingButton>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
};

export default GroupMemberDetails;
