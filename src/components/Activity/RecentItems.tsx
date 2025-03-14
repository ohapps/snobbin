'use client';

import { RecentRankingItem } from '@/types/rankings';
import { Typography, List, Box, styled } from '@mui/material';
import Link from 'next/link';
import CardContainer from '../Card/CardContainer';

const StyledLink = styled(Link)(({ theme }) => ({
  padding: theme.spacing(1),
  textDecoration: 'none',
  color: theme.palette.primary.main,
}));

const RecentItems = ({ recentItems }: { recentItems: RecentRankingItem[] }) => {
  return (
    <CardContainer title="Recent Items">
      {recentItems.length === 0 && (
        <Typography sx={{ padding: 2 }}>No recent items</Typography>
      )}
      <List>
        {recentItems.map((item) => (
          <Box key={item.id} padding={1}>
            <StyledLink href={`/groups/${item.groupId}`}>
              {item.groupDescription} - {item.description}
            </StyledLink>
          </Box>
        ))}
      </List>
    </CardContainer>
  );
};

export default RecentItems;
