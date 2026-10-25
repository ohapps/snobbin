"use client";

import { useEffect, useState } from "react";
import { Box, Card, CircularProgress, Divider, Typography, styled } from "@mui/material";
import EditProfileForm from "@/components/Profile/EditProfileForm";
import ProfileAvatar from "@/components/Profile/ProfileAvatar";
import { OFFLINE_ENABLED } from "@/config/offline";
import { getLocalCurrentUser } from "@/data/local/repositories";
import type { Snob } from "@/types/snob";
import { useConnectivity } from "@/hooks/useConnectivity";

const Container = styled(Card)(({ theme }) => ({
  maxWidth: theme.breakpoints.values.sm,
  marginTop: theme.spacing(2),
  marginLeft: "auto",
  marginRight: "auto",
}));

const Title = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(2),
}));

/**
 * Profile page. Online it is the editable form. Offline (or when the server
 * render failed) it shows the cached profile read-only — editing is a write.
 */
const ProfilePageClient = ({ serverSnob }: { serverSnob: Snob | null }) => {
  const { online, ready } = useConnectivity();
  const [snob, setSnob] = useState<Snob | null>(serverSnob);
  const [source, setSource] = useState<"server" | "local">("server");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!OFFLINE_ENABLED) return;

    if (online && serverSnob) {
      setSnob(serverSnob);
      setSource("server");
      setError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const local = await getLocalCurrentUser();
        if (cancelled) return;
        if (local) {
          setSnob(local);
          setSource("local");
          setError(null);
        } else {
          setError("No offline copy of your profile is available.");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [online, serverSnob]);

  if (!snob) {
    if (!ready) {
      return (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      );
    }
    return (
      <Box py={4}>
        <Typography color="error">
          {error ?? "Unable to load your profile."}
        </Typography>
      </Box>
    );
  }

  // Offline: read-only rendering. Also applies when the connection dropped
  // while the server-rendered profile is still on screen.
  if (!online || source === "local") {
    return (
      <Container>
        <Title variant="h5">Profile</Title>
        <Divider sx={{ mb: 2 }} />
        <Box padding={2} display="flex" flexDirection="column" alignItems="center" gap={1}>
          <ProfileAvatar snob={snob} size="large" />
          <Typography variant="h6">
            {[snob.firstName, snob.lastName].filter(Boolean).join(" ") || "—"}
          </Typography>
          <Typography color="text.secondary">{snob.email}</Typography>
          <Typography variant="caption" color="text.secondary">
            Editing is unavailable offline.
          </Typography>
        </Box>
      </Container>
    );
  }

  return <EditProfileForm snob={snob} />;
};

export default ProfilePageClient;
