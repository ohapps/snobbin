'use client';

import { FormProvider, useForm } from 'react-hook-form';
import FullSubmitButton from '../Form/FullSubmitButton';
import { Snob, Profile, ProfileSchema } from '@/types/snob';
import ControlledTextField from '../Form/ControlledTextField';
import { zodResolver } from '@hookform/resolvers/zod';
import { saveProfile } from '@/actions/profile/save-profile';
import { useTransition } from 'react';
import { useSnackbar } from 'notistack';
import { Card, Divider, styled } from '@mui/material';
import PageTitle from '../Page/PageTitle';

const Container = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2),
  maxWidth: theme.breakpoints.values.sm,
  marginTop: theme.spacing(2),
  marginLeft: 'auto',
  marginRight: 'auto',
}));

const EditProfileForm = ({ snob }: { snob: Snob }) => {
  const [isPending, startTransition] = useTransition();
  const { enqueueSnackbar } = useSnackbar();
  const methods = useForm<Profile>({
    defaultValues: {
      email: snob.email,
      firstName: snob.firstName,
      lastName: snob.lastName,
    },
    mode: 'onChange',
    resolver: zodResolver(ProfileSchema),
  });

  const onSave = async (data: Profile) => {
    startTransition(async () => {
      const results = await saveProfile(data);
      if (results.success) {
        enqueueSnackbar('Profile updated successfully', {
          variant: 'success',
        });
      } else {
        enqueueSnackbar('Failed to update profile', { variant: 'error' });
      }
    });
  };

  return (
    <Container>
      <PageTitle title="Edit Profile" />
      <Divider sx={{ mb: 2 }} />
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(onSave)}
          noValidate
          autoComplete="off"
        >
          <ControlledTextField name="email" label="Email" disabled />
          <ControlledTextField name="firstName" label="First Name" />
          <ControlledTextField name="lastName" label="Last Name" />
          <FullSubmitButton
            loading={isPending}
            disabled={!methods.formState.isValid || isPending}
          >
            SAVE PROFILE
          </FullSubmitButton>
        </form>
      </FormProvider>
    </Container>
  );
};

export default EditProfileForm;
