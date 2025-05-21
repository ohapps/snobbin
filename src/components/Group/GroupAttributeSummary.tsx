import { SnobGroup, SnobGroupAttributeSummary } from "@/types/snobGroup";
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  styled,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export const AttributeTitle = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
}));

export const AttributeValue = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightLight,
  fontSize: theme.typography.body2.fontSize,
}));

const GroupAttributeSummary = ({
  group,
  attributeSummary,
}: {
  group: SnobGroup;
  attributeSummary: SnobGroupAttributeSummary[];
}) => {
  const getTopAttributes = (attributeId: string) => {
    return attributeSummary
      .filter(
        (attr) =>
          attr.attributeId === attributeId && Boolean(attr.attributeValue),
      )
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  return (
    <Box p={2}>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          Top Rankings By Attribute
        </AccordionSummary>
        <AccordionDetails>
          {group.attributes.map((attribute) => (
            <Box key={attribute.id} pb={2}>
              <AttributeTitle>{attribute.name}</AttributeTitle>
              {getTopAttributes(attribute.id).map((attr, index) => (
                <Box key={attr.attributeValue} pb={1}>
                  <AttributeValue>
                    {index + 1} - {attr.attributeValue} ({attr.count} items)
                  </AttributeValue>
                </Box>
              ))}
            </Box>
          ))}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default GroupAttributeSummary;
