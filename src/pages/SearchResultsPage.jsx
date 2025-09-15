import React, { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearch } from '../context/SearchContext';
import ProductCard from '../components/search/ProductCard'; // Assuming this path
import UserCard from '../components/search/UserCard'; // Assuming this path
import BlogPostCard from '../components/search/BlogPostCard'; // <-- NEW
import AddPartCard from '../components/search/AddPartCard'; // Import the new card
import './SearchResultsPage.css'; // Styles for this page

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const {
    results,
    isLoading,
    isLoadingMore,
    error,
    currentPage,
    totalPages,
    limit,
    runSearch,
    setSearchQuery // Get searchQuery setter from context
  } = useSearch();

  const observer = useRef();

  // Set searchQuery in context when URL query param changes
  useEffect(() => {
    setSearchQuery(query);
  }, [query, setSearchQuery]);

  // Run search when query changes
  useEffect(() => {
    if (query) {
      console.log(`[SearchResultsPage] Running initial search for: "${query}"`);
      runSearch(query, 1, limit); // Run initial search for page 1
    }
    // TODO: Consider cleanup function if requests need cancellation on unmount/query change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, limit]); // Rerun only when query or limit changes, runSearch is memoized

  // Infinite scroll observer setup
  const lastElementRef = useCallback(node => {
    if (isLoading || isLoadingMore) return; // Don't observe if already loading
    if (observer.current) observer.current.disconnect(); // Disconnect previous observer

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && currentPage < totalPages) {
        console.log('[SearchResultsPage] Loading more results...');
        runSearch(query, currentPage + 1, limit); // Fetch next page
      }
    });

    if (node) observer.current.observe(node); // Observe the new last element
  }, [isLoading, isLoadingMore, currentPage, totalPages, query, limit, runSearch]);

  // Combine results for easier rendering order (can be customized)
  const combinedResults = [
    ...(results.products.items || []),
    ...(results.users.items || []),
    ...(results.blogPosts.items || [])
  ];
  // You could interleave or sort these differently if needed

  const hasResults = combinedResults.length > 0;
  const canLoadMore = currentPage < totalPages;

  // --- NEW: Prepare results for rendering, inserting the AddPartCard --- 
  const resultsToRender = [...combinedResults]; // Create a mutable copy
  const addPartCardElement = <AddPartCard key="add-part-card" />;
  const insertionIndex = resultsToRender.length > 0 ? 1 : 0; // Second if results exist, first otherwise
  resultsToRender.splice(insertionIndex, 0, addPartCardElement);

  // Find the index of the *last original search result item* within the modified array
  // This ensures the observer attaches to the correct item for loading more
  const lastOriginalItemIndex = hasResults 
    ? resultsToRender.findIndex(item => item === combinedResults[combinedResults.length - 1]) 
    : -1;
  // --- END NEW ---

  return (
    <div className="search-results-page">
      <h1>Search Results for "{query}"</h1>

      {isLoading && <p>Loading initial results...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {!isLoading && !error && !hasResults && (
        <p>No results found for "{query}".</p>
      )}

      {(hasResults || !isLoading) && ( // Render grid if we have results OR if loading is finished (to show AddPartCard even if no results)
        <div className="results-grid">
          {resultsToRender.map((item, index) => {
            // Determine ref for the last *original* element
            const isLastOriginalElement = index === lastOriginalItemIndex;
            const elementRef = isLastOriginalElement ? lastElementRef : null;

            // Check the type of the item and render accordingly
            if (React.isValidElement(item) && item.type === AddPartCard) {
              // Render the AddPartCard element directly
              // Don't attach the infinite scroll ref to this card
              return item; 
            } else if (item.resultType === 'product') {
              return <ProductCard key={`product-${item._id}-${index}`} product={item} ref={elementRef} />;
            } else if (item.resultType === 'user') {
              return <UserCard key={`user-${item._id}-${index}`} user={item} ref={elementRef} />;
            } else if (item.resultType === 'blogPost') {
              return <BlogPostCard key={`post-${item._id}-${index}`} post={item} ref={elementRef} />;
            }
            // Add future types here
            return null;
          })}
        </div>
      )}

      {isLoadingMore && <p>Loading more results...</p>}

      {!isLoading && !isLoadingMore && hasResults && !canLoadMore && (
         <p>End of results.</p>
      )}
    </div>
  );
};

export default SearchResultsPage; 