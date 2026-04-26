import { createClient } from '@/lib/platform/auth/supabase/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/shared/logger/logger';

export async function POST() {
  try {
    const supabase = await createClient();

    // Sign out the user
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error({ err: error }, 'Logout failed');
      return NextResponse.json(
        { error: 'Failed to logout', message: error.message },
        { status: 500 }
      );
    }

    // Return success response
    logger.info('User logged out');

    return NextResponse.json(
      { message: 'Successfully logged out' },
      { status: 200 }
    );
  } catch (error) {
    logger.error({ err: error }, 'Unexpected logout failure');
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
