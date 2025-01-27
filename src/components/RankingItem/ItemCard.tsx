import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card as MuiCard,
  Typography,
  styled,
} from '@mui/material';
import { useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { SnobGroup, SnobGroupRole } from '@/types/snobGroup';
import { RankingItem } from '@/types/rankings';
import Grid from '@mui/material/Grid2';
import ItemRankings from './ItemRankings';
import ItemRating from './ItemRating';
import useCurrentGroupMember from '@/hooks/useCurrentGroupMember';
import ItemCardMenu from './ItemCardMenu';
import ImagePreview from '../Image/ImagePreview';
import { getImageOrPlaceholder } from '@/types/image';

export const Card = styled(MuiCard)(({ theme }) => ({
  backgroundColor: theme.palette.grey[200],
  padding: theme.spacing(2),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

export const Title = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
  fontSize: theme.typography.h6.fontSize,
}));

export const AttributeContainer = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
}));

export const AttributeLabel = styled(Box)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
  paddingTop: theme.spacing(1),
}));

export const AttributeValue = styled(Box)(({ theme }) => ({
  minHeight: theme.spacing(1),
}));

const ItemCard = ({ group, item }: { group: SnobGroup; item: RankingItem }) => {
  const [expanded, setExpanded] = useState(false);
  const groupMember = useCurrentGroupMember(group);

  const getAttributeValue = (id: string) => {
    return (
      item.attributes?.find((attr) => attr.attributeId === id)
        ?.attributeValue ?? ''
    );
  };

  return (
    <Card>
      <Grid container spacing={2}>
        <Grid
          size={{ xs: 12 }}
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '-10px',
            marginBottom: '-40px',
          }}
        >
          {groupMember?.role === SnobGroupRole.ADMIN && (
            <ItemCardMenu item={item} />
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Title>{item.description}</Title>
          <ImagePreview image={getImageOrPlaceholder(item)} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ItemRating group={group} item={item} />
          {group.attributes?.map((attr) => (
            <AttributeContainer key={attr.id}>
              <AttributeLabel>{attr.name}</AttributeLabel>
              <AttributeValue>
                {getAttributeValue(attr.id ?? '')}
              </AttributeValue>
            </AttributeContainer>
          ))}
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Accordion
            expanded={expanded}
            onChange={() => setExpanded(!expanded)}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Rankings</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ItemRankings group={group} item={item} />
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Card>
  );
};

export default ItemCard;
