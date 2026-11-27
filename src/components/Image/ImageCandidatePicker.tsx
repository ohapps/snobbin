"use client";

import { useState } from "react";
import {
  Box,
  ButtonBase,
  CircularProgress,
  IconButton,
  Link,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { ItemImage } from "@/types/image";
import { ImageCandidate } from "@/hooks/useIdentifyItem";

const SOURCE_NAMES: Record<ImageCandidate["source"], string> = {
  wikipedia: "Wikipedia",
  commons: "Wikimedia Commons",
  openlibrary: "Open Library",
  tmdb: "TMDB",
};

/**
 * Row of suggested pictures from "Identify with AI". Picking one copies it to
 * Cloudinary (so it behaves like an uploaded image, offline included).
 */
const ImageCandidatePicker = ({
  candidates,
  onPicked,
  onDismiss,
  onError,
}: {
  candidates: ImageCandidate[];
  onPicked: (image: ItemImage) => void;
  onDismiss: () => void;
  onError: (message: string) => void;
}) => {
  const [saving, setSaving] = useState<string | null>(null);

  const pick = async (candidate: ImageCandidate) => {
    if (saving) return;
    setSaving(candidate.url);
    try {
      const response = await fetch("/api/item-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: candidate.url }),
      });
      if (!response.ok) throw new Error();
      onPicked((await response.json()) as ItemImage);
    } catch {
      onError("Couldn't save that image. Try another one.");
    } finally {
      setSaving(null);
    }
  };

  if (candidates.length === 0) return null;

  return (
    <Box sx={{ mt: 2, width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="subtitle2">Pick an image</Typography>
        <Tooltip title="None of these">
          <IconButton
            size="small"
            aria-label="Hide image suggestions"
            onClick={onDismiss}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
          gap: 1,
          mt: 1,
        }}
      >
        {candidates.map((candidate) => (
          <Tooltip
            key={candidate.url}
            title={`${candidate.label} (${SOURCE_NAMES[candidate.source]})`}
          >
            <ButtonBase
              onClick={() => pick(candidate)}
              disabled={!!saving}
              aria-label={`Use image: ${candidate.label}`}
              sx={{
                position: "relative",
                aspectRatio: "2 / 3",
                borderRadius: 1,
                overflow: "hidden",
                bgcolor: "action.hover",
                outline: "2px solid transparent",
                "&:hover, &:focus-visible": { outlineColor: "primary.main" },
              }}
            >
              <Box
                component="img"
                src={candidate.thumbnailUrl}
                alt={candidate.label}
                loading="lazy"
                referrerPolicy="no-referrer"
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: saving && saving !== candidate.url ? 0.5 : 1,
                }}
              />
              {saving === candidate.url && (
                <CircularProgress
                  size={28}
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    mt: "-14px",
                    ml: "-14px",
                  }}
                />
              )}
            </ButtonBase>
          </Tooltip>
        ))}
      </Box>
      {candidates.some((candidate) => candidate.source === "tmdb") && (
        // Attribution required by TMDB's API terms.
        <Typography
          variant="caption"
          color="text.secondary"
          component="p"
          sx={{ mt: 1 }}
        >
          Posters from{" "}
          <Link
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            TMDB
          </Link>
          . This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </Typography>
      )}
    </Box>
  );
};

export default ImageCandidatePicker;
