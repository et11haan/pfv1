import { createContext, useContext, useState, useCallback } from 'react';

const SearchContext = createContext();

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

const initialResultsState = {
  products: { items: [], total: 0 },
  users: { items: [], total: 0 },
  blogPosts: { items: [], total: 0 },
  // Future types here
};

export const SearchProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState(initialResultsState);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10); // Default limit

  // Use useCallback to memoize the search function
  const runSearch = useCallback(async (query, page = 1, requestedLimit = 10) => {
    if (!query || query.trim() === '') {
      setResults(initialResultsState); // Clear results if query is empty
      setError(null);
      setCurrentPage(1);
      setTotalPages(1);
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }

    const isFetchingMore = page > 1;
    console.log(`[SearchContext] Running search for query: "${query}", page: ${page}, limit: ${requestedLimit}, isFetchingMore: ${isFetchingMore}`);

    setError(null);
    if (isFetchingMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setResults(initialResultsState); // Reset results for a new search (page 1)
      setCurrentPage(1);
      setTotalPages(1);
    }
    setLimit(requestedLimit); // Update limit state

    try {
      const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        limit: requestedLimit.toString(),
      });
      const apiUrl = `http://localhost:3001/api/search?${params.toString()}`;
      console.log(`[SearchContext] Fetching from API: ${apiUrl}`);

      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[SearchContext] Received search data:', data);

      setResults(prevResults => {
        // Handle potential missing keys gracefully
        const newProducts = data.results?.products?.items || [];
        const newUsers = data.results?.users?.items || [];
        const newBlogPosts = data.results?.blogPosts?.items || [];

        return {
          products: {
            items: isFetchingMore ? [...prevResults.products.items, ...newProducts] : newProducts,
            total: data.results?.products?.total ?? prevResults.products.total,
          },
          users: {
            items: isFetchingMore ? [...prevResults.users.items, ...newUsers] : newUsers,
            total: data.results?.users?.total ?? prevResults.users.total,
          },
          blogPosts: {
            items: isFetchingMore ? [...prevResults.blogPosts.items, ...newBlogPosts] : newBlogPosts,
            total: data.results?.blogPosts?.total ?? prevResults.blogPosts.total,
          },
          // Merge future types similarly
        };
      });

      setCurrentPage(data.pagination.currentPage);
      setTotalPages(data.pagination.totalPages);

    } catch (err) {
      console.error('[SearchContext] Error fetching search results:', err);
      setError(err.message);
      // Optionally reset results on error? Depends on desired UX
      // setResults(initialResultsState);
    } finally {
      if (isFetchingMore) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []); // Empty dependency array means this function reference is stable

  const value = {
    searchQuery,
    setSearchQuery, // Allow components to update the query state directly if needed
    results,
    isLoading,
    isLoadingMore,
    error,
    currentPage,
    totalPages,
    limit,
    runSearch, // Provide the search function
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

export default SearchContext; 