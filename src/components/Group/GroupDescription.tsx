import { Button, styled, Typography } from "@mui/material";
import { useState } from "react";

const Description = styled(Typography)(() => ({
  whiteSpace: "pre-wrap",
  textWrap: "balance",
}));

const maxDescriptionLength = 100;

const GroupDescription = ({
  description,
  expanded,
}: {
  description: string;
  expanded: boolean;
}) => {
  const [showMore, setShowMore] = useState(
    description.length > maxDescriptionLength && !expanded,
  );
  const calculatedDescription = showMore
    ? description.substring(0, maxDescriptionLength) + "..."
    : description;

  const onShowMore = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMore(false);
  };

  return (
    <Description>
      {calculatedDescription}
      {showMore && <Button onClick={onShowMore}>show more</Button>}
    </Description>
  );
};

export default GroupDescription;
