import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
  styled,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { SnobGroup } from "@/types/snobGroup";
import GroupMemberDetails from "./GroupMemberDetails";

export const Text = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(1),
}));

const GroupMembers = ({ group }: { group: SnobGroup }) => {
  return (
    <Box p={2}>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          Group Members ({group.members.length})
        </AccordionSummary>
        <AccordionDetails>
          {group.members.map((member) => (
            <GroupMemberDetails
              key={member.snob.id}
              member={member}
              group={group}
            />
          ))}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default GroupMembers;
