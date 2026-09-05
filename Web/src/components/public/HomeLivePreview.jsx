'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ItemCard, { ItemCardSkeleton } from '@/components/public/ItemCard';
import RevealOnScroll from '@/components/public/RevealOnScroll';
import { toPublicItemCard } from '@/lib/publicItems';

export default function HomeLivePreview() {
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch('/api/public/items?limit=6', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const live = response.ok ? await response.json() : [];
        if (cancelled) return;
        setPreview((Array.isArray(live) ? live : []).map(toPublicItemCard).filter(Boolean));
      } catch {
        if (!cancelled) setPreview([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  if (loading) {
    return (
      <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <ItemCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (preview.length === 0) {
    return (
      <RevealOnScroll delay={80} className="mt-10">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-14 text-center">
          <p className="text-base font-bold text-slate-700">No live items yet</p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            When campus reports are approved, they will show up here automatically.
          </p>
          <Link
            href="/how-it-works"
            className="mt-5 inline-flex cursor-pointer items-center gap-1 text-sm font-bold text-[#1A56DB] hover:underline"
          >
            How approval works
            <ArrowRight size={14} />
          </Link>
        </div>
      </RevealOnScroll>
    );
  }

  return (
    <>
      <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {preview.map((item, i) => (
          <ItemCard key={item.slug} item={item} index={i} />
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link
          href="/browse"
          className="inline-flex cursor-pointer items-center gap-2 text-sm font-black text-[#1A56DB] transition hover:gap-3"
        >
          View all items
          <ArrowRight size={15} />
        </Link>
      </div>
    </>
  );
}
