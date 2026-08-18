'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Package, Search } from 'lucide-react';
import ItemCard, { ItemCardSkeleton } from '@/components/public/ItemCard';
import CategorySelect from '@/components/public/CategorySelect';
import RevealOnScroll from '@/components/public/RevealOnScroll';
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
  const hasActiveFilters =
    typeFilter !== 'all' || category !== 'all' || Boolean(debouncedQuery);

  const clearFilters = () => {
    setQuery('');
    setTypeFilter('all');
    setCategory('all');
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-16 xl:px-8">
      <RevealOnScroll>
        <div className="max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1A56DB]">
            Browse
          </p>
          <h1 className="mt-2.5 text-balance text-3xl font-extrabold tracking-tight text-[#0F172A] sm:text-4xl sm:leading-tight">
            Campus lost & found board
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-base font-medium leading-relaxed text-slate-600">
            Search approved LIVE listings from the same database as the JU LOFO mobile app.
          </p>
        </div>
      </RevealOnScroll>

      <RevealOnScroll delay={70} className="relative z-20">
        <div className="public-browse-toolbar mt-5 overflow-visible rounded-[18px] border border-slate-200/80 bg-white p-3 shadow-[0_1px_1px_rgba(15,23,42,0.03),0_12px_32px_rgba(15,23,42,0.05)] sm:mt-8 sm:rounded-[20px] sm:p-5">
          <label className="relative block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Search
            </span>
            <span className="relative block">
              <Search
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, category, or place…"
                className="w-full cursor-text rounded-xl border border-slate-200 bg-slate-50/80 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1A56DB] focus:bg-white focus:ring-4 focus:ring-[#1A56DB]/12"
              />
            </span>
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_minmax(14rem,18rem)] sm:items-end">
            <div>
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Type
              </span>
              <div
                className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-50/80 p-1 sm:w-auto"
                role="group"
                aria-label="Type filter"
              >
                {TYPE_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTypeFilter(f.id)}
                    className={`public-press min-h-10 flex-1 cursor-pointer rounded-[10px] px-4 text-sm font-bold transition-[background-color,color,box-shadow,transform] duration-200 sm:flex-none ${
                      typeFilter === f.id
                        ? 'bg-[#1A56DB] text-white shadow-[0_6px_16px_rgba(26,86,219,0.28)]'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-[#1A56DB]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <CategorySelect
              value={category}
              options={categories}
              onChange={setCategory}
            />
          </div>

          {hasActiveFilters ? (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="public-press cursor-pointer text-xs font-bold text-[#1A56DB] transition-opacity hover:opacity-80"
              >
                Clear filters
              </button>
            </div>
          ) : null}
        </div>
      </RevealOnScroll>

      <div className="mt-10">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ItemCardSkeleton key={i} />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-[20px] border border-red-100 bg-red-50 px-6 py-12 text-center">
            <p className="text-base font-bold text-red-700">Something went wrong</p>
            <p className="mt-2 text-sm font-medium text-red-600/80">{error}</p>
            <button
              type="button"
              onClick={load}
              className="public-press mt-5 cursor-pointer rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        ) : null}

        {!loading && !error && filtered.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-slate-200 bg-white/80 px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Package size={28} />
            </div>
            <p className="mt-4 text-base font-bold text-slate-700">No matching items</p>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Try another search or clear filters. Only approved LIVE items appear in this board.
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="public-press mt-5 cursor-pointer rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-[#1A56DB]"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : null}

        {!loading && !error && shown.length > 0 ? (
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-500">
                Showing{' '}
                <span className="tabular-nums text-slate-800">{shown.length}</span> of{' '}
                <span className="tabular-nums text-slate-800">{filtered.length}</span> items
              </p>
            </div>
            {/* ItemCard left unchanged */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {shown.map((item, i) => (
                <ItemCard key={item.slug} item={item} index={i} />
              ))}
            </div>
            {canLoadMore ? (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="public-press cursor-pointer rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-[#1A56DB] shadow-[0_1px_1px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)] transition-[transform,border-color,box-shadow] duration-200 hover:border-blue-200 hover:shadow-[0_12px_28px_rgba(26,86,219,0.12)]"
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
