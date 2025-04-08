import { SnobGroup, SnobGroupSchema } from "@/types/snobGroup";
import { zodResolver } from "@hookform/resolvers/zod";
import Grid from "@mui/material/Grid2";
import { FormProvider, useForm } from "react-hook-form";
import ControlledTextField from "../Form/ControlledTextField";
import FullSubmitButton from "../Form/FullSubmitButton";
import { useTransition } from "react";
import ControlledSelect from "../Form/ControlledSelect";
import { MenuItem } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import StarIcon from "@mui/icons-material/Star";
import { saveGroup } from "@/server/actions/group/save-group";
import { useSnackbar } from "notistack";
import GroupAttributes from "./GroupAttributes";

const GroupForm = ({
  group,
  onSave,
}: {
  group: SnobGroup;
  onSave: () => void;
}) => {
  const [isPending, startTransition] = useTransition();
  const { enqueueSnackbar } = useSnackbar();
  const methods = useForm<SnobGroup>({
    defaultValues: {
      id: group.id,
      name: group.name,
      description: group.description,
      minRanking: group.minRanking,
      maxRanking: group.maxRanking,
      increments: group.increments,
      rankIcon: group.rankIcon,
      rankingsRequired: group.rankingsRequired,
      attributes: group.attributes ?? [],
    },
    mode: "onChange",
    resolver: zodResolver(SnobGroupSchema),
  });

  const onSubmit = async (data: SnobGroup) => {
    startTransition(async () => {
      const results = await saveGroup(data);
      if (results.success) {
        enqueueSnackbar("Group saved successfully", {
          variant: "success",
        });
        onSave();
      } else {
        enqueueSnackbar("Failed to save group", { variant: "error" });
      }
    });
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        noValidate
        autoComplete="off"
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <ControlledTextField name="name" label="Name" />
            <ControlledTextField
              name="description"
              label="Description"
              multiline
              rows={4}
            />
            <ControlledTextField
              name="rankingsRequired"
              label="Rankings Required"
              type="number"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <ControlledTextField
              name="minRanking"
              label="Minimum Ranking"
              type="number"
            />
            <ControlledTextField
              name="maxRanking"
              label="Maximum Ranking"
              type="number"
            />
            <ControlledSelect name="increments" label="Increments">
              <MenuItem value={"0.5"}>.5</MenuItem>
              <MenuItem value={"1"}>1</MenuItem>
            </ControlledSelect>
            <ControlledSelect name="rankIcon" label="Rank Icon">
              <MenuItem value={"star"}>
                <StarIcon fontSize="small" />
              </MenuItem>
              <MenuItem value={"favorite"}>
                <FavoriteIcon fontSize="small" />
              </MenuItem>
            </ControlledSelect>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <GroupAttributes />
          </Grid>
          <Grid size={12}>
            <FullSubmitButton
              loading={isPending}
              disabled={!methods.formState.isValid || isPending}
            >
              SAVE GROUP
            </FullSubmitButton>
          </Grid>
        </Grid>
      </form>
    </FormProvider>
  );
};

export default GroupForm;
