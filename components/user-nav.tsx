'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserNavProps {
  user: {
    email: string | null;
    id: string;
  };
}

export function UserNav({ user }: UserNavProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      // Sign out on the client side first
      // This will trigger the onAuthStateChange listener in header.tsx
      await supabase.auth.signOut();

      // Also call the server endpoint to clear server-side session
      await fetch('/api/auth/logout', {
        method: 'POST',
      });

      // Redirect to home page after logout
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get initials from email
  const initials = user.email
    ? user.email
        .split('@')[0]
        .split('.')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="relative h-9 w-9 rounded-full hover:bg-primary/5"
          disabled={isLoading}
        >
          <div className="flex items-center justify-center w-full h-full text-sm font-semibold">
            {initials}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">My Account</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => router.push('/dashboard')}
        >
          <FileText className="mr-2 h-4 w-4" />
          <span>My Articles</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer opacity-50"
          disabled
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
          <span className="ml-auto text-xs text-muted-foreground">Soon</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={handleLogout}
          disabled={isLoading}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

