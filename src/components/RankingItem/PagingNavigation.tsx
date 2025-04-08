import { useUpdateQueryParams } from "@/hooks/useUpdateQueryParams";
import { PaginatedResults } from "@/types/rankings";
import { Box, Pagination, styled } from "@mui/material";
import { useSearchParams } from "next/navigation";

const PaginationContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: "flex",
  justifyContent: "center",
}));

export const PagingNavigation = ({
  paginatedResults,
}: {
  paginatedResults: PaginatedResults;
}) => {
  const updateQueryParams = useUpdateQueryParams();
  const searchParams = useSearchParams();
  const page = searchParams.get("page")
    ? parseInt(searchParams.get("page") as string, 10)
    : 1;
  const pageCount = Math.ceil(
    paginatedResults.total / paginatedResults.pageSize,
  );

  const setPage = (page: number) => {
    updateQueryParams({ page: page.toString() });
  };

  return (
    <PaginationContainer>
      <Pagination
        count={pageCount}
        page={page}
        onChange={(_, page) => setPage(page)}
        showFirstButton
        showLastButton
      />
    </PaginationContainer>
  );
};
