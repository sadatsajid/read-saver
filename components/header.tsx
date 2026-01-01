'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function Header() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const isAuthPage = pathname.startsWith('/auth');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Don't show header on auth pages
  if (isAuthPage) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <h1 className="text-2xl font-bold tracking-tight">
              Article<span className="text-primary">IQ</span>
            </h1>
          </Link>
          <div className="flex items-center gap-3">
            {!isHomePage && (
              <Link href="/">
                <Button variant="ghost" size="sm" className="hover:bg-primary/5">
                  Home
                </Button>
              </Link>
            )}
            {!loading && (
              <>
                {user ? (
                  <>
                    {!pathname.startsWith('/dashboard') && (
                      <Link href="/dashboard">
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-primary/5"
                        >
                          My Articles
                        </Button>
                      </Link>
                    )}
                    <UserNav user={user} />
                  </>
                ) : (
                  <Link href="/auth/login">
                    <Button size="sm" className="hover:bg-primary/90">
                      Sign In
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

