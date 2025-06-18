import { SnobGroup } from "@/types/snobGroup";
import { getGroupInitials } from "@/utils/get-group-initials";
import { styled, Avatar as MuiAvatar } from "@mui/material";

const Avatar = styled(MuiAvatar)(({ theme }) => ({
  width: theme.spacing(6),
  height: theme.spacing(6),
  fontSize: "22px",
  backgroundColor: theme.palette.primary.dark,
}));

const GroupAvatar = ({
  group,
  size,
  imaageOverrideUrl,
}: {
  group: SnobGroup;
  size: "small" | "large";
  imaageOverrideUrl?: string;
}) => {
  const style =
    size === "large"
      ? { width: 120, height: 120, fontSize: "48px" }
      : { width: 32, height: 32, fontSize: "12px" };

  return (
    <Avatar
      alt="group avatar"
      src={imaageOverrideUrl ?? group.pictureUrl ?? ""}
      sx={style}
    >
      {getGroupInitials(group)}
    </Avatar>
  );
};

export default GroupAvatar;
