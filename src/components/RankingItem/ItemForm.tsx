import { RankingItem, RankingItemSchema } from "@/types/rankings";
import { SnobGroup, SnobGroupAttributeSummary } from "@/types/snobGroup";
import Grid from "@mui/material/Grid2";
import { useSnackbar } from "notistack";
import { useState, useTransition } from "react";
import FullSubmitButton from "../Form/FullSubmitButton";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ControlledTextField from "../Form/ControlledTextField";
import { saveItem } from "@/server/actions/items/save-item";
import ImageUploadButton from "../Image/ImageUploadButton";
import { getImageOrPlaceholder } from "@/types/image";
import ItemAttributes from "./ItemAttributes";

const ItemForm = ({
  rankingItem,
  rankingGroup,
  onSave,
  snobGroupAttributes,
}: {
  rankingItem: RankingItem;
  rankingGroup: SnobGroup;
  onSave: () => void;
  snobGroupAttributes: SnobGroupAttributeSummary[];
}) => {
  const [isPending, startTransition] = useTransition();
  const { enqueueSnackbar } = useSnackbar();
  const methods = useForm<RankingItem>({
    defaultValues: {
      id: rankingItem.id,
      groupId: rankingGroup.id,
      description: rankingItem.description,
    },
    mode: "onChange",
    resolver: zodResolver(RankingItemSchema),
  });

  const [attributes, setAttributes] = useState(
    rankingItem?.attributes?.map((attr) => ({
      id: attr.id,
      attributeId: attr.attributeId,
      attributeValue: attr.attributeValue,
    })) ?? [],
  );
  const [image, setImage] = useState(getImageOrPlaceholder(rankingItem));

  const onSubmit = async (data: RankingItem) => {
    startTransition(async () => {
      const results = await saveItem({
        ...data,
        attributes,
        imageId: image.publicId,
        imageUrl: image.url,
      });
      if (results.success) {
        enqueueSnackbar("Item saved successfully", { variant: "success" });
        onSave();
      } else {
        enqueueSnackbar("Failed to save item", { variant: "error" });
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
          <Grid size={{ xs: 12, md: 6 }}>
            <ImageUploadButton image={image} setImage={setImage} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ControlledTextField name="description" label="Description" />
            <ItemAttributes
              groupAttributes={rankingGroup.attributes}
              itemAttributes={attributes}
              setItemAttributes={setAttributes}
              snobGroupAttributes={snobGroupAttributes}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FullSubmitButton
              loading={isPending}
              disabled={!methods.formState.isValid || isPending}
            >
              SAVE ITEM
            </FullSubmitButton>
          </Grid>
        </Grid>
      </form>
    </FormProvider>
  );
};

export default ItemForm;
