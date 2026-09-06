import { NextResponse } from 'next/server';
import { fetchPublicLiveItems } from '@/lib/publicItems';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 48, 1), 100);

  try {
    const items = await fetchPublicLiveItems({ limit, skipCache: true });
    return NextResponse.json(items, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('GET /api/public/items failed:', error);
    return NextResponse.json([], { status: 200 });
  }
}
