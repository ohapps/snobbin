import { RankingItem } from '@/types/rankings';
import { SnobGroup } from '@/types/snobGroup';
import { Stack } from '@mui/material';
import ItemCard from './ItemCard';

const ItemListPage = ({
  group,
  items,
}: {
  group: SnobGroup;
  items: RankingItem[];
}) => {
  return (
    <Stack spacing={2}>
      {items.map((item) => (
        <ItemCard key={item.id} group={group} item={item} />
      ))}
    </Stack>
  );
};

export default ItemListPage;
