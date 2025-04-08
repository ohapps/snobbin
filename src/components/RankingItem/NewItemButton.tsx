import { selectedRankingItem } from "@/atoms/app";
import { defaultNewRankingItem } from "@/types/rankings";
import { Button, styled } from "@mui/material";
import { useAtom } from "jotai";

const NewButton = styled(Button)(() => ({
  fontSize: 12,
  height: "40px",
}));

const NewItemButton = () => {
  const [, setSelectedRankingItem] = useAtom(selectedRankingItem);

  const newItem = () => {
    setSelectedRankingItem(defaultNewRankingItem);
  };

  return (
    <NewButton variant="contained" size="small" onClick={newItem}>
      New Item
    </NewButton>
  );
};

export default NewItemButton;
