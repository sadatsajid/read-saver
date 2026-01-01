'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, CheckCircle2, Sparkles, Mail, RefreshCw } from 'lucide-react';
import Link from 'next/link';

type AuthMode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();

  // Initialize error from URL params
  const getInitialError = () => {
    const urlError = searchParams.get('error');
    if (!urlError) return '';
    
    if (urlError === 'verification_link_expired' || urlError.includes('expired')) {
      return 'Your verification link has expired. Please sign up again or request a new verification email.';
    } else if (urlError.includes('invalid') || urlError.includes('expired')) {
      return 'The verification link is invalid or has expired. Please try signing up again.';
    } else {
      return decodeURIComponent(urlError);
    }
  };

  const [error, setError] = useState(getInitialError);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
    } else {
      setMessage('Successfully logged in! Redirecting...');
      router.push('/dashboard');
      router.refresh();
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
    } else {
      // Check if email confirmation is required
      if (data?.user?.identities?.length === 0) {
        // User already exists
        setError('An account with this email already exists. Please sign in instead.');
      } else if (data?.user && !data.session) {
        // Email confirmation required
        setMessage('Account created! Please check your email to verify your account before signing in.');
        setAuthMode('login');
        setPassword('');
      } else {
        // Auto-confirmed and logged in
        setMessage('Account created! Redirecting to dashboard...');
        router.push('/dashboard');
        router.refresh();
      }
    }

    setLoading(false);
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    setResending(true);
    setError('');
    setMessage('');

    // Resend verification email
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (resendError) {
      setError(resendError.message);
    } else {
      setMessage('Verification email sent! Please check your inbox.');
    }

    setResending(false);
  };

  const isExpiredLinkError = error?.toLowerCase().includes('expired') || 
                            error?.toLowerCase().includes('verification link');

  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 animate-slide-up">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            {authMode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-muted-foreground text-base">
            {authMode === 'signup'
              ? 'Create your account to start analyzing articles'
              : 'Sign in to your ArticleIQ account'}
          </p>
        </div>

        {/* Sign In Card */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-xl">
                {authMode === 'signup' ? 'Create Account' : 'Sign In'}
              </CardTitle>
            </div>
            <CardDescription className="text-sm pt-1">
              {authMode === 'signup'
                ? 'Enter your details to create a new account'
                : 'Enter your email and password to continue'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Password Login Form */}
            {authMode === 'login' && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 text-base border-2 focus:border-primary/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 text-base border-2 focus:border-primary/50 transition-colors"
                    minLength={6}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading || !email || !password}
                >
                  {loading ? (
                    <span>Signing in...</span>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Sign In
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setError('');
                      setMessage('');
                    }}
                    className="text-sm text-primary hover:underline"
                    disabled={loading}
                  >
                    Don&apos;t have an account? Sign up
                  </button>
                </div>
              </form>
            )}

            {/* Sign Up Form */}
            {authMode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 text-base border-2 focus:border-primary/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Create a password (min. 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 text-base border-2 focus:border-primary/50 transition-colors"
                    minLength={6}
                  />
                </div>
                
                <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    You&apos;ll receive a verification email to confirm your account
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading || !email || !password}
                >
                  {loading ? (
                    <span>Creating account...</span>
                  ) : (
                    'Create Account'
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setError('');
                      setMessage('');
                    }}
                    className="text-sm text-primary hover:underline"
                    disabled={loading}
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </form>
            )}

            {/* Messages */}
            {message && (
              <Alert className="border-green-200 bg-green-50/50 dark:bg-green-900/20 dark:border-green-800 animate-slide-up">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-sm text-green-800 dark:text-green-200">
                  {message}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="animate-slide-up">
                <AlertDescription className="text-sm space-y-2">
                  <p>{error}</p>
                  {isExpiredLinkError && (
                    <div className="mt-3 pt-3 border-t border-destructive/20">
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleResendVerification}
                          disabled={resending || !email}
                        >
                          {resending ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              Resend Verification Email
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Or{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('signup');
                            setError('');
                            setMessage('');
                          }}
                          className="text-primary hover:underline"
                        >
                          sign up again
                        </button>
                      </p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-center text-muted-foreground leading-relaxed">
                By continuing, you agree to our{' '}
                <Link href="#" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="#" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            New to ArticleIQ?{' '}
            <Link href="/" className="text-primary font-medium hover:underline">
              Explore features
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

