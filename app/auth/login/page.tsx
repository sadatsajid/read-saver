'use client';

import { Suspense, useState } from 'react';
import type { ComponentType, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Lock,
  Mail,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/platform/auth/supabase/client';

type AuthMode = 'login' | 'signup';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();

  const getInitialError = () => {
    const urlError = searchParams.get('error');
    if (!urlError) return '';

    if (
      urlError === 'verification_link_expired' ||
      urlError.includes('expired')
    ) {
      return 'Your verification link has expired. Please sign up again or request a new verification email.';
    }

    if (urlError.includes('invalid') || urlError.includes('expired')) {
      return 'The verification link is invalid or has expired. Please try signing up again.';
    }

    return decodeURIComponent(urlError);
  };

  const [error, setError] = useState(getInitialError);

  const resetFeedback = () => {
    setError('');
    setMessage('');
  };

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
    } else {
      setMessage('Signed in. Opening your library...');
      router.push('/dashboard');
      router.refresh();
    }

    setLoading(false);
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
    } else if (data?.user?.identities?.length === 0) {
      setError('An account with this email already exists. Please sign in instead.');
    } else if (data?.user && !data.session) {
      setMessage('Account created. Check your email to verify it before signing in.');
      setAuthMode('login');
      setPassword('');
    } else {
      setMessage('Account created. Opening your library...');
      router.push('/dashboard');
      router.refresh();
    }

    setLoading(false);
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }

    setResending(true);
    resetFeedback();

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
      setMessage('Verification email sent. Check your inbox.');
    }

    setResending(false);
  };

  const isExpiredLinkError =
    error?.toLowerCase().includes('expired') ||
    error?.toLowerCase().includes('verification link');

  const formTitle =
    authMode === 'signup' ? 'Start your library.' : 'Welcome back.';
  const formDescription =
    authMode === 'signup'
      ? 'Save the reads you cannot get to now. ReadSaver turns them into crisp, searchable insight.'
      : 'Pick up where you left off with every article, summary, and answer in one quiet place.';

  return (
    <div className="-m-6 min-h-[calc(100vh-3rem)] bg-background text-foreground">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl grid-cols-1 lg:grid-cols-[1fr_440px]">
        <div className="flex flex-col justify-center px-6 py-16 sm:px-10 lg:px-12">
          <div className="max-w-3xl animate-slide-up">
            <p className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              ReadSaver for busy people
            </p>
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl lg:text-8xl">
              Your reading list.
              <br />
              <span className="text-muted-foreground">Already briefed.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              For the days packed too tight to read everything. Save articles,
              get the substance, then ask follow-ups when one idea needs more
              attention.
            </p>
          </div>

          <div className="mt-14 grid max-w-3xl gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-3">
            <ProductPoint
              icon={Clock3}
              title="Minutes saved"
              description="Turn long reads into focused briefs before your next meeting."
            />
            <ProductPoint
              icon={CheckCircle2}
              title="Nothing lost"
              description="Keep the takeaways, outline, and source-grounded context."
            />
            <ProductPoint
              icon={Lock}
              title="Always yours"
              description="Build a personal article library that remembers for you."
            />
          </div>
        </div>

        <div className="flex items-center px-6 pb-16 sm:px-10 lg:px-12 lg:py-16">
          <div className="w-full rounded-md border bg-card p-6 shadow-[0_24px_70px_rgba(0,0,0,0.08)] sm:p-8">
            <div className="mb-8">
              <div className="mb-6 inline-grid grid-cols-2 rounded-full bg-muted p-1 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    resetFeedback();
                  }}
                  className={`rounded-full px-4 py-2 transition-colors ${
                    authMode === 'login'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  disabled={loading}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    resetFeedback();
                  }}
                  className={`rounded-full px-4 py-2 transition-colors ${
                    authMode === 'signup'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  disabled={loading}
                >
                  Sign up
                </button>
              </div>

              <h2 className="text-3xl font-semibold tracking-tight">
                {formTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {formDescription}
              </p>
            </div>

            <form
              onSubmit={
                authMode === 'signup' ? handleSignUp : handlePasswordLogin
              }
              className="space-y-4"
            >
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-12 rounded-md border-border bg-background px-4 text-base shadow-none"
              />
              <Input
                type="password"
                placeholder={
                  authMode === 'signup'
                    ? 'Create a password'
                    : 'Password'
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-12 rounded-md border-border bg-background px-4 text-base shadow-none"
                minLength={6}
              />

              {authMode === 'signup' && (
                <div className="flex items-start gap-3 rounded-md border border-primary/15 bg-primary/5 p-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs leading-5 text-muted-foreground">
                    We will send a verification link before opening your
                    account.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="h-12 w-full rounded-full text-base font-semibold"
                disabled={loading || !email || !password}
              >
                {loading
                  ? authMode === 'signup'
                    ? 'Creating account...'
                    : 'Signing in...'
                  : authMode === 'signup'
                    ? 'Create account'
                    : 'Continue'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm text-muted-foreground">
              {authMode === 'signup' ? (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    resetFeedback();
                  }}
                  className="font-medium text-primary hover:underline"
                  disabled={loading}
                >
                  Already have an account? Sign in
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    resetFeedback();
                  }}
                  className="font-medium text-primary hover:underline"
                  disabled={loading}
                >
                  New to ReadSaver? Create an account
                </button>
              )}
            </div>

            {message && (
              <Alert className="mt-6 animate-slide-up border-green-200 bg-green-50/60">
                <CheckCircle2 className="h-4 w-4 text-green-700" />
                <AlertDescription className="text-sm text-green-900">
                  {message}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mt-6 animate-slide-up">
                <AlertDescription className="space-y-3 text-sm">
                  <p>{error}</p>
                  {isExpiredLinkError && (
                    <div className="border-destructive/20 border-t pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleResendVerification}
                        disabled={resending || !email}
                        className="w-full"
                      >
                        {resending ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4" />
                            Resend verification email
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
              By continuing, you agree to the{' '}
              <Link href="#" className="text-foreground hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="#" className="text-foreground hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductPoint({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-background p-5">
      <Icon className="mb-5 h-5 w-5 text-primary" />
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="-m-6 min-h-[calc(100vh-3rem)] bg-background" />
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
