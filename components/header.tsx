'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

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
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="hover:bg-primary/5">
                My Articles
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

