# Prisma Schema Migration: Fix User ID

## 🔴 Issue

The `User` model was using `@default(cuid())` but Supabase Auth provides UUIDs. This causes:
- Trigger failures when trying to sync users
- Signup errors: "Database error saving new user"
- ID mismatch between Supabase Auth and Prisma

## ✅ Fix Applied

Changed the User model from:
```prisma
id String @id @default(cuid())
```

To:
```prisma
id String @id // Uses Supabase Auth UUID, no default
```

## 📝 Migration Steps

### Option 1: Reset and Recreate (Development - Recommended)

If you're in development and can lose data:

```bash
# Reset the database
pnpm prisma migrate reset

# This will:
# 1. Drop all tables
# 2. Recreate them with new schema
# 3. Run seed if you have one
```

### Option 2: Create Migration (Production - Safe)

If you have existing data:

```bash
# Create a new migration
pnpm prisma migrate dev --name fix_user_id_remove_default

# This will:
# 1. Create a migration file
# 2. Apply it to your database
# 3. Regenerate Prisma Client
```

### Option 3: Manual SQL (If migrations fail)

Run this in Supabase SQL Editor:

```sql
-- Remove the default constraint from users.id
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;

-- Verify the change
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'id';
```

Then regenerate Prisma Client:
```bash
pnpm prisma generate
```

## 🧪 After Migration

1. **Test Signup**:
   - Create a new account
   - Should work without errors

2. **Verify User Sync**:
   - Check `users` table in Supabase
   - User should have UUID from Supabase Auth

3. **Test Login**:
   - Sign in with the new account
   - Should redirect to dashboard

## ⚠️ Important Notes

- **Existing Users**: If you have users created with CUIDs, they won't match Supabase Auth UUIDs
- **Solution**: Delete old users and have them sign up again, OR manually update user IDs to match Supabase Auth UUIDs

## 🔍 Check Current State

To see what IDs your users currently have:

```sql
-- Check users table
SELECT id, email, "createdAt" FROM users LIMIT 5;

-- Check auth.users (Supabase Auth)
SELECT id, email, created_at FROM auth.users LIMIT 5;

-- Compare (should match if synced correctly)
SELECT 
  u.id as prisma_id,
  u.email,
  a.id as auth_id,
  CASE WHEN u.id = a.id::text THEN 'MATCH' ELSE 'MISMATCH' END as status
FROM users u
LEFT JOIN auth.users a ON u.email = a.email;
```

