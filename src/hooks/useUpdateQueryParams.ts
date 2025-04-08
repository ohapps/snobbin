"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useCallback } from "react";

type QueryParamsMap = Record<string, string>;

export const useUpdateQueryParams = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (newParams: QueryParamsMap) => {
      const existingParams = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([name, value]) => {
        existingParams.set(name, value);
      });
      return existingParams.toString();
    },
    [searchParams],
  );

  return (newParams: QueryParamsMap) => {
    router.push(pathname + "?" + createQueryString(newParams));
  };
};
