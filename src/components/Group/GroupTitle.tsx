import { SnobGroup } from "@/types/snobGroup";
import { Box, styled, Typography } from "@mui/material";
import GroupAvatar from "./GroupAvatar";

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

const GroupTitle = ({ group }: { group: SnobGroup }) => {
  return (
    <Info>
      <GroupAvatar group={group} size="small" />
      <Title>{group.name}</Title>
    </Info>
  );
};

export default GroupTitle;
