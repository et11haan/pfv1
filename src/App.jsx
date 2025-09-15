import { ProductProvider } from './context/ProductContext'
import { AuthProvider } from './context/AuthContext'
import { SearchProvider } from './context/SearchContext'
import { BlogProvider } from './context/BlogContext'
import { HomepageFeedProvider } from './context/HomepageFeedContext'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage/HomePage'
import PartPage from './components/part/PartPage'
import UploadPartPage from './components/upload/UploadPartPage'
import VerifyPhonePage from './pages/VerifyPhonePage'
import SearchResultsPage from './pages/SearchResultsPage'
import UserProfilePage from './pages/UserProfilePage'
import MessagingPage from './pages/MessagingPage'
import AdminPanelPage from './pages/AdminPanelPage'
import BlogPostPage from './pages/BlogPostPage'
import CreateEditBlogPostPage from './pages/CreateEditBlogPostPage'
import '@fontsource/plus-jakarta-sans'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <AuthProvider>
      <ProductProvider>
        <SearchProvider>
          <BlogProvider>
            <HomepageFeedProvider>
              <Router>
                <div className="app">
                  <Navbar />
                  <main>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/part/:productIdOrSlug" element={<PartPage />} />
                      <Route path="/upload-part" element={<UploadPartPage />} />
                      <Route path="/verify-phone" element={<VerifyPhonePage />} />
                      <Route path="/search" element={<SearchResultsPage />} />
                      <Route path="/account/:userId" element={<UserProfilePage />} />
                      <Route path="/messages" element={<MessagingPage />} />
                      <Route path="/admin" element={<AdminRoute><AdminPanelPage /></AdminRoute>} />
                      <Route path="/blog/new" element={<ProtectedRoute><CreateEditBlogPostPage /></ProtectedRoute>} />
                      <Route path="/blog/edit/:slug" element={<ProtectedRoute><CreateEditBlogPostPage /></ProtectedRoute>} />
                      <Route path="/blog/:slug" element={<BlogPostPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </main>
                </div>
              </Router>
            </HomepageFeedProvider>
          </BlogProvider>
        </SearchProvider>
      </ProductProvider>
    </AuthProvider>
  )
}

export default App
