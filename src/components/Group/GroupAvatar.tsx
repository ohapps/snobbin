import { SnobGroup } from "@/types/snobGroup";
import { getGroupInitials } from "@/utils/get-group-initials";
import { styled, Avatar as MuiAvatar } from "@mui/material";

const Avatar = styled(MuiAvatar)(({ theme }) => ({
  width: theme.spacing(6),
  height: theme.spacing(6),
  fontSize: "22px",
  backgroundColor: theme.palette.primary.dark,
}));

const GroupAvatar = ({ group }: { group: SnobGroup }) => {
  return (
    <>
      <Avatar>{getGroupInitials(group)}</Avatar>
    </>
  );
};

export default GroupAvatar;
