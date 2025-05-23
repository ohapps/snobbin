'use client';

import {
  SnobGroup,
  SnobGroupAttributeSummary,
  SnobGroupRole,
} from '@/types/snobGroup';
import {
  CardContent as MuiCardContent,
  Card as MuiCard,
  styled,
} from '@mui/material';
import GroupInfo from './GroupInfo';
import useCurrentGroupMember from '@/hooks/useCurrentGroupMember';
import GroupCardMenu from './GroupCardMenu';
import GroupMembers from './GroupMembers';
import GroupInvites from './GroupInvites';
import GroupAttributeSummary from './GroupAttributeSummary';

const Card = styled(MuiCard)(({ theme }) => ({
  backgroundColor: theme.palette.grey[200],
  padding: 0,
}));

const CardContent = styled(MuiCardContent)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: theme.spacing(2),
}));

interface Props {
  group: SnobGroup;
  attributeSummary: SnobGroupAttributeSummary[];
}

const GroupSummary = ({ group, attributeSummary }: Props) => {
  const groupMember = useCurrentGroupMember(group);

  return (
    <Card>
      <CardContent>
        <GroupInfo group={group} expanded={true} />
        {groupMember?.role === SnobGroupRole.ADMIN && (
          <GroupCardMenu group={group} />
        )}
      </CardContent>
      <GroupMembers group={group} />
      <GroupInvites group={group} />
      <GroupAttributeSummary
        group={group}
        attributeSummary={attributeSummary}
      />
    </Card>
  );
};

export default GroupSummary;
