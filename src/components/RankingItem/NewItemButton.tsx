import { selectedRankingItem } from "@/atoms/app";
import { defaultNewRankingItem } from "@/types/rankings";
import { Fab } from "@mui/material";
import { useAtom } from "jotai";
import AddIcon from "@mui/icons-material/Add";

const NewItemButton = () => {
  const [, setSelectedRankingItem] = useAtom(selectedRankingItem);

  const newItem = () => {
    setSelectedRankingItem(defaultNewRankingItem);
  };

  return (
    <Fab
      onClick={newItem}
      color="primary"
      size="small"
      sx={{ marginLeft: 1 }}
    >
      <AddIcon />
    </Fab>
  );
};

export default NewItemButton;
