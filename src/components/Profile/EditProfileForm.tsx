"use client";

import { FormProvider, useForm } from "react-hook-form";
import FullSubmitButton from "../Form/FullSubmitButton";
import { Snob, Profile, ProfileSchema } from "@/types/snob";
import ControlledTextField from "../Form/ControlledTextField";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveProfile } from "@/server/actions/profile/save-profile";
import { useTransition } from "react";
import { useSnackbar } from "notistack";
import { Box, Card, Divider, styled, Typography } from "@mui/material";

const Container = styled(Card)(({ theme }) => ({
  maxWidth: theme.breakpoints.values.sm,
  marginTop: theme.spacing(2),
  marginLeft: "auto",
  marginRight: "auto",
}));

export const Title = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const EditProfileForm = ({ snob }: { snob: Snob }) => {
  const [isPending, startTransition] = useTransition();
  const { enqueueSnackbar } = useSnackbar();
  const methods = useForm<Profile>({
    defaultValues: {
      email: snob.email,
      firstName: snob.firstName ?? "",
      lastName: snob.lastName ?? "",
    },
    mode: "onChange",
    resolver: zodResolver(ProfileSchema),
  });

  const onSave = async (data: Profile) => {
    startTransition(async () => {
      const results = await saveProfile(data);
      if (results.success) {
        enqueueSnackbar("Profile updated successfully", {
          variant: "success",
        });
      } else {
        enqueueSnackbar("Failed to update profile", { variant: "error" });
      }
    });
  };

  return (
    <Container>
      <Title variant="h5">Edit Profile</Title>
      <Divider sx={{ mb: 2 }} />
      <Box padding={2}>
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
      </Box>
    </Container>
  );
};

export default EditProfileForm;
