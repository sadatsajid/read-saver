# Authentication Setup Guide

## ✅ What Was Implemented

### Tier 1: Critical Fixes (COMPLETED)
1. **✅ Middleware for Session Management**
   - Created `middleware.ts` for automatic session refresh
   - Protected routes: `/dashboard/*`, `/api/articles/*`
   - Auto-redirects to login when needed
   - Prevents logged-in users from accessing login page

2. **✅ User Sync System**
   - Updates `app/auth/callback/route.ts` to sync Supabase Auth users to Prisma
   - Creates/updates user record in Prisma on every login
   - API endpoint: `POST /api/auth/sync` for manual sync

3. **✅ Logout Functionality**
   - API endpoint: `POST /api/auth/logout`
   - UserNav dropdown with logout button
   - Clears session and redirects to home

### Tier 2: MVP Features (COMPLETED)
4. **✅ Auth-Aware Header**
   - `components/user-nav.tsx` - User dropdown menu
   - Shows user initials, email, and menu items
   - Conditional rendering: "Sign In" vs user avatar
   - Hides header on auth pages

5. **✅ Article Ownership Enforcement**
   - Article pages now check ownership
   - Only owners can view their articles
   - Redirects to dashboard if unauthorized
   - Legacy articles (without userId) remain public

6. **✅ DELETE Article API**
   - Endpoint: `DELETE /api/articles/[id]`
   - Ownership verification required
   - Cascades to delete chunks automatically
   - Returns proper error codes (401, 403, 404)

7. **✅ Dashboard Delete Buttons**
   - Delete button on each article card
   - Confirmation dialog with article title
   - Loading states during deletion
   - Auto-refreshes dashboard after delete

---

## 🔧 Setup Required

### 1. Install New Dependencies

Run this command to install the new Radix UI components:

```bash
pnpm install
```

**New packages added:**
- `@radix-ui/react-dropdown-menu` (user menu)
- `@radix-ui/react-alert-dialog` (delete confirmation)

---

### 2. Database Changes (Optional but Recommended)

#### Option A: Supabase Trigger (Recommended)

Run this in Supabase SQL Editor to auto-sync users:

```sql
-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, "createdAt")
  VALUES (NEW.id, NEW.email, NEW.created_at)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Sync existing users (run once)
INSERT INTO public.users (id, email, "createdAt")
SELECT id, email, created_at
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email;
```

**Why?** This ensures every Supabase Auth user automatically gets a record in your Prisma `users` table, fixing foreign key issues.

#### Option B: Manual Sync

If you don't want database triggers, the callback route will handle syncing on each login.

---

### 3. Update Existing Articles (Optional)

If you have existing articles without `userId`, run this to assign them to the correct user:

```sql
-- Update articles to belong to the user who created them
-- (Only works if you know the user's email or can infer it)

-- Example: Assign all articles to a specific user
UPDATE articles
SET "userId" = 'your-supabase-user-id'
WHERE "userId" IS NULL;
```

---

## 🧪 Testing Checklist

### Authentication Flow
- [ ] Sign out (if logged in) by clicking user avatar → "Sign out"
- [ ] Visit homepage - should see "Sign In" button
- [ ] Click "Sign In" → redirects to `/auth/login`
- [ ] Enter email → receive magic link
- [ ] Click magic link → redirects to `/dashboard`
- [ ] Check database: user should exist in `users` table

### Header Behavior
- [ ] When logged out: shows "Sign In" button
- [ ] When logged in: shows user avatar with initials
- [ ] Click avatar → dropdown shows email, "My Articles", "Sign out"
- [ ] Header hidden on `/auth/login` page

### Dashboard
- [ ] Shows "My Articles" title with user email
- [ ] Articles display with View, External link, and Delete buttons
- [ ] Click Delete → confirmation dialog appears
- [ ] Confirm delete → article removed, page refreshes

### Article Pages
- [ ] Can only view own articles
- [ ] Attempting to view another user's article → redirects to dashboard
- [ ] Owner sees Delete button in article header
- [ ] Non-owner doesn't see Delete button
- [ ] Delete from article page → redirects to dashboard

### Protected Routes
- [ ] Visit `/dashboard` when logged out → redirects to login
- [ ] After login → redirects back to intended page
- [ ] Visit `/article/[id]` of another user → redirects to dashboard

---

## 📁 New Files Created

```
middleware.ts                                 # Session management
app/api/auth/logout/route.ts                 # Logout endpoint
app/api/auth/sync/route.ts                   # User sync endpoint
app/api/articles/[id]/route.ts               # Article CRUD API
components/user-nav.tsx                       # User dropdown menu
components/delete-article-button.tsx          # Delete confirmation
components/ui/dropdown-menu.tsx               # UI component
components/ui/alert-dialog.tsx                # UI component
AUTH_SETUP.md                                 # This file
```

## 🔄 Modified Files

```
app/auth/callback/route.ts         # Added user sync on login
app/dashboard/page.tsx              # Added delete buttons
app/article/[id]/page.tsx           # Added ownership checks + delete button
components/header.tsx               # Made auth-aware
package.json                        # Added new dependencies
```

---

## 🚀 Next Steps (Optional Enhancements)

### Nice to Have Features:
1. **User Settings Page**
   - Change email preferences
   - Delete account
   - Export articles

2. **Article Sharing**
   - Generate shareable links
   - Toggle public/private
   - Share via social media

3. **Search & Filters**
   - Search articles by title/content
   - Filter by date, tags
   - Sort options

4. **Bulk Operations**
   - Select multiple articles
   - Bulk delete
   - Export multiple articles

5. **Row Level Security (Supabase)**
   - Enable RLS on `articles` and `chunks` tables
   - Extra security layer beyond application logic

---

## 🐛 Troubleshooting

### Issue: "Unauthorized" when accessing dashboard
**Solution**: Check that middleware is working. User session might be expired. Clear cookies and login again.

### Issue: Articles not deleting
**Solution**: Check browser console for errors. Ensure user is the owner. Check database for foreign key constraints.

### Issue: User not found in database
**Solution**: 
1. Check if trigger is created in Supabase
2. Or call `POST /api/auth/sync` manually
3. Or re-login (callback will sync)

### Issue: Can't see other users' articles
**Solution**: This is correct behavior! Articles are now private by default. Only owners can view their articles.

### Issue: Header showing wrong state
**Solution**: Clear browser cache and refresh. The header uses client-side auth state that might be cached.

---

## 🔐 Security Notes

1. **Session Management**: Middleware automatically refreshes sessions, so users stay logged in without interruption.

2. **API Protection**: All sensitive endpoints (`/api/articles/*`) check authentication via middleware.

3. **Ownership Verification**: Every DELETE and protected GET request verifies the user owns the resource.

4. **SQL Injection**: Using Prisma ORM protects against SQL injection.

5. **CSRF**: Next.js has built-in CSRF protection for POST requests.

---

## 📊 Database Schema Changes

No migrations required! The existing schema already supports all features:

- `users` table: Already defined in Prisma schema
- `articles.userId`: Already exists (nullable for legacy articles)
- Cascade delete: Already configured in Prisma schema

---

## ✅ Production Checklist

Before deploying:

- [ ] Run `pnpm install` to install new dependencies
- [ ] Test authentication flow end-to-end
- [ ] Set up Supabase trigger (Option A above)
- [ ] Test article deletion
- [ ] Verify middleware is working on protected routes
- [ ] Check that sessions are being refreshed
- [ ] Test logout functionality
- [ ] Verify email magic links work in production environment

---

Need help? Check the Next.js docs for middleware or Supabase docs for auth triggers.

