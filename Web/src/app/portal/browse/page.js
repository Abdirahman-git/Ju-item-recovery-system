'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Tag, Filter, Clock, Loader2, Sparkles } from 'lucide-react';
import { useSession } from '@/context/SessionProvider';
import { fetchPortalAllItems } from '@/lib/portal';
import ItemCard from '@/components/portal/ItemCard';
import ItemDetailModal from '@/components/portal/ItemDetailModal';

export default function PortalBrowsePage() {
  const searchParams = useSearchParams();
  const { session } = useSession();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' or 'LOST'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      try {
        const data = await fetchPortalAllItems();
        setItems(data);

        // If URL has query param to open an item
        const claimId = searchParams.get('claimItem');
        if (claimId) {
          const match = data.find((i) => String(i.id) === String(claimId));
          if (match) setSelectedItem(match);
        }
      } catch (err) {
        console.error('Error loading browse items:', err);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, [searchParams]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !q ||
        item.itemName.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || item.type === statusFilter;
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, searchQuery, statusFilter, categoryFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">All Items</h1>
        <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
          Search campus listings. Everything shows as Lost until Returned — same as the mobile app.
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        {/* Search Bar */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by item name, location, or description…"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-xs font-semibold text-slate-900 outline-none transition focus:border-[#1A56DB] focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              categoryFilter === 'all'
                ? 'bg-[#1A56DB] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                categoryFilter === cat
                  ? 'bg-[#1A56DB] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Counter */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>Showing {filteredItems.length} item(s)</span>
        {(searchQuery || categoryFilter !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
            }}
            className="text-[#1A56DB] hover:underline"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex h-56 items-center justify-center">
          <Loader2 size={32} className="animate-spin text-[#1A56DB]" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Search size={40} className="mx-auto text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-800">No matching items found</h3>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting your search keywords or switching category filters.
          </p>
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

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          currentUserEmail={session?.email}
          onClose={() => setSelectedItem(null)}
          onClaimClick={(it) => {
            // Future phase 3 will trigger Ownership challenge wizard
            alert(`Claim challenge for "${it.itemName}" will open here.`);
          }}
        />
      )}
    </div>
  );
}
