'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  FolderOpen,
  ArrowRight,
  Clock,
  Loader2,
  X,
} from 'lucide-react';
import { useSession } from '@/context/SessionProvider';
import { fetchPortalAllItems } from '@/lib/portal';
import ItemCard from '@/components/portal/ItemCard';
import ItemDetailModal from '@/components/portal/ItemDetailModal';

export default function PortalDashboard() {
  const router = useRouter();
  const { session, ready } = useSession();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fullName = mounted && ready && session
    ? session?.userName || session?.name || 'User'
    : 'User';
  const firstName = fullName.split(' ')[0] || 'User';

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      try {
        const data = await fetchPortalAllItems();
        setItems(data);
      } catch (err) {
        console.error('Error loading dashboard items:', err);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const name = String(item.itemName || '').toLowerCase();
      const desc = String(item.description || '').toLowerCase();
      const loc = String(item.location || '').toLowerCase();
      const cat = String(item.category || '').toLowerCase();

      const matchesSearch =
        !q ||
        name.includes(q) ||
        desc.includes(q) ||
        loc.includes(q) ||
        cat.includes(q);

      const matchesCategory =
        categoryFilter === 'all' ||
        String(item.category || '').toLowerCase() === categoryFilter.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, categoryFilter]);

  const hasActiveFilters = Boolean(searchQuery.trim()) || categoryFilter !== 'all';

  const handleClaimClick = (item) => {
    router.push(`/portal/browse?claimItem=${item.id}&type=${item.type}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <p className="text-lg font-bold text-slate-800 sm:text-xl">
          Hello, <span className="text-[#1A56DB]">{firstName}</span> 👋
        </p>
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">
          Welcome to <span className="text-[#1A56DB]">JU LOFO</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/portal/lost"
          className="group flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 transition hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A56DB] text-white shadow-md shadow-blue-500/30">
            <Search size={22} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-blue-950">Report Lost</h3>
            <p className="text-xs font-medium text-blue-700/80">I lost an item on campus</p>
          </div>
          <ArrowRight size={18} className="text-blue-500 transition group-hover:translate-x-1" />
        </Link>

        <Link
          href="/portal/my-items"
          className="group flex items-center gap-4 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 transition hover:border-violet-300 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-500/30">
            <FolderOpen size={22} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-violet-950">My Items</h3>
            <p className="text-xs font-medium text-violet-700/80">Track your reported items</p>
          </div>
          <ArrowRight size={18} className="text-violet-500 transition group-hover:translate-x-1" />
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Recent Activity</h2>
            <p className="text-xs font-medium text-slate-500">
              Search by name or filter by category
            </p>
          </div>
          <Link
            href="/portal/browse"
            className="flex flex-shrink-0 items-center gap-1 text-xs font-black text-[#1A56DB] hover:underline"
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="mt-4 space-y-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:p-4">
          <div className="relative">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by item name…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-10 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[#1A56DB] focus:bg-white focus:ring-2 focus:ring-blue-100"
              aria-label="Search items by name"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                categoryFilter === 'all'
                  ? 'bg-[#1A56DB] text-white shadow-sm shadow-blue-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  categoryFilter === cat
                    ? 'bg-[#1A56DB] text-white shadow-sm shadow-blue-500/25'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>
            {loading ? 'Loading…' : `Showing ${filteredItems.length} item${filteredItems.length === 1 ? '' : 's'}`}
          </span>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
              }}
              className="font-bold text-[#1A56DB] hover:underline"
            >
              Reset filters
            </button>
          ) : null}
        </div>

        <div className="mt-3">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 size={28} className="animate-spin text-[#1A56DB]" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <Clock size={36} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm font-bold text-slate-700">
                {hasActiveFilters ? 'No matching items found' : 'No recent items found.'}
              </p>
              {hasActiveFilters ? (
                <p className="mt-1 text-xs text-slate-500">
                  Try another name or pick a different category.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => (
                <ItemCard
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onClick={(it) => setSelectedItem(it)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedItem ? (
        <ItemDetailModal
          item={selectedItem}
          currentUserEmail={session?.email}
          onClose={() => setSelectedItem(null)}
          onClaimClick={handleClaimClick}
        />
      ) : null}
    </div>
  );
}
