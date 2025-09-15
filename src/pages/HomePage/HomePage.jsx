import React, { useEffect, useRef, useCallback } from 'react';
import { useHomepageFeed } from '../../context/HomepageFeedContext'; // Assuming this will be created
import TrendingCommentCard from '../../components/homepage/TrendingCommentCard';
import TrendingBlogPostCard from '../../components/homepage/TrendingBlogPostCard';
import NewPartCard from '../../components/homepage/NewPartCard';
import './HomePage.css';

const HomePage = () => {
  const { feed, isLoading, isLoadingMore, error, currentPage, totalPages, loadFeed } = useHomepageFeed();

  const observer = useRef();

  useEffect(() => {
    if (currentPage === 0) {
      loadFeed(1);
    }
  }, [currentPage, loadFeed]);

  const lastElementRef = useCallback(node => {
    if (isLoading || isLoadingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && currentPage < totalPages) {
        console.log('[HomePage] Loading more feed items...');
        loadFeed(currentPage + 1);
      }
    });

    if (node) observer.current.observe(node);
  }, [isLoading, isLoadingMore, currentPage, totalPages, loadFeed]);
  
  const hasResults = feed.length > 0;
  const canLoadMore = currentPage < totalPages;

  return (
    <div className="homepage-container">
      <div className="homepage-feed">
        {isLoading && currentPage === 0 && <p>Loading feed...</p>}
        {error && <p className="error-message">Error: {error}</p>}
        
        {!isLoading && !error && !hasResults && (
            <p>The feed is currently empty. Check back later!</p>
        )}

        {feed.map((item, index) => {
          const isLastElement = index === feed.length - 1;
          const ref = isLastElement ? lastElementRef : null;

          switch (item.type) {
            case 'new_part':
              return <NewPartCard key={`new_part-${item.data._id}`} part={item.data} ref={ref} />;
            case 'trending_comment':
              return <TrendingCommentCard key={`t_comment-${item.data._id}`} comment={item.data} ref={ref} />;
            case 'trending_blog_post':
              return <TrendingBlogPostCard key={`t_blog-${item.data._id}`} post={item.data} ref={ref} />;
            default:
              return null;
          }
        })}

        {isLoadingMore && <p>Loading more...</p>}
        
        {!isLoading && !isLoadingMore && hasResults && !canLoadMore && (
            <p>You've reached the end of the feed.</p>
        )}
      </div>
    </div>
  );
};

export default HomePage; 