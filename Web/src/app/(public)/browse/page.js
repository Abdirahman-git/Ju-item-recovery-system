'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Package, Search } from 'lucide-react';
import ItemCard, { ItemCardSkeleton } from '@/components/public/ItemCard';
import SectionHeading from '@/components/public/SectionHeading';
import { fetchPublicLiveItems, toPublicItemCard } from '@/lib/publicItems';
import { PUBLIC_CATEGORIES, collectCategoriesFromItems, mergeCategoryLists } from '@/lib/categories';

const PAGE_SIZE = 12;
const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'lost', label: 'Lost' },
  { id: 'found', label: 'Found' },
];

export default function BrowsePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [category, setCategory] = useState('all');
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 220);
    return () => window.clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const live = await fetchPublicLiveItems();
      setItems(live.map(toPublicItemCard).filter(Boolean));
    } catch (err) {
      setError(err?.message || 'Could not load campus items.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    const fromItems = collectCategoriesFromItems(items, 'category');
    return mergeCategoryLists(PUBLIC_CATEGORIES, fromItems);
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== 'all' && item.itemType !== typeFilter) return false;
      if (category !== 'all' && item.category !== category) return false;
      if (!debouncedQuery) return true;
      const hay = `${item.title} ${item.category} ${item.location} ${item.description}`.toLowerCase();
      return hay.includes(debouncedQuery);
    });
  }, [items, typeFilter, category, debouncedQuery]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [typeFilter, category, debouncedQuery]);

  const shown = filtered.slice(0, visible);
  const canLoadMore = visible < filtered.length;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
      <SectionHeading
        align="left"
        eyebrow="Browse"
        title="Campus lost & found board"
        subtitle="Search approved LIVE listings from the same database as the JU LOFO mobile app."
        className="!mx-0 max-w-3xl"
      />

      <div className="mt-8 space-y-4">
        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, category, or place…"
            className="w-full cursor-text rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#1A56DB] focus:ring-4 focus:ring-[#1A56DB]/15"
          />
        </label>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Type filter">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setTypeFilter(f.id)}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${
                typeFilter === f.id
                  ? 'bg-[#1A56DB] text-white shadow-md shadow-blue-500/25'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-[#1A56DB]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Category filter">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              category === 'all'
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            All categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                category === cat
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ItemCardSkeleton key={i} />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-12 text-center">
            <p className="text-base font-bold text-red-700">Something went wrong</p>
            <p className="mt-2 text-sm font-medium text-red-600/80">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-5 cursor-pointer rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        ) : null}

        {!loading && !error && filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Package size={28} />
            </div>
            <p className="mt-4 text-base font-bold text-slate-700">No matching items</p>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Try another search or clear filters. Only approved LIVE items appear here.
            </p>
          </div>
        ) : null}

        {!loading && !error && shown.length > 0 ? (
          <>
            <p className="mb-4 text-sm font-semibold text-slate-500">
              Showing <span className="tabular-nums text-slate-800">{shown.length}</span> of{' '}
              <span className="tabular-nums text-slate-800">{filtered.length}</span> items
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((item, i) => (
                <ItemCard key={item.slug} item={item} index={i} />
              ))}
            </div>
            {canLoadMore ? (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="cursor-pointer rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-[#1A56DB] shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 active:scale-[0.98]"
                >
                  Load more
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
