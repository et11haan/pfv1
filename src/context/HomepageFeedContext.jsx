import React, { createContext, useState, useContext, useCallback } from 'react';
import axios from 'axios';

const HomepageFeedContext = createContext();

export const useHomepageFeed = () => {
  return useContext(HomepageFeedContext);
};

export const HomepageFeedProvider = ({ children }) => {
  const [feed, setFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadFeed = useCallback(async (page = 1) => {
    if (page === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const response = await axios.get(`/api/homepage-feed?page=${page}&limit=9`);
      const { feed: newItems, pagination } = response.data;

      setFeed(prevFeed => (page === 1 ? newItems : [...prevFeed, ...newItems]));
      setCurrentPage(pagination.currentPage);
      setTotalPages(pagination.totalPages);

    } catch (err) {
      console.error("Error loading homepage feed:", err);
      setError(err.response?.data?.error || 'Failed to load feed.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  const value = {
    feed,
    isLoading,
    isLoadingMore,
    error,
    currentPage,
    totalPages,
    loadFeed,
  };

  return (
    <HomepageFeedContext.Provider value={value}>
      {children}
    </HomepageFeedContext.Provider>
  );
}; 