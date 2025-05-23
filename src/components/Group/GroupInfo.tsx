import { SnobGroup } from "@/types/snobGroup";
import { Box } from "@mui/material";
import GroupDescription from "./GroupDescription";
import GroupTitle from "./GroupTitle";

const GroupInfo = ({
  group,
  expanded,
}: {
  group: SnobGroup;
  expanded: boolean;
}) => {
  return (
    <Box flexDirection="column">
      <GroupTitle group={group} />
      <GroupDescription description={group.description} expanded={expanded} />
    </Box>
  );
};

export default GroupInfo;
