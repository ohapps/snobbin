import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  IconButton,
  TextField as MuiTextField,
  Typography,
  styled,
} from '@mui/material';
import { useTransition } from 'react';
import SendIcon from '@mui/icons-material/Send';
import { useSnackbar } from 'notistack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  CreateSnobGroupInvite,
  CreateSnobGroupInviteSchema,
  GroupInviteStatus,
  SnobGroup,
} from '@/types/snobGroup';
import GroupInviteItem from './GroupInviteItem';
import { sendGroupInvite } from '@/server/actions/group/send-group-invite';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import ControlledTextField from '../Form/ControlledTextField';

export const Title = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
  paddingTop: theme.spacing(1),
}));

export const Text = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(0.5),
}));

export const TextField = styled(MuiTextField)(({ theme }) => ({
  paddingTop: theme.spacing(0.5),
  '& .MuiInputBase-input': {
    backgroundColor: theme.palette.common.white,
  },
}));

export const InviteContainer = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
}));

const GroupInvites = ({ group }: { group: SnobGroup }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isPending, startTransition] = useTransition();
  const methods = useForm<CreateSnobGroupInvite>({
    defaultValues: {
      groupId: group.id,
      email: '',
    },
    mode: 'onSubmit',
    resolver: zodResolver(CreateSnobGroupInviteSchema),
  });

  const pendingInvites = group.invites.filter(
    (invite) => invite.status === GroupInviteStatus.PENDING
  );

  const sendInvite = async (data: CreateSnobGroupInvite) => {
    startTransition(async () => {
      const results = await sendGroupInvite(data);
      if (results.success) {
        enqueueSnackbar('Invite sent successfully', {
          variant: 'success',
        });
        methods.reset();
      } else {
        enqueueSnackbar(results.message, { variant: 'error' });
      }
    });
  };

  return (
    <FormProvider<CreateSnobGroupInvite> {...methods}>
      <form
        onSubmit={methods.handleSubmit(sendInvite)}
        noValidate
        autoComplete="off"
      >
        <Box p={2}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              Pending Invites ({pendingInvites.length})
            </AccordionSummary>
            <AccordionDetails>
              {pendingInvites.map((invite) => (
                <GroupInviteItem key={invite.id} invite={invite} />
              ))}
              <ControlledTextField
                name="email"
                placeholder="enter email to invite"
                fullWidth
                InputProps={{
                  endAdornment: (
                    <IconButton type="submit" disabled={isPending}>
                      <SendIcon />
                    </IconButton>
                  ),
                }}
              />
            </AccordionDetails>
          </Accordion>
        </Box>
      </form>
    </FormProvider>
  );
};

export default GroupInvites;
