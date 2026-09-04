'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Package, Search, X } from 'lucide-react';
import ItemCard, { ItemCardSkeleton } from '@/components/public/ItemCard';
import RevealOnScroll from '@/components/public/RevealOnScroll';
import { getCategoryIcon } from '@/components/admin/categoryOptions';
import { PUBLIC_CATEGORIES, collectCategoriesFromItems, mergeCategoryLists } from '@/lib/categories';
import { toPublicItemCard } from '@/lib/publicItems';

const PAGE_SIZE = 12;

export default function BrowsePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
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
      const response = await fetch('/api/public/items?limit=48', { cache: 'no-store' });
      const live = response.ok ? await response.json() : [];
      setItems((Array.isArray(live) ? live : []).map(toPublicItemCard).filter(Boolean));
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

  const categoryCounts = useMemo(() => {
    const counts = { all: items.length };
    for (const name of categories) {
      counts[name] = items.filter((item) => item.category === name).length;
    }
    return counts;
  }, [items, categories]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (!debouncedQuery) return true;
      const hay = `${item.title} ${item.category} ${item.location} ${item.description}`.toLowerCase();
      return hay.includes(debouncedQuery);
    });
  }, [items, category, debouncedQuery]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [category, debouncedQuery]);

  const shown = filtered.slice(0, visible);
  const canLoadMore = visible < filtered.length;
  const hasActiveFilters = category !== 'all' || Boolean(debouncedQuery);

  const clearFilters = () => {
    setQuery('');
    setCategory('all');
  };

  const categoryChips = useMemo(
    () => [
      { value: 'all', label: 'All', icon: LayoutGrid },
      ...categories.map((name) => ({
        value: name,
        label: name,
        icon: getCategoryIcon(name),
      })),
    ],
    [categories]
  );

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
        <div className="public-browse-toolbar mt-5 overflow-visible rounded-[22px] border border-slate-200/80 bg-white/90 p-3 shadow-[0_1px_1px_rgba(15,23,42,0.03),0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:mt-8 sm:rounded-[24px] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-600 ring-1 ring-red-100">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
              Lost board
            </span>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="public-press inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-[#1A56DB] transition-opacity hover:opacity-80"
              >
                <X size={12} />
                Clear filters
              </button>
            ) : null}
          </div>

          <label className="relative mt-3 block sm:mt-4">
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
                className="w-full cursor-text rounded-2xl border border-slate-200 bg-slate-50/80 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-slate-400 focus:border-[#1A56DB] focus:bg-white focus:ring-4 focus:ring-[#1A56DB]/12"
              />
            </span>
          </label>

          <div className="mt-4 sm:mt-5">
            <span className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Category
            </span>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Category filter"
            >
              {categoryChips.map((chip, index) => {
                const Icon = chip.icon || LayoutGrid;
                const active = category === chip.value;
                const count = categoryCounts[chip.value] ?? 0;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setCategory(chip.value)}
                    style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
                    className={`public-browse-cat-chip public-press inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-2xl px-3.5 text-sm font-bold transition-[background-color,color,box-shadow,transform,border-color] duration-200 ${
                      active
                        ? 'bg-[#1A56DB] text-white shadow-[0_8px_20px_rgba(26,86,219,0.28)] ring-1 ring-[#1A56DB]/30'
                        : 'border border-slate-200/90 bg-slate-50/90 text-slate-600 hover:border-blue-200 hover:bg-white hover:text-[#1A56DB] hover:shadow-[0_6px_16px_rgba(15,23,42,0.06)]'
                    }`}
                  >
                    <Icon
                      size={15}
                      strokeWidth={2.25}
                      className={active ? 'text-white/95' : 'text-slate-400'}
                    />
                    <span>{chip.label}</span>
                    <span
                      className={`tabular-nums rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                        active ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
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
                {category !== 'all' ? (
                  <span className="text-slate-400"> · {category}</span>
                ) : null}
              </p>
            </div>
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
