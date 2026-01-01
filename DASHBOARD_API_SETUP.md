# Dashboard API & User-Article Tracking Setup

## ✅ What Was Implemented

### 1. **New Database Table: `UserArticle`**
- Tracks which articles each user has analyzed
- Many-to-many relationship: Users ↔ Articles
- Prevents duplicate tracking (unique constraint on userId + articleId)
- Enables article sharing between users

### 2. **Dashboard API Endpoint**
- `GET /api/dashboard` - Returns user's statistics and articles
- Fetches data from `UserArticle` table
- Calculates real-time stats (articles analyzed, total insights, avg insights)

### 3. **Updated Ingest Route**
- Automatically creates `UserArticle` record when user analyzes an article
- Handles both new articles and existing articles
- Prevents duplicate relationships

### 4. **Updated Delete Logic**
- Removes `UserArticle` relationship (not the article itself)
- Articles can be shared between users
- Article remains in database for other users

### 5. **Client-Side Dashboard**
- Fetches data from API (not server-side queries)
- Real-time loading states
- Auto-refreshes after deletion

---

## 🔧 Database Migration Required

### Step 1: Update Prisma Schema

The schema has been updated. Now run:

```bash
# Generate Prisma client with new schema
pnpm prisma generate

# Create and apply migration
pnpm prisma migrate dev --name add_user_article_tracking
```

Or if you prefer to reset (development only):

```bash
pnpm prisma migrate reset
```

### Step 2: Verify Migration

Check that the `user_articles` table was created:

```sql
-- In Supabase SQL Editor
SELECT * FROM user_articles LIMIT 5;
```

---

## 📊 How It Works

### Article Analysis Flow:

1. **User analyzes article** (authenticated or anonymous)
2. **Article created/retrieved** in `articles` table
3. **If user is authenticated:**
   - `UserArticle` record created linking user to article
   - User can now see it in their dashboard
4. **If user is anonymous:**
   - Article created but no `UserArticle` record
   - Article won't appear in any dashboard

### Dashboard Display:

1. **User visits `/dashboard`**
2. **Client fetches from `/api/dashboard`**
3. **API queries `UserArticle` table** for user's articles
4. **Calculates statistics** from user's articles
5. **Returns formatted data** to dashboard

### Article Deletion:

1. **User clicks delete** on article card
2. **API removes `UserArticle` relationship**
3. **Article remains in database** (for other users)
4. **Dashboard refreshes** to show updated list

---

## 🎯 Benefits

### ✅ Article Sharing
- Multiple users can analyze the same article
- Each user sees it in their own dashboard
- No duplicate article storage

### ✅ Accurate Tracking
- Know exactly which articles each user analyzed
- Track when articles were analyzed (`createdAt` in `UserArticle`)
- Support for future features (favorites, collections, etc.)

### ✅ Performance
- API endpoint for efficient data fetching
- Client-side rendering for better UX
- Real-time updates

### ✅ Scalability
- Articles cached and shared
- User-specific tracking
- Easy to add features (tags, folders, etc.)

---

## 📝 API Response Format

### `GET /api/dashboard`

**Response:**
```json
{
  "stats": {
    "articlesAnalyzed": 5,
    "totalInsights": 42,
    "avgInsightsPerArticle": 8,
    "totalCount": 5
  },
  "articles": [
    {
      "id": "clx...",
      "title": "Article Title",
      "url": "https://example.com/article",
      "insightsCount": 8,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## 🧪 Testing

### Test Article Tracking:

1. **Sign in** to your account
2. **Analyze an article** from homepage
3. **Check dashboard** - should appear in "My Articles"
4. **Check database:**
   ```sql
   SELECT ua.*, a.title 
   FROM user_articles ua
   JOIN articles a ON ua."articleId" = a.id
   WHERE ua."userId" = 'your-user-id';
   ```

### Test Article Sharing:

1. **User A** analyzes article → appears in User A's dashboard
2. **User B** analyzes same article → appears in User B's dashboard
3. **Both users** see the same article in their dashboards
4. **Article exists once** in database (efficient storage)

### Test Deletion:

1. **User A** deletes article from dashboard
2. **Article removed** from User A's dashboard
3. **Article still exists** in database
4. **User B** still sees it in their dashboard

---

## 🔍 Database Schema

### `UserArticle` Table:

```prisma
model UserArticle {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(...)
  articleId String
  article   Article  @relation(...)
  createdAt DateTime @default(now())

  @@unique([userId, articleId])
  @@index([userId, createdAt])
  @@index([articleId])
}
```

**Key Features:**
- `@@unique([userId, articleId])` - Prevents duplicate tracking
- Cascade delete - If user deleted, relationships deleted
- Cascade delete - If article deleted, relationships deleted
- Indexed for fast queries

---

## 🚀 Next Steps (Optional Enhancements)

### Future Features Enabled by This Structure:

1. **Article Collections/Folders**
   - Add `collectionId` to `UserArticle`
   - Organize articles into folders

2. **Article Tags**
   - Create `ArticleTag` table
   - Tag articles for better organization

3. **Article Favorites**
   - Add `isFavorite` boolean to `UserArticle`
   - Star/favorite articles

4. **Article Notes**
   - Add `notes` text field to `UserArticle`
   - Personal notes per article per user

5. **Analytics**
   - Track most analyzed articles
   - User engagement metrics
   - Popular articles across users

---

## ⚠️ Important Notes

### Migration from Old System:

If you have existing articles with `userId` set:

1. **Create UserArticle records** for existing data:
   ```sql
   INSERT INTO user_articles ("userId", "articleId", "createdAt")
   SELECT "userId", id, "createdAt"
   FROM articles
   WHERE "userId" IS NOT NULL
   ON CONFLICT DO NOTHING;
   ```

2. **After migration**, articles will appear in user dashboards

### Anonymous Users:

- Articles analyzed without login won't appear in any dashboard
- Users can sign up later and re-analyze to add to their collection
- Or implement "Save to account" feature later

---

## ✅ Checklist

- [ ] Run `pnpm prisma generate`
- [ ] Run `pnpm prisma migrate dev --name add_user_article_tracking`
- [ ] Verify `user_articles` table exists in database
- [ ] Test analyzing an article (should create UserArticle record)
- [ ] Test dashboard (should show real data from API)
- [ ] Test deleting article (should remove from dashboard only)
- [ ] Test with multiple users (article sharing works)

---

**Status**: ✅ Fully Implemented
**Last Updated**: December 2025

