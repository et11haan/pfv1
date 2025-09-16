import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProduct } from '../context/ProductContext'; // Assuming deleteUserComment and deleteListing are here
// import './UserProfilePage.css'; // You'll want to create and style this

const UserProfilePage = () => {
  const { userId } = useParams();
  const { user: currentUser, loading: authLoading } = useAuth();
  const { deleteUserComment, deleteListing } = useProduct(); // Get delete functions
  const navigate = useNavigate(); // Initialize useNavigate

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state for each section
  const [commentsPage, setCommentsPage] = useState(1);
  const [listingsPage, setListingsPage] = useState(1);
  const [editsPage, setEditsPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const [bidsPage, setBidsPage] = useState(1);
  const [blogPostsPage, setBlogPostsPage] = useState(1);

  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    // Call it once to set initial state correctly after mount
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isOwnProfile = currentUser && currentUser.id === userId;

  const handleSendMessage = () => {
    navigate(`/messages?recipientId=${userId}`);
  };

  const fetchActivity = useCallback(async (pageParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        commentsPage: pageParams.commentsPage || 1,
        commentsLimit: 5,
        listingsPage: pageParams.listingsPage || 1,
        listingsLimit: 5,
        editsPage: pageParams.editsPage || 1,
        editsLimit: 5,
        salesPage: pageParams.salesPage || 1,
        salesLimit: 5,
        bidsPage: pageParams.bidsPage || 1,
        bidsLimit: 5,
        blogPostsPage: pageParams.blogPostsPage || 1,
        blogPostsLimit: 5,
        ...pageParams // Allow overriding specific page numbers
      }).toString();

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/${userId}/activity?${queryParams}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Error fetching user activity: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Fetched user activity data:", data);

      setProfileData(prevData => {
        if (!prevData || Object.keys(pageParams).length === 0 || (pageParams.commentsPage === 1 && pageParams.listingsPage === 1 /*etc for all sections if implementing full reset on initial load*/)) {
            // Initial load or full refresh
            return data;
        }
        // Append new items for the specific section that was loaded more
        return {
            ...prevData,
            userProfile: prevData.userProfile, // Changed from data.userProfile to prevData.userProfile
            comments: pageParams.commentsPage > 1 ? { ...data.comments, items: [...(prevData.comments?.items || []), ...data.comments.items] } : (data.comments || prevData.comments),
            listings: pageParams.listingsPage > 1 ? { ...data.listings, items: [...(prevData.listings?.items || []), ...data.listings.items] } : (data.listings || prevData.listings),
            productEdits: pageParams.editsPage > 1 ? { ...data.productEdits, items: [...(prevData.productEdits?.items || []), ...data.productEdits.items] } : (data.productEdits || prevData.productEdits),
            itemsSold: pageParams.salesPage > 1 ? { ...data.itemsSold, items: [...(prevData.itemsSold?.items || []), ...data.itemsSold.items] } : (data.itemsSold || prevData.itemsSold),
            activeBids: pageParams.bidsPage > 1 ? { ...data.activeBids, items: [...(prevData.activeBids?.items || []), ...data.activeBids.items] } : (data.activeBids || prevData.activeBids),
            blogPosts: pageParams.blogPostsPage > 1 ? { ...data.blogPosts, items: [...(prevData.blogPosts?.items || []), ...data.blogPosts.items] } : (data.blogPosts || prevData.blogPosts),
        };
      });

      // Update individual page counters based on the response for the section loaded
      if (pageParams.commentsPage) setCommentsPage(data.comments.page);
      if (pageParams.listingsPage) setListingsPage(data.listings.page);
      if (pageParams.editsPage) setEditsPage(data.productEdits.page);
      if (pageParams.salesPage) setSalesPage(data.itemsSold.page);
      if (pageParams.bidsPage) setBidsPage(data.activeBids.page);
      if (pageParams.blogPostsPage && data.blogPosts) setBlogPostsPage(data.blogPosts.page);

    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch activity:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, isOwnProfile]);

  useEffect(() => {
    if (userId) {
      // Initial fetch for all sections
      fetchActivity({
        commentsPage: 1,
        listingsPage: 1,
        editsPage: 1,
        salesPage: 1,
        bidsPage: 1,
        blogPostsPage: 1,
      });
    }
  }, [userId, fetchActivity]);

  const handleLoadMore = (section) => {
    const params = {};
    if (section === 'comments') params.commentsPage = (profileData?.comments?.page || 0) + 1;
    if (section === 'listings') params.listingsPage = (profileData?.listings?.page || 0) + 1;
    if (section === 'edits') params.editsPage = (profileData?.productEdits?.page || 0) + 1;
    if (section === 'sales') params.salesPage = (profileData?.itemsSold?.page || 0) + 1;
    if (section === 'bids') params.bidsPage = (profileData?.activeBids?.page || 0) + 1;
    if (section === 'blogPosts') params.blogPostsPage = (profileData?.blogPosts?.page || 0) + 1;
    fetchActivity(params);
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await deleteUserComment(commentId);
      // Optimistically update UI or refetch comments section
      setProfileData(prev => ({
        ...prev,
        comments: {
          ...prev.comments,
          items: prev.comments.items.filter(c => c._id !== commentId),
          total: prev.comments.total - 1
        }
      }));
      alert("Comment deleted successfully.");
    } catch (err) {
      alert(`Failed to delete comment: ${err.message}`);
    }
  };

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    try {
      await deleteListing(listingId); // This function is from ProductContext
      // Optimistically update UI or refetch listings section
      setProfileData(prev => ({
        ...prev,
        listings: {
          ...prev.listings,
          items: prev.listings.items.filter(l => l._id !== listingId),
          total: prev.listings.total - 1
        }
      }));
      alert("Listing deleted successfully.");
    } catch (err) {
      alert(`Failed to delete listing: ${err.message}`);
    }
  };

  if (authLoading || loading && !profileData) return <div>Loading profile...</div>;
  if (error) return <div style={{ color: 'var(--orange, #FF4D00)' }}>Error: {error}</div>;
  if (!profileData || !profileData.userProfile) return <div>User not found.</div>;

  const { userProfile, comments, listings, productEdits, itemsSold, activeBids, blogPosts } = profileData;

  const profileHeaderBaseStyle = {
    backgroundColor: 'var(--header-bg, white)',
    borderRadius: '0.5rem',
    padding: '1.5rem',
    border: '1px solid var(--border-color, #E0E0E0)',
    marginBottom: '2rem',
    display: 'flex',
    gap: '1rem', // Gap between user info and stats, or between items when stacked
  };

  const profileHeaderResponsiveStyle = {
    ...profileHeaderBaseStyle,
    flexDirection: isMobileView ? 'column' : 'row',
    alignItems: isMobileView ? 'center' : 'stretch', // Stretch to make children same height on desktop if desired, or 'center'
    justifyContent: isMobileView ? 'center' : 'space-between',
  };
  
  const userInfoContainerStyle = {
    display: 'flex',
    flexDirection: isMobileView ? 'column' : 'row',
    alignItems: 'center',
    textAlign: isMobileView ? 'center' : 'left',
    flexGrow: 1, // Allow user info to take available space on desktop
  };

  const userImageStyle = {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    marginRight: isMobileView ? '0' : '1.5rem',
    marginBottom: isMobileView ? '1rem' : '0',
    border: '2px solid var(--border-color, #E0E0E0)',
    flexShrink: 0,
  };

  const userDetailsTextsStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: isMobileView ? 'center' : 'flex-start',
  };
  
  const statsOuterContainerStyle = {
    display: 'flex',
    gap: '1rem',
    width: isMobileView ? '100%' : 'auto',
    maxWidth: isMobileView ? 'calc(180px * 2 + 1rem + 2rem)' : 'auto', // Account for padding of outer if full width
    justifyContent: isMobileView ? 'space-around' : 'flex-start',
    marginTop: isMobileView ? '1.5rem' : '0', // Add margin top on mobile when stacked
    flexShrink: 0,
  };

  const sectionStyle = {
    backgroundColor: 'var(--header-bg, white)',
    borderRadius: '0.5rem',
    padding: '1.5rem',
    border: '1px solid var(--border-color, #E0E0E0)',
    marginBottom: '1.5rem',
    // boxShadow: '0 2px 4px rgba(0,0,0,0.05)' // Optional: subtle shadow like cards
  };

  const headingStyle = {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--text-primary, #333)',
    marginBottom: '1rem'
  };

  const textStyle = {
    color: 'var(--text-primary, #333)',
    marginBottom: '0.25rem',
    fontSize: '0.875rem',
    lineHeight: '1.5'
  };
  
  const smallTextStyle = {
    fontSize: '0.875rem',
    color: '#666',
    display: 'block', // Ensure it takes its own line if needed
    marginBottom: '0.5rem'
  };

  const linkStyle = {
    color: 'var(--link-blue, #0066cc)',
    textDecoration: 'none'
  };

  const buttonStyle = {
    backgroundColor: 'var(--tag-green, #0ACF83)',
    color: 'white',
    padding: '0.625rem 1.25rem',
    borderRadius: '0.25rem',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginTop: '1rem',
    transition: 'background-color 0.2s ease'
  };

  const deleteButtonStyle = {
    marginLeft: '10px',
    color: 'var(--orange, #FF4D00)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    padding: '0.25rem 0.5rem'
  };

  const statsBoxStyle = {
    border: '1px solid var(--border-color, #E0E0E0)',
    borderRadius: '8px',
    overflow: 'hidden',
    width: '180px', // Adjust width as needed
    textAlign: 'left',
  };

  const statsHeaderStyle = {
    padding: '0.5rem 1rem',
    color: 'white',
    fontWeight: '600',
    fontSize: '0.875rem', // Smaller font for these headers
  };

  const statsContentStyle = {
    padding: '1rem',
    backgroundColor: 'var(--header-bg, white)',
    color: 'var(--text-primary, #333)',
    fontSize: '1.75rem',
    fontWeight: '700',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center'
  };
  
  const smallCurrencyStyle = {
    fontSize: '0.875rem',
    color: '#666',
    fontWeight: 'normal'
  };

  // Helper to render a section
  const renderSection = (title, data, loadMoreFn, renderItemFn, deleteFn, itemType) => {
    if (!data) return <p style={smallTextStyle}>No {title.toLowerCase()} found.</p>;
    return (
      <div style={sectionStyle}>
        <h2 style={headingStyle}>{title} ({data.total || 0})</h2>
        {data.items && data.items.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.items.map(item => renderItemFn(item, deleteFn, itemType))}
          </ul>
        ) : (
          <p style={smallTextStyle}>No {title.toLowerCase()} to display.</p>
        )}
        {data.page < data.totalPages && (
          <button 
            onClick={loadMoreFn} 
            disabled={loading}
            style={{...buttonStyle, opacity: loading ? 0.7 : 1}}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = loading ? 'var(--tag-green, #0ACF83)' : '#089960'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--tag-green, #0ACF83)'}
          >
            Load More {title}
          </button>
        )}
      </div>
    );
  };

  const renderCommentItem = (comment, deleteFn) => (
    <li key={comment._id} style={{ borderBottom: '1px solid var(--border-color, #E0E0E0)', padding: '0.75rem 0', listStyle: 'none' }}>
      <p style={textStyle}>
        "{comment.text}"
        {comment.product_id ? (
          <>
            {' on '}
            <Link to={`/part/${comment.product_id.slug || comment.product_id._id}`} style={linkStyle} onMouseOver={e => e.target.style.textDecoration = 'underline'} onMouseOut={e => e.target.style.textDecoration = 'none'}>
              {comment.product_id.title || 'a product'}
            </Link>
          </>
        ) : (
          comment.blogPostId ? (
            <>
              {' on blog post '}
              <Link to={`/blog/${comment.blogPostId.slug || comment.blogPostId._id}`} style={linkStyle} onMouseOver={e => e.target.style.textDecoration = 'underline'} onMouseOut={e => e.target.style.textDecoration = 'none'}>
                {comment.blogPostId.title || 'a blog post'}
              </Link>
            </>
          ) : (' on a deleted item')
        )}
      </p>
      <small style={smallTextStyle}>Posted on: {new Date(comment.createdAt).toLocaleDateString()}</small>
      {isOwnProfile && deleteFn && (
        <button onClick={() => deleteFn(comment._id)} style={deleteButtonStyle}  onMouseOver={e => e.target.style.color = '#cc3d00'} onMouseOut={e => e.target.style.color = 'var(--orange, #FF4D00)'}>Delete</button>
      )}
    </li>
  );

  const renderListingItem = (listing, deleteFn) => (
    <li key={listing._id} style={{ borderBottom: '1px solid var(--border-color, #E0E0E0)', padding: '0.75rem 0', listStyle: 'none' }}>
      <p style={textStyle}>
        {listing.type === 'ask' ? 'Selling' : 'Bidding on'}: <Link to={`/part/${listing.product_id?.slug || listing.product_id?._id}`} style={linkStyle} onMouseOver={e => e.target.style.textDecoration = 'underline'} onMouseOut={e => e.target.style.textDecoration = 'none'}>{listing.product_id?.title || 'Part'}</Link> for ${listing.price}
      </p>
      <small style={smallTextStyle}>Status: {listing.status} - Listed on: {new Date(listing.createdAt).toLocaleDateString()}</small>
      {isOwnProfile && listing.status === 'active' && deleteFn && (
        <button onClick={() => deleteFn(listing._id)} style={deleteButtonStyle} onMouseOver={e => e.target.style.color = '#cc3d00'} onMouseOut={e => e.target.style.color = 'var(--orange, #FF4D00)'}>Delete</button>
      )}
    </li>
  );

  const renderEditItem = (edit) => (
    <li key={edit._id} style={{ borderBottom: '1px solid var(--border-color, #E0E0E0)', padding: '0.75rem 0', listStyle: 'none' }}>
      <p style={textStyle}>
        Edited <Link to={`/part/${edit.slug || edit._id}`} style={linkStyle} onMouseOver={e => e.target.style.textDecoration = 'underline'} onMouseOut={e => e.target.style.textDecoration = 'none'}>{edit.title || 'Part'}</Link>
      </p>
      {edit.edit_history && <small style={smallTextStyle}>Last edit by you on: {new Date(edit.edit_history.timestamp).toLocaleDateString()}</small>}
    </li>
  );

  const renderBlogPostItem = (post) => (
    <li key={post._id} style={{ borderBottom: '1px solid var(--border-color, #E0E0E0)', padding: '0.75rem 0', listStyle: 'none' }}>
      <p style={textStyle}>
        <Link to={`/blog/${post.slug}`} style={linkStyle} onMouseOver={e => e.target.style.textDecoration = 'underline'} onMouseOut={e => e.target.style.textDecoration = 'none'}>{post.title}</Link>
      </p>
      <small style={smallTextStyle}>Published on: {new Date(post.createdAt).toLocaleDateString()}</small>
      {isOwnProfile && (
        <button onClick={() => navigate(`/blog/edit/${post.slug}`)} style={{...deleteButtonStyle, color: 'var(--link-blue, #0066cc)'}} onMouseOver={e => e.target.style.color = '#0052a3'} onMouseOut={e => e.target.style.color = 'var(--link-blue, #0066cc)'}>Edit</button>
      )}
    </li>
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '1.5rem auto', padding: '0 1rem', backgroundColor: '#F5F5F5' }}>
      <div style={profileHeaderResponsiveStyle}>
        <div style={userInfoContainerStyle}>
            <img 
                src={userProfile.profilePicture || '/default-profile.png'} 
                alt={userProfile.name} 
                style={userImageStyle} 
                onError={(e) => { e.target.onerror = null; e.target.src='/default-profile.png'; }}
            />
            <div style={userDetailsTextsStyle}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '600', color: 'var(--text-primary, #333)', marginBottom: '0.25rem' }}>{userProfile.name}</h1>
                <p style={{...smallTextStyle, marginBottom: '0.25rem'}}>Joined: {new Date(userProfile.joinDate).toLocaleDateString()}</p>
                <p style={{...smallTextStyle, marginBottom: isOwnProfile || !currentUser ? '0' : '0.25rem' }}>Status: <span style={{ fontWeight: '500'}}>{userProfile.status}</span></p>
                {isOwnProfile && (
                  <button 
                    onClick={() => navigate('/blog/new')}
                    style={{...buttonStyle, backgroundColor: 'var(--link-blue, #0066cc)', marginTop: '0.75rem'}}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0052a3'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--link-blue, #0066cc)'}
                  >
                    Create New Post
                  </button>
                )}
                {!isOwnProfile && currentUser && (
                  <button 
                    onClick={handleSendMessage}
                    style={{...buttonStyle, backgroundColor: 'var(--link-blue, #0066cc)', marginTop: '0.75rem'}}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0052a3'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--link-blue, #0066cc)'}
                  >
                    Send Message
                  </button>
                )}
            </div>
        </div>
        
        <div style={statsOuterContainerStyle}>
            {/* Items Bought Box */}
            <div style={statsBoxStyle}>
                <div style={{...statsHeaderStyle, backgroundColor: 'var(--tag-green, #0ACF83)'}}>Items Bought</div>
                <div style={statsContentStyle}>
                    <span>0</span>
                </div>
            </div>

            {/* Items Sold Box */}
            <div style={statsBoxStyle}>
                <div style={{...statsHeaderStyle, backgroundColor: 'var(--orange, #FF4D00)'}}>Items Sold</div>
                <div style={statsContentStyle}>
                    <span>0</span>
                </div>
            </div>
        </div>
      </div>

      {renderSection('Comments', comments, () => handleLoadMore('comments'), renderCommentItem, handleDeleteComment, 'comment')}
      {renderSection('Active Listings', listings, () => handleLoadMore('listings'), renderListingItem, handleDeleteListing, 'listing')}
      {renderSection('Product Edits', productEdits, () => handleLoadMore('edits'), renderEditItem)}
      {renderSection('Items Sold', itemsSold, () => handleLoadMore('sales'), renderListingItem)}
      {isOwnProfile && renderSection('My Active Bids', activeBids, () => handleLoadMore('bids'), renderListingItem)}
      {renderSection('Blog Posts', blogPosts, () => handleLoadMore('blogPosts'), renderBlogPostItem)}

    </div>
  );
};

export default UserProfilePage; 