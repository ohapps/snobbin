import { selectedRankingItem } from "@/atoms/app";
import { defaultNewRankingItem } from "@/types/rankings";
import { Button } from "@mui/material";
import { useAtom } from "jotai";
import AddIcon from "@mui/icons-material/Add";

const NewItemButton = () => {
  const [, setSelectedRankingItem] = useAtom(selectedRankingItem);

  const newItem = () => {
    setSelectedRankingItem(defaultNewRankingItem);
  };

  return (
    <Button
      variant="contained"
      size="small"
      onClick={newItem}
      startIcon={<AddIcon />}
    >
      New
    </Button>
  );
};

export default NewItemButton;
