"use client";

import { AppRoutes } from "@/config/appRoutes";
import {
  CardContent as MuiCardContent,
  Card as MuiCard,
  styled,
} from "@mui/material";
import Link from "next/link";
import { SnobGroup, SnobGroupRole } from "@/types/snobGroup";
import useCurrentGroupMember from "@/hooks/useCurrentGroupMember";
import GroupCardMenu from "./GroupCardMenu";
import GroupInfo from "./GroupInfo";

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
}

const GroupCard = ({ group }: Props) => {
  const groupMember = useCurrentGroupMember(group);
  return (
    <Card>
      <CardContent>
        <CardLink href={`${AppRoutes.GROUPS}/${group.id}`}>
          <GroupInfo group={group} expanded={false} />
        </CardLink>
        {groupMember?.role === SnobGroupRole.ADMIN && (
          <GroupCardMenu group={group} />
        )}
      </CardContent>
    </Card>
  );
};

export default GroupCard;
