import { createClient } from '@/lib/platform/auth/supabase/server';
import { prisma } from '@/lib/platform/db/prisma';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/shared/logger/logger';

/**
 * Sync authenticated user from Supabase Auth to Prisma User table
 * This ensures foreign key relationships work correctly
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Upsert user into Prisma database
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

    logger.info({ userId: user.id }, 'User synced');

    return NextResponse.json({
      message: 'User synced successfully',
      userId: user.id,
    });
  } catch (error) {
    logger.error({ err: error }, 'User sync failed');
    return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
  }
}
