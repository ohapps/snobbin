import { SnobGroup } from "@/types/snobGroup";
import { getGroupInitials } from "@/utils/get-group-initials";
import { styled, Typography, Avatar as MuiAvatar, Box } from "@mui/material";
import GroupDescription from "./GroupDescription";

const Info = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  marginBottom: theme.spacing(2),
}));

const Title = styled(Typography)(({ theme }) => ({
  paddingLeft: theme.spacing(1),
  fontWeight: "bold",
}));

const Avatar = styled(MuiAvatar)(({ theme }) => ({
  width: theme.spacing(6),
  height: theme.spacing(6),
  fontSize: "22px",
  backgroundColor: theme.palette.primary.dark,
}));

const GroupInfo = ({
  group,
  expanded,
}: {
  group: SnobGroup;
  expanded: boolean;
}) => {
  return (
    <Box flexDirection="column">
      <Info>
        <Avatar>{getGroupInitials(group)}</Avatar>
        <Title>{group.name}</Title>
      </Info>
      <GroupDescription description={group.description} expanded={expanded} />
    </Box>
  );
};

export default GroupInfo;
