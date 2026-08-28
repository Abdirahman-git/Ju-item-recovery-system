import { NextResponse } from 'next/server';
import { fetchPublicLiveItems } from '@/lib/publicItems';

export const revalidate = 30;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 48, 1), 100);

  try {
    const items = await fetchPublicLiveItems({ limit });
    return NextResponse.json(items, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('GET /api/public/items failed:', error);
    return NextResponse.json([], { status: 200 });
  }
}
