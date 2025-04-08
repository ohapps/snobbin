"use client";

import { AppRoutes } from "@/config/appRoutes";
import {
  CardContent as MuiCardContent,
  Card as MuiCard,
  styled,
  Typography,
  Avatar as MuiAvatar,
  Box,
} from "@mui/material";
import Link from "next/link";
import { SnobGroup, SnobGroupRole } from "@/types/snobGroup";
import { getGroupInitials } from "@/utils/get-group-initials";
import useCurrentGroupMember from "@/hooks/useCurrentGroupMember";
import GroupCardMenu from "./GroupCardMenu";
import GroupMembers from "./GroupMembers";

const Card = styled(MuiCard)(({ theme }) => ({
  backgroundColor: theme.palette.grey[200],
  padding: 0,
  ":hover": {
    backgroundColor: theme.palette.grey[300],
  },
}));

const CardContent = styled(MuiCardContent)(() => ({
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  padding: 0,
  ":last-child": {
    paddingBottom: 0,
  },
}));

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

const Description = styled(Typography)(() => ({
  whiteSpace: "pre-wrap",
  textWrap: "balance",
}));

const Avatar = styled(MuiAvatar)(({ theme }) => ({
  width: theme.spacing(6),
  height: theme.spacing(6),
  fontSize: "22px",
  backgroundColor: theme.palette.primary.dark,
}));

const CardLink = styled(Link)(({ theme }) => ({
  textDecoration: "none",
  display: "flex",
  color: theme.palette.grey[800],
  flex: 1,
  padding: theme.spacing(2),
  paddingRight: 0,
}));

interface Props {
  group: SnobGroup;
  expanded?: boolean;
}

const GroupCard = ({ group, expanded = false }: Props) => {
  const groupMember = useCurrentGroupMember(group);
  return (
    <Card>
      <CardContent>
        <CardLink href={`${AppRoutes.GROUPS}/${group.id}`}>
          <Box flexDirection="column">
            <Info>
              <Avatar>{getGroupInitials(group)}</Avatar>
              <Title>{group.name}</Title>
            </Info>
            <Description>{group.description}</Description>
          </Box>
        </CardLink>
        {groupMember?.role === SnobGroupRole.ADMIN && (
          <GroupCardMenu group={group} />
        )}
      </CardContent>
      {expanded && <GroupMembers group={group} />}
    </Card>
  );
};

export default GroupCard;
