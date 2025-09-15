# Parts Marketplace Documentation (Updated June 2024)

---

## Project Overview

Parts Marketplace is a community-driven web application for cataloging, buying, and selling automotive parts. Built with the MERN stack (MongoDB, Express, React, Node.js), it enables users to browse, list, and discuss parts, as well as collaboratively edit part information in a wiki-style format.

---

## System Architecture

### Tech Stack
- **Frontend:** React 19 (Vite), TailwindCSS
- **Backend:** Express.js
- **Database:** MongoDB
- **State Management:** React Context API
- **Markdown Processing:** Marked
- **Sanitization:** DOMPurify
- **Routing:** React Router DOM v7

### Directory Structure
- `/src`: React frontend
  - `/components`: UI components by feature
  - `/context`: React Context for state
  - `/pages`: Page-level components
  - `/styles`: CSS
  - `/assets`: Static assets
- `/db`: Database connection/utilities
- `/models`: MongoDB schema definitions
- `/public`: Static files

---

## Key Features

1. **Parts Catalog:** Browse/search automotive parts
2. **Part Details:** View comprehensive part info
3. **Listings:** Create/view "Ask" (sell) and "Bid" (buy) offers
4. **Comments:** Discuss parts with the community
5. **Part Creation:** Add new parts to the catalog
6. **Wiki-style Editing:** Collaborative editing of part info
7. **Image Upload & Voting:** Add image URLs, vote, and report images

---

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local/cloud)
- npm or yarn

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory:
   ```
   MONGODB_URI=mongodb://localhost:27017/parts_marketplace
   PORT=3001
   ```

### Running in Development
1. Start MongoDB
2. Start backend:
   ```bash
   npm run server
   # or with auto-reload:
   npx nodemon server.js
   ```
3. In a separate terminal, start Vite dev server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173`

### Running in Production
1. Build React app:
   ```bash
   npm run build
   ```
2. Start production server:
   ```bash
   node server.js
   ```
3. App available at `http://localhost:3001`

### Database Initialization
- Run migrations:
  ```bash
  node migrate.js
  ```
- Check DB connection:
  ```bash
  node checkDb.js
  ```

---

## Core Concepts & Workflows

### Part vs. Listing
- **Part:** Catalog entry (unique automotive part, with description, images, etc.)
- **Listing:** Buy/sell offer for a part ("Ask" = sell, "Bid" = buy)

### Adding a New Part
1. Go to "Upload Part" page
2. Complete multi-step form:
   - Name, tags, (optional) image, (optional) part numbers, description
3. **You must be logged in to upload a part.**
4. Backend validates, checks for duplicates, processes markdown, creates slug, saves to DB
5. (Optional) Initial image saved to `images` collection, or as part of the part if provided

### Viewing a Part
1. Navigate to `/part/:productIdOrSlug`
2. `PartPage` loads, fetches data via `ProductContext`
3. Displays header, images, description, pricing, comments

### Creating a Listing
1. On part page, create "Ask" or "Bid" listing
2. Submit via `POST /api/listings`
3. Listing saved and associated with part

### Adding an Image
1. On part page, click "Add Image"
2. `UploadImageModal` prompts for image URL (with Imgur link suggestion)
3. Submit via `POST /api/parts/:productId/images`
4. Backend validates, checks for duplicates, saves image
5. Frontend updates gallery/carousel

### Voting/Reporting Images
- **Vote:** Upvote via `PUT /api/images/:imageId/vote` (increments vote count)
- **Report:** Flag via `PUT /api/images/:imageId/report` (hides image, logs to backend)

---

## API Reference

### Products API

#### `GET /api/products/:productIdOrSlug`
- Retrieves product info, listings, comments, top images
- **Query params:**
  - `commentsPage`, `commentsLimit`, `listingsPage`, `listingsLimit`
- **Response:**
  ```json
  {
    "product": { ... },
    "listings": { ... },
    "comments": { ... }
  }
  ```

#### `PUT /api/products/:productId`
- Update product info (title, tags, part numbers, description, editorUsername)
- **Request body:**
  ```json
  {
    "title": "...",
    "tags": ["..."],
    "part_numbers": ["..."],
    "description_markdown": "...",
    "editorUsername": "..."
  }
  ```
- **Response:** Updated product object

### Comments API

#### `POST /api/comments`
- Add comment to product
- **Request body:**
  ```json
  {
    "productId": "...",
    "user": "...",
    "text": "..."
  }
  ```
- **Response:** 201 Created, comment object

### Listings API

#### `POST /api/listings`
- Create ask/bid listing
- **Request body:**
  ```json
  {
    "productId": "...",
    "type": "ask", // or "bid"
    "seller": "...",
    "price": 100.00,
    "location": "...",
    "description": "...",
    "image": "..." // optional
  }
  ```
- **Response:** 201 Created, listing object

### Parts API

#### `POST /api/parts`
- Add new part to catalog
- **Requires authentication (JWT token)**
- **Request body:**
  ```json
  {
    "name": "...",
    "tags": ["..."],
    "partNumbers": [{"number": "...", "link": "..."}], // optional
    "description": "...",
    "images": ["..."] // optional, first valid URL will be used as initial image
  }
  ```
- **Note:** The server uses the authenticated user's name for `created_by`. Do **not** send `creatorUsername`.
- **Response:** 201 Created, part object; 409 Conflict if duplicate

### Images API

#### `GET /api/parts/:productId/images`
- Get all images for a product, sorted by votes (desc), then timestamp (desc)
- **Response:** Array of image objects

#### `POST /api/parts/:productId/images`
- Add image URL to product
- **Request body:**
  ```json
  {
    "imageUrl": "...",
    "uploaderUsername": "..."
  }
  ```
- **Response:** 201 Created, image object; 409 Conflict if duplicate

#### `PUT /api/images/:imageId/vote`
- Upvote image
- **Response:** 200 OK, updated image object

#### `PUT /api/images/:imageId/report`
- Report image (sets `reported: true`)
- **Response:** 200 OK, success message

---

## Data Models

### Product
```js
{
  _id: ObjectId,
  title: String,
  slug: String,
  tags: [String],
  part_numbers: [ { number: String, link: String } ], // New format; legacy: [String]
  description_markdown: String,
  description_full_html: String,
  description_preview_html: String,
  production_years: { start: Number, end: Number },
  images: [Image], // Top 3 voted, non-reported (dynamic, not stored); may include initial image if provided
  created_by: String, // Sourced from authenticated user
  created_at: Date,
  updated_at: Date,
  last_edited_by: String,
  initial_description_markdown: String,
  edit_history: [
    {
      user: String,
      timestamp: Date,
      description_markdown: String
    }
  ],
  is_verified: Boolean
}
```

### Listing
```js
{
  _id: ObjectId,
  product_id: ObjectId,
  type: String, // 'ask' or 'bid'
  seller: String,
  price: Number,
  location: String,
  description: String,
  image: String,
  timestamp: Date
}
```

### Comment
```js
{
  _id: ObjectId,
  product_id: ObjectId,
  user: String,
  text: String,
  timestamp: Date
}
```

### Image
```js
{
  _id: ObjectId,
  product_id: ObjectId,
  url: String,
  uploader: String,
  votes: Number,
  reported: Boolean,
  timestamp: Date
}
```

#### Legacy Data Handling
- **Part Numbers:**
  - Legacy: `[String]`
  - New: `[ { number: String, link: String } ]`
  - UI and backend handle both formats for backward compatibility

---

## Frontend Overview

### Context API (`ProductContext.jsx`)
- Provides global state:
  - `product`, `listings`, `comments`, `allImages`
  - Methods: `fetchProductData`, `addListing`, `addComment`, `updateProduct`, `addImage`, `voteImage`, `reportImage`

### Key Components
- **Navbar:** Navigation (Home, Upload Part, [future] Profile/Auth)
- **PartPage:** Main part details view (fetches and displays all part data)
- **UploadPartPage:** Multi-step form for new parts (name, tags, image, part numbers, description, confirmation)
- **ImageGallery:** Shows top-voted images, add image button, opens carousel
- **UploadImageModal:** Modal for submitting image URLs (with Imgur instructions)
- **ImageCarouselModal:** Modal for viewing/voting/reporting all images
- **EditDescriptionModal:** Edit part description, tags, part numbers (handles both legacy and new part number formats)
- **PartHeader:** Shows title, tags, part numbers, model years, action buttons
- **PriceSection:** Shows lowest ask/highest bid
- **Comments:** Displays and manages comments

#### Part Numbers UI
- If one part number: show number
- If multiple: show first + "n more" (e.g., "123456789 + 2 more")
- Clicking opens modal with all numbers/links (links truncated to 10 chars, open in new tab)

#### EditDescriptionModal
- Edit description (markdown), tags, part numbers
- Add/remove part numbers (with optional links)
- Handles both legacy and new part number formats

---

## Security & Validation
- All user content sanitized with DOMPurify
- Input validation on all API endpoints
- Markdown processed securely
- Image URLs validated; moderation via user reporting

### Rate Limiting
To prevent abuse and ensure service stability, the API employs rate limiting using the `express-rate-limit` package. Limits are configured in `server.js` and are applied on a per-route basis. The general strategy is to apply stricter limits to sensitive or costly operations (like authentication and phone verification) and more lenient limits to general browsing.

**Current Limits:**

| Limiter                  | Route(s)                                       | Limit                                | Keyed By      |
| ------------------------ | ---------------------------------------------- | ------------------------------------ | ------------- |
| `authLimiter`            | `/api/auth/google`, `/api/auth/google/callback`| 5 requests / 15 minutes            | IP Address    |
| `verificationLimiter`    | `/api/auth/verify-phone-code`                  | 10 requests / 1 hour               | User or IP    |
| `codeRequestLimiter`     | `/api/auth/request-phone-code`                 | 5 requests / 5 minutes             | User or IP    |
| `postCommentLimiter`     | `/api/comments`                                | 5 requests / 5 minutes             | User or IP    |
| `voteLimiter`            | `/api/comments/.../vote`, `/api/images/.../vote` | 30 requests / 5 minutes            | User or IP    |
| `messagingSendLimiter`   | `/api/messages`                                | 20 requests / 5 minutes            | User or IP    |
| `messagingReadLimiter`   | `/api/messages/...`                            | 120 requests / 5 minutes           | User or IP    |
| `listingWriteLimiter`    | `/api/listings` (POST, DELETE)                 | 10 requests / 15 minutes           | User or IP    |
| `searchLimiter`          | `/api/search`                                  | 60 requests / 5 minutes            | IP Address    |

**Testing Locally:**

You can test the rate limiters by repeatedly sending requests to an endpoint. For example, using a Node.js one-liner to hit the search endpoint 10 times (with a limit of 5):

```bash
node -e "let i=1; (async()=>{for(;i<=10;i++){let res=await fetch('http://127.0.0.1:3001/api/search?q=test'); console.log(i+':', res.status); } })()"
```

This will produce five `200` status codes, followed by five `429` (Too Many Requests) status codes.

---

## Configuration
- `.env` variables:
  - `MONGODB_URI`: MongoDB connection string
  - `PORT`: Server port (default: 3001)

---

## Development & Deployment
- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Start backend: `node server.js` or `npx nodemon server.js`
- Build for production: `npm run build`
- Start production: `node server.js`

### Database
- MongoDB stores products, listings, comments, images
- Indexes recommended on `images.product_id`, `images.votes`, `images.reported`

---

## Troubleshooting
- **Server issues:** Check MongoDB, connection string, backend port
- **App not loading:** Check Vite dev server, backend API
- **Changes not saving:** Check DB connection, API responses
- **Port 3001 in use:** Kill process (see below)
  ```powershell
  for /f "tokens=5" %a in ('netstat -aon ^| findstr :3001') do taskkill /PID %a /F
  ```

### Admin Access Issues (`isAdminForTags`)

**Symptom:** User is unable to access admin-protected areas despite having the correct `isAdminForTags` (e.g., `["Honda", "BMW"]`) set in their MongoDB user document. The client-side `user.isAdminForTags` array (from `AuthContext`) appears empty, or the JWT token does not contain the expected tags.

**Potential Causes & Solutions:**

1.  **MongoDB Document Corruption:**
    *   **Problem:** The user document in MongoDB might have malformed keys related to `isAdminForTags` (e.g., `"isAdminForTags": ["Value"]` as a literal string key, instead of the field `isAdminForTags`). This can confuse Mongoose or the MongoDB driver.
    *   **Solution:**
        *   Manually inspect the user document in MongoDB Compass or a similar tool.
        *   Ensure the `isAdminForTags` field is a correctly formatted array (e.g., `isAdminForTags: ["Tag1", "Tag2"]`).
        *   Delete any extraneous or malformed fields that look like `isAdminForTags` but are actually string literals for keys.

2.  **Mongoose `findOneAndUpdate` Behavior in Passport Strategy (`server.js`):
    *   **Problem:** The `User.findOneAndUpdate()` call during the Google OAuth login flow might be unintentionally clearing or mishandling the `isAdminForTags` field when updating other user details (like `lastLogin`).
    *   **Solution (`server.js` - Passport Google Strategy):**
        *   Modify the `$set` operator in `User.findOneAndUpdate()` to *not* touch `isAdminForTags` for existing users. This field should ideally be managed separately from the login update logic.
        *   Ensure `$setOnInsert` correctly initializes `isAdminForTags` (e.g., to an empty array `[]`) only when a new user document is created.
        *   Example modification:
            ```javascript
            // ... inside GoogleStrategy callback
            const existingUser = await User.findOneAndUpdate(
              { googleId: profile.id },
              {
                $set: { // Only update these fields on login
                  googleId: profile.id,
                  email: profile.emails?.[0]?.value,
                  name: profile.displayName,
                  profilePicture: profile.photos?.[0]?.value,
                  lastLogin: new Date(),
                  // Explicitly DO NOT $set isAdminForTags here for existing users
                },
                $setOnInsert: { // Set these only if a new user is created
                  joinDate: new Date(),
                  status: 'pending_verification',
                  isAdminForTags: [], // Default for new users
                  // ... other fields for new users
                }
              },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            ```

3.  **Stale JWT / Incorrect JWT Payload Generation (`server.js`):
    *   **Problem:** The JWT might be generated with an outdated or incorrect `isAdminForTags` value.
    *   **Solution (`server.js` - Google OAuth Callback, before JWT signing):
        *   After retrieving or creating the user (e.g., `existingUser` from `findOneAndUpdate`), explicitly re-fetch the user document from the database, specifically selecting `isAdminForTags`, before creating the JWT payload. This ensures the freshest data is used for the token.
        *   Example modification:
            ```javascript
            // ... inside Google OAuth callback, after user is authenticated
            const freshUserFromDB = await User.findById(user._id).select('isAdminForTags phoneVerified email ...otherNeededFields').lean();
            if (!freshUserFromDB) { /* handle error */ }

            const payload = {
              id: user._id,
              // ... other user details
              isAdminForTags: freshUserFromDB.isAdminForTags || [], // Use the fresh data
              phoneVerified: freshUserFromDB.phoneVerified,
            };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
            // ... redirect with token
            ```

4.  **`authenticateToken` Middleware (`middleware/auth.js`):
    *   **Problem:** The `authenticateToken` middleware might not be correctly extracting `isAdminForTags` from the decoded JWT payload and adding it to the `req.user` object.
    *   **Solution:** Ensure `req.user` is populated with `isAdminForTags` from the token:
        ```javascript
        // ... inside authenticateToken middleware, after jwt.verify
        req.user = {
            id: decoded.id,
            // ... other decoded fields
            isAdminForTags: decoded.isAdminForTags || [],
            phoneVerified: decoded.phoneVerified || false,
        };
        next();
        ```

**Debugging Steps:**
*   Use `console.log` extensively in `server.js` (Passport strategy, JWT creation, `/api/auth/status`) and `middleware/auth.js` to trace the `isAdminForTags` value at each step.
*   Verify the MongoDB document directly after making changes and before testing login.
*   Check the decoded JWT payload (e.g., using jwt.io or client-side console logs if the token is exposed) to see what `isAdminForTags` value it actually contains.

---

## Future Enhancements
1. User authentication/profiles (for tracking votes/uploads/reports)
2. Advanced search/filtering
3. Direct image upload (requires storage solution)
4. Transaction management
5. Ratings/reviews
6. Notifications

---

## Attribution
Created for the Parts Marketplace application, a community-driven platform for automotive parts information and commerce.

---

## New Feature: Admin Report Notifications in Messaging (June 2024)

### Overview
Admins now receive real-time notifications for new content reports directly within the messaging section. These notifications appear as special conversations (e.g., `admin/bmw`, `admin/honda`) in the conversation list for users with admin privileges.

### How It Works
- **Admin Conversations:** If you are an admin (your user has `isAdminForTags`), you will see one or more special conversations in your messaging panel, one for each group/tag you moderate (e.g., `admin/bmw`).
- **Notification Content:** Each admin conversation shows the number of new, open reports for that group/tag. These are visually distinct with a shield icon and a red highlight.
- **Actionable:** Clicking on an admin report conversation displays a summary and a "View Reports" button.
- **Direct Access:** The "Admin Panel" button is always available at the top of the conversation list for admins. Clicking it, or the "View Reports" button, takes you to the `/admin` panel, optionally filtered by the relevant tag.
- **Security:** Only users with admin privileges (i.e., `isAdminForTags` is non-empty) see these notifications and links.

### Example UI
```
Conversations
--------------------------------------------------
(User)           Re: Content
admin/bmw  🛡️   Re: 2 new reported content
(User)           Re: Content
admin/honda 🛡️   Re: 1 new reported content
--------------------------------------------------
```

### Technical Details
- The backend injects virtual admin report conversations into the `/api/messages/conversations` endpoint for admins.
- The frontend detects these and renders them with a shield icon and special styling.
- Clicking an admin report conversation or the "Admin Panel" button navigates to `/admin?tag=GROUP`, filtering the admin panel to that group/tag's reports.

---

# (rest of documentation follows) 