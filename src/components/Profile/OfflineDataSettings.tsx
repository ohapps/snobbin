"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
  styled,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { OFFLINE_ENABLED } from "@/config/offline";
import { clearOfflineData } from "@/data/local/clear";
import {
  getAllGroupSyncStates,
  getLocalGroups,
} from "@/data/local/repositories";
import { getAllGroupSyncStatesDexie, getLocalGroupsDexie } from "@/data/local/dexie-repositories";
import { formatBytes, formatRelativeTime } from "@/utils/format-offline";
import { useConnectivity } from "@/hooks/useConnectivity";
import { useOfflineIdentity } from "@/hooks/useOfflineIdentity";

const Section = styled(Card)(({ theme }) => ({
  maxWidth: theme.breakpoints.values.sm,
  marginTop: theme.spacing(2),
  marginLeft: "auto",
  marginRight: "auto",
}));

const Title = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const OfflineDataSettings = () => {
  const { online } = useConnectivity();
  const sub = useOfflineIdentity();
  const { enqueueSnackbar } = useSnackbar();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [usageBytes, setUsageBytes] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncStates, setSyncStates] = useState<
    Array<{
      groupId: string;
      name: string;
      lastSyncedAt: string | null;
      complete: boolean;
      totalItems: number | null;
    }>
  >([]);

  useEffect(() => {
    if (!OFFLINE_ENABLED || typeof navigator === "undefined") return;
    let cancelled = false;

    const load = async () => {
      try {
        if (navigator.storage?.estimate) {
          const estimate = await navigator.storage.estimate();
          if (!cancelled) setUsageBytes(estimate.usage ?? 0);
        }
      } catch {
        // Best effort.
      }

      try {
        try {
          const [states, groups] = await Promise.all([
            getAllGroupSyncStates(),
            getLocalGroups(),
          ]);
          const names = new Map(groups.map((group) => [group.id, group.name]));
          if (!cancelled) {
            setSyncStates(
              states.map((state) => ({
                groupId: state.groupId,
                name: names.get(state.groupId) ?? "Unknown group",
                lastSyncedAt: state.lastSyncedAt,
                complete: state.complete,
                totalItems: state.totalItems,
              })),
            );
          }
          return;
        } catch (e) {
          // Try Dexie
        }
        const [states, groups] = await Promise.all([
          getAllGroupSyncStatesDexie(),
          getLocalGroupsDexie(),
        ]);
        const names = new Map(groups.map((group) => [group.id, group.name]));
        if (!cancelled) {
          setSyncStates(
            states.map((state) => ({
              groupId: state.groupId,
              name: names.get(state.groupId) ?? "Unknown group",
              lastSyncedAt: state.lastSyncedAt,
              complete: state.complete,
              totalItems: state.totalItems,
            })),
          );
        }
      } catch (err) {
        // No mirror yet, or the local database could not be opened.
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setLoadError(
            msg.includes("crossOriginIsolated") || msg.includes("OPFS") || msg.includes("VFS")
              ? "Offline storage is not available in this browser/environment (missing secure context or storage permissions)."
              : msg,
          );
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [sub, online]);

  if (!OFFLINE_ENABLED) return null;

  const handleClear = async () => {
    setClearing(true);
    try {
      await clearOfflineData();
      setShowClearConfirm(false);
      setUsageBytes(0);
      setSyncStates([]);
      enqueueSnackbar("Offline data cleared", { variant: "success" });
      // A hard refresh will re-bootstrap the current user on next online load.
      window.location.reload();
    } catch (err) {
      enqueueSnackbar(
        err instanceof Error ? err.message : "Failed to clear offline data",
        { variant: "error" },
      );
    } finally {
      setClearing(false);
    }
  };

  const lastSynced = syncStates
    .map((s) => s.lastSyncedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <>
      <Section>
        <Title variant="h6">Offline data</Title>
        <Divider />
        <Box padding={2} display="flex" flexDirection="column" gap={1.5}>
          <Box display="flex" justifyContent="space-between">
            <Typography>Storage used</Typography>
            <Typography color="text.secondary">
              {usageBytes === null ? "—" : formatBytes(usageBytes)}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography>Last synced</Typography>
            <Typography color="text.secondary">
              {formatRelativeTime(lastSynced ?? null)}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography>Mirrored groups</Typography>
            <Typography color="text.secondary">{syncStates.length}</Typography>
          </Box>
          {loadError && (
            <Typography variant="caption" color="error">
              Could not read offline data: {loadError}
            </Typography>
          )}
          {syncStates.length > 0 && (
            <List dense disablePadding>
              {syncStates.map((state) => (
                <ListItem key={state.groupId} disablePadding sx={{ py: 0.25 }}>
                  <ListItemText
                    primaryTypographyProps={{ variant: "body2" }}
                    secondaryTypographyProps={{ variant: "caption" }}
                    primary={state.name}
                    secondary={`${state.complete ? "Complete" : "Partial"}${
                      state.totalItems ? ` · ${state.totalItems} items` : ""
                    } · ${formatRelativeTime(state.lastSyncedAt)}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
          <Button
            variant="outlined"
            color="warning"
            onClick={() => setShowClearConfirm(true)}
          >
            Clear offline data
          </Button>
          <Typography variant="caption" color="text.secondary">
            Removes cached groups, items, rankings, and images for this device.
            {online ? "" : " You'll need to be online again to re-sync."}
          </Typography>
        </Box>
      </Section>

      <Dialog open={showClearConfirm} onClose={() => setShowClearConfirm(false)}>
        <DialogTitle>Clear offline data?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This removes all cached data on this device for your account.
            You&apos;ll need to be online again to rebuild the offline mirror.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowClearConfirm(false)} disabled={clearing}>
            Cancel
          </Button>
          <Button color="warning" onClick={handleClear} disabled={clearing}>
            {clearing ? <CircularProgress size={18} /> : "Clear"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OfflineDataSettings;
