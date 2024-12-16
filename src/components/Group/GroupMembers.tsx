import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Box,
  Typography,
  styled,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import { SnobGroup } from '@/types/snobGroup';
import { getSnobIdentifier } from '@/utils/get-snob-identifier';
import GroupInvites from './GroupInvites';

export const Text = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(1),
}));

const GroupMembers = ({ group }: { group: SnobGroup }) => {
  return (
    <Box p={2}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          Group Members ({group.members.length})
        </AccordionSummary>
        <AccordionDetails>
          {group.members.map((member) => (
            <Box
              key={member.snob.id}
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <Avatar sx={{ width: 30, height: 30 }}>
                <PersonIcon />
              </Avatar>
              <Text key={member.snob.id}>{getSnobIdentifier(member.snob)}</Text>
            </Box>
          ))}
        </AccordionDetails>
      </Accordion>
      <GroupInvites group={group} />
    </Box>
  );
};

export default GroupMembers;