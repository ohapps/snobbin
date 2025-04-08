import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  IconButton,
  TextField as MuiTextField,
  Typography,
  styled,
} from "@mui/material";
import { useState, useTransition } from "react";
import SendIcon from "@mui/icons-material/Send";
import { useSnackbar } from "notistack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { GroupInviteStatus, SnobGroup } from "@/types/snobGroup";
import GroupInviteItem from "./GroupInviteItem";
import { sendGroupInvite } from "@/server/actions/group/send-group-invite";

export const Title = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
  paddingTop: theme.spacing(1),
}));

export const Text = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(0.5),
}));

export const TextField = styled(MuiTextField)(({ theme }) => ({
  paddingTop: theme.spacing(0.5),
  "& .MuiInputBase-input": {
    backgroundColor: theme.palette.common.white,
  },
}));

export const InviteContainer = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
}));

const GroupInvites = ({ group }: { group: SnobGroup }) => {
  const [email, setEmail] = useState("");
  const { enqueueSnackbar } = useSnackbar();
  const [isPending, startTransition] = useTransition();

  const pendingInvites = group.invites.filter(
    (invite) => invite.status === GroupInviteStatus.PENDING,
  );

  const sendInvite = () => {
    startTransition(async () => {
      if (group.id) {
        const results = await sendGroupInvite(group.id, email);
        if (results.success) {
          enqueueSnackbar("Invite sent successfully", {
            variant: "success",
          });
          setEmail("");
        } else {
          enqueueSnackbar(results.message, { variant: "error" });
        }
      }
    });
  };

  return (
    <Box pt={2}>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          Pending Invites ({pendingInvites.length})
        </AccordionSummary>
        <AccordionDetails>
          {pendingInvites.map((invite) => (
            <GroupInviteItem key={invite.id} invite={invite} />
          ))}
          <TextField
            placeholder="enter email to invite"
            fullWidth
            value={email}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setEmail(event.target.value);
            }}
            InputProps={{
              endAdornment: (
                <IconButton onClick={sendInvite} disabled={!email || isPending}>
                  <SendIcon />
                </IconButton>
              ),
            }}
          />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default GroupInvites;
