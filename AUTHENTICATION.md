# Authentication Guide

## 🔐 Authentication Method

ArticleIQ uses **password-based authentication** with optional email verification:

### **Password Authentication**
- Traditional email + password login
- Sign up once, log in instantly
- Email verification link sent on signup (optional)
- Session persists until logout
- Fast and secure

### **Email Verification**
- Magic link sent to verify email on signup
- One-time verification (not required for each login)
- Can be enabled/disabled in Supabase settings

---

## 🚀 How to Use

### For Users:

#### **Sign In**
1. Go to `/auth/login`
2. Enter email and password
3. Click "Sign In"
4. You'll be redirected to dashboard

#### **Create Account**
1. Go to `/auth/login`
2. Click "Don't have an account? Sign up"
3. Enter email and create a password (min. 6 characters)
4. Click "Create Account"
5. **If email confirmation is enabled**: Check your email and click the verification link
6. **If email confirmation is disabled**: You'll be automatically logged in and redirected to dashboard

#### **Email Verification (if enabled)**
1. After signup, check your email
2. Click the verification link
3. You'll be redirected to the dashboard
4. You're now fully verified and can log in anytime

---

## ⚙️ Supabase Configuration

### Enable Password Authentication:

1. **Go to Supabase Dashboard**
2. Navigate to: **Authentication → Providers**
3. Find **Email** provider
4. Configure settings:

```
Enable Email Provider: ✅ ON
Confirm email: ⬜ OFF (for instant signup)
  OR
Confirm email: ✅ ON (require email verification)
```

**Recommended Settings:**
- **Development**: Confirm email OFF (faster testing)
- **Production**: Confirm email ON (more secure)

4. **Save Settings**

---

### Session Duration (Optional):

To keep users logged in longer:

1. Go to: **Authentication → Settings**
2. Find **JWT Expiry**
3. Change from `3600` (1 hour) to:
   - `86400` = 1 day
   - `604800` = 7 days
   - `2592000` = 30 days
4. Save

**Note**: The middleware automatically refreshes sessions, so users rarely need to re-login even with shorter JWT expiry.

---

## 🎨 UI Features

### Clean Interface
- Single, focused authentication page
- Toggle between sign in and sign up
- "Don't have an account?" / "Already have an account?" links
- Automatic navigation between states
- Email verification notice on signup form

### Form Validation
- Email format validation
- Password minimum 6 characters
- Disabled state during submission
- Loading states with text feedback

### Feedback Messages
- Success: Green alert with checkmark
- Error: Red alert with error message
- Clear, actionable messages

---

## 🔒 Security Features

### Password Authentication:
- Passwords hashed with bcrypt (Supabase default)
- Minimum password length enforced (6 characters)
- HTTPS required in production
- Session cookies are httpOnly and secure

### Email Verification:
- One-time verification link
- Time-limited (24 hour expiry)
- Signed by Supabase (tamper-proof)
- Only required once on signup

### General Security:
- CSRF protection (Next.js built-in)
- Rate limiting (Supabase default)
- Row Level Security (RLS) on database
- Session refresh via middleware
- XSS protection (React escaping)

---

## 📊 User Flow Diagrams

### Login Flow:
```
User → Login Page → Enter Email + Password
  ↓
Supabase Auth → Verify Credentials
  ↓
Success → Create Session → Redirect to Dashboard
  ↓
User stays logged in (session persists)
```

### Sign Up Flow (Email Confirmation Disabled):
```
User → Login Page → Click "Sign up"
  ↓
Enter Email + Password → Create Account
  ↓
Supabase Auth → Create User
  ↓
Auto-login → Redirect to Dashboard
  ↓
User Sync → Create Prisma User Record
```

### Sign Up Flow (Email Confirmation Enabled):
```
User → Login Page → Click "Sign up"
  ↓
Enter Email + Password → Create Account
  ↓
Supabase Auth → Create User → Send Verification Email
  ↓
User → Check Email → Click Verification Link
  ↓
Auth Callback → Create Session → Redirect to Dashboard
  ↓
User Sync → Create Prisma User Record
```

---

## 🐛 Troubleshooting

### Issue: "Invalid login credentials"
**Cause**: Wrong email or password
**Solution**: 
- Check email spelling
- Try "Magic Link" tab instead
- Or create a new account

### Issue: "Email not confirmed"
**Cause**: Supabase email confirmation is enabled
**Solution**: 
- Check your email for confirmation link
- Click the link before logging in
- Or disable email confirmation in Supabase settings

### Issue: Verification link expired
**Cause**: Links expire after 24 hours
**Solution**: 
- Sign up again to receive a new verification link
- Or disable email confirmation in Supabase settings

### Issue: Can't receive verification email
**Cause**: Email provider blocking, spam folder
**Solution**:
- Check spam/junk folder
- Whitelist `noreply@supabase.io`
- Disable email confirmation in Supabase settings (for development)
- In development, check Supabase logs for email content

### Issue: "User already registered"
**Cause**: Account exists with that email
**Solution**:
- Use "Already have an account? Sign in" link
- Or reset password (if implemented)

---

## 🔄 Migration Notes

If you were using magic link auth before:

1. **Password auth is now the primary method**
2. **Magic links only used for email verification** (optional)
3. **New users must create a password on signup**

No database migrations needed! ✅

---

## 🎯 Best Practices

### For Users:
1. **Use password auth** for faster login
2. **Use strong passwords** (8+ characters, mix of types)
3. **Use magic link** on shared/public computers
4. **Stay logged in** is safe on your personal device

### For Developers:
1. **Keep JWT expiry reasonable** (7 days recommended)
2. **Enable email confirmation** in production
3. **Monitor failed login attempts** in Supabase
4. **Add password reset** flow (future enhancement)
5. **Consider OAuth** (Google/GitHub) for even better UX

---

## 📈 Future Enhancements

Potential additions:
- [ ] Password reset flow
- [ ] OAuth providers (Google, GitHub)
- [ ] Two-factor authentication (2FA)
- [ ] Remember this device
- [ ] Session management (view/revoke devices)
- [ ] Account deletion
- [ ] Email change workflow

---

## 🆘 Support

- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- Next.js Auth Patterns: https://nextjs.org/docs/authentication
- Supabase Discord: https://discord.supabase.com

---

**Current Status**: ✅ Fully Implemented
**Last Updated**: December 2025

