import { PaginatedResults } from "@/types/rankings";
import { SnobGroupSearchParams } from "@/types/snobGroup";
import { Box, Pagination, styled } from "@mui/material";
import { useSearchParams } from "next/navigation";

const PaginationContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: "flex",
  justifyContent: "center",
}));

export const PagingNavigation = ({
  paginatedResults,
  updateQuery,
  searchParams: searchParamsProp,
}: {
  paginatedResults: PaginatedResults;
  updateQuery: (newParams: Record<string, string>) => void;
  /**
   * The effective query params. Offline, page changes are held in local state
   * rather than the URL, so reading `useSearchParams()` here would snap the
   * control back to page 1 after every change. When not provided we fall back to
   * the URL, preserving the online behaviour.
   */
  searchParams?: SnobGroupSearchParams;
}) => {
  const urlSearchParams = useSearchParams();
  const pageParam = searchParamsProp
    ? searchParamsProp.page
    : urlSearchParams.get("page");
  const page = pageParam ? parseInt(pageParam as string, 10) : 1;
  const pageCount = Math.ceil(
    paginatedResults.total / paginatedResults.pageSize,
  );

  const setPage = (page: number) => {
    updateQuery({ page: page.toString() });
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
