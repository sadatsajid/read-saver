import { createClient } from '@/lib/platform/auth/supabase/server';
import { prisma } from '@/lib/platform/db/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token = requestUrl.searchParams.get('token');
  const type = requestUrl.searchParams.get('type');
  const error = requestUrl.searchParams.get('error');
  const origin = requestUrl.origin;

  // Handle errors from Supabase
  if (error) {
    console.error('Auth callback error:', error);
    const errorCode = requestUrl.searchParams.get('error_code');
    const errorDescription = requestUrl.searchParams.get('error_description') || error;
    
    // Handle specific error types with better messages
    let userFriendlyError = errorDescription;
    if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
      userFriendlyError = 'verification_link_expired';
    } else if (error === 'access_denied') {
      userFriendlyError = errorDescription || 'verification_failed';
    }
    
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(userFriendlyError)}`
    );
  }

  const supabase = await createClient();
  let user = null;

  // Handle email verification token (direct from email link)
  if (token && type) {
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type as 'signup' | 'email' | 'recovery' | 'invite',
      });

      if (verifyError) {
        console.error('Email verification error:', verifyError);
        return NextResponse.redirect(
          `${origin}/auth/login?error=${encodeURIComponent(verifyError.message)}`
        );
      }

      user = data.user;
    } catch (err) {
      console.error('Token verification error:', err);
      return NextResponse.redirect(
        `${origin}/auth/login?error=verification_failed`
      );
    }
  }
  // Handle PKCE code (from OAuth or Supabase redirects)
  else if (code) {
    try {
      const { data, error: codeError } = await supabase.auth.exchangeCodeForSession(code);

      if (codeError) {
        // Check if it's a PKCE verifier error (common with email verification links opened in different browser)
        if (codeError.message?.includes('pkce_code_verifier') || codeError.code === 'pkce_code_verifier_not_found') {
          console.error('PKCE verifier missing - email verification link opened in different browser');
          return NextResponse.redirect(
            `${origin}/auth/login?error=${encodeURIComponent('Verification link must be opened in the same browser where you signed up. Please try signing up again or check your email for a new verification link.')}`
          );
        }
        
        console.error('PKCE code exchange error:', codeError);
        return NextResponse.redirect(
          `${origin}/auth/login?error=${encodeURIComponent(codeError.message || 'Authentication failed')}`
        );
      }

      user = data.user;
    } catch (err) {
      console.error('Code exchange error:', err);
      return NextResponse.redirect(
        `${origin}/auth/login?error=auth_failed`
      );
    }
  }

  // Sync user to Prisma database
  if (user) {
    try {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          email: user.email!,
        },
        create: {
          id: user.id,
          email: user.email!,
          createdAt: new Date(user.created_at),
        },
      });
    } catch (syncError) {
      console.error('User sync error:', syncError);
      // Don't fail the login if sync fails - user can still use the app
    }
  }

  // Check if there's a redirect parameter
  const redirect = requestUrl.searchParams.get('redirect');
  const redirectPath = redirect && redirect.startsWith('/') ? redirect : '/dashboard';
  
  return NextResponse.redirect(`${origin}${redirectPath}`);
}

