"use client";

import { useState } from "react";
import {
  Box,
  IconButton,
  Menu,
  Typography,
  styled,
} from "@mui/material";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import { useConnectivity } from "@/hooks/useConnectivity";
import { OFFLINE_ENABLED } from "@/config/offline";
import { formatRelativeTime } from "@/utils/format-offline";

const MenuContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  maxWidth: theme.spacing(34),
}));

const MenuTitle = styled(Typography)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  fontWeight: theme.typography.fontWeightBold,
}));

/**
 * Header indicator shown while the app is offline (network down OR API
 * unreachable). Deliberately just an icon so it costs no vertical space on
 * mobile; tapping it explains the read-only state.
 */
const OfflineIndicator = () => {
  const { online, ready } = useConnectivity();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  if (!OFFLINE_ENABLED || !ready || online) return null;

  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    // Loaded lazily so the SQLite client is not pulled into every page's bundle.
    void import("@/data/local/repositories")
      .then(({ getAllGroupSyncStates }) => getAllGroupSyncStates())
      .then((states) => {
        const last = states
          .map((state) => state.lastSyncedAt)
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1);
        setLastSyncedAt(last ?? null);
      })
      .catch(() => {
        setLastSyncedAt(null);
      });
  };

  return (
    <>
      <IconButton
        aria-label="You're offline"
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        size="large"
        color="inherit"
        onClick={handleOpen}
      >
        <CloudOffIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuContent>
          <MenuTitle variant="subtitle2">
            <CloudOffIcon fontSize="small" color="warning" />
            You&apos;re offline
          </MenuTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Showing saved data. Changes are disabled until you&apos;re back
            online.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Last synced {formatRelativeTime(lastSyncedAt)}
          </Typography>
        </MenuContent>
      </Menu>
    </>
  );
};

export default OfflineIndicator;
