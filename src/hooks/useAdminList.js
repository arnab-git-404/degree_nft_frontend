import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";

export function useAdminList({ endpoint, listKey, filterParam }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError("");

      try {
        const params = { page, limit: 10 };

        if (appliedSearch) {
          params.search = appliedSearch;
        }

        if (filter !== "all" && filterParam) {
          params[filterParam] = filter;
        }

        const { data } = await api.get(endpoint, { params });

        if (cancelled) return;

        setItems(data[listKey] || []);
        setPagination(data.pagination || null);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError.response?.data?.message || "Failed to load admin data"
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [endpoint, listKey, filterParam, page, appliedSearch, filter, refreshKey]);

  const handleSearch = (event) => {
    event.preventDefault();
    setAppliedSearch(search.trim());
    setPage(1);
  };

  const changeFilter = (value) => {
    setFilter(value);
    setPage(1);
  };

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  const replaceItem = useCallback((id, nextItem) => {
    setItems((current) =>
      current.map((item) => (item._id === id ? nextItem : item))
    );
  }, []);

  return {
    items,
    pagination,
    isLoading,
    error,
    search,
    setSearch,
    appliedSearch,
    filter,
    changeFilter,
    page,
    setPage,
    refresh,
    replaceItem,
    handleSearch,
  };
}
