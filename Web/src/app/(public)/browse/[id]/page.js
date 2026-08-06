import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Package, Smartphone, Tag } from 'lucide-react';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import {
  fetchPublicLiveItemById,
  formatPublicDate,
  parsePublicItemSlug,
  toPublicItemCard,
} from '@/lib/publicItems';

export const revalidate = 15;

export async function generateMetadata({ params }) {
  const { id: slug } = await params;
  const parsed = parsePublicItemSlug(slug);
  if (!parsed) return { title: 'Item' };

  try {
    const raw = await fetchPublicLiveItemById(parsed.itemType, parsed.id);
    const item = toPublicItemCard(raw);
    if (!item) return { title: 'Item not found' };
    return {
      title: item.title,
      description: `${item.itemType === 'found' ? 'Found' : 'Lost'} on campus — ${item.category}`,
    };
  } catch {
    return { title: 'Item' };
  }
}

export default async function PublicItemDetailPage({ params }) {
  const { id: slug } = await params;
  const parsed = parsePublicItemSlug(slug);
  if (!parsed) notFound();

  let item = null;
  try {
    const raw = await fetchPublicLiveItemById(parsed.itemType, parsed.id);
    item = toPublicItemCard(raw);
  } catch {
    item = null;
  }

  if (!item) notFound();

  const isFound = item.itemType === 'found';

  return (
    <section className="mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <Link
        href="/browse"
        className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-[#1A56DB]"
      >
        <ArrowLeft size={16} />
        Back to Browse
      </Link>

      <article className="mt-6 overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)] animate-fade-in">
        <div className="relative aspect-[16/10] bg-slate-100 sm:aspect-[2/1]">
          {item.imageUrl ? (
            <SafeRemoteImage
              src={item.imageUrl}
              alt={item.title}
              fill
              className="object-cover"
              sizes="(max-width: 896px) 100vw, 896px"
              priority
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center ${
                isFound ? 'bg-blue-50 text-[#1A56DB]' : 'bg-amber-50 text-amber-600'
              }`}
            >
              <Package size={56} strokeWidth={1.25} />
            </div>
          )}
          <span
            className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow ${
              isFound ? 'bg-[#1A56DB]' : 'bg-amber-500'
            }`}
          >
            {isFound ? 'Found' : 'Lost'}
          </span>
        </div>

        <div className="p-6 sm:p-8">
          <h1 className="text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">{item.title}</h1>
          <p className="mt-2 text-sm font-semibold text-slate-400">{formatPublicDate(item.reportedAt)}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
              <Tag size={13} />
              {item.category}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1A56DB]">
              <MapPin size={13} />
              {item.location}
            </span>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-400">Description</h2>
            <p className="mt-2 text-base font-medium leading-relaxed text-slate-700">
              {item.description || 'No additional description provided.'}
            </p>
          </div>

          <div className="mt-10 rounded-2xl border border-[#1A56DB]/15 bg-[#1A56DB]/5 p-5 sm:p-6">
            <h3 className="text-lg font-black text-[#0F172A]">Is this yours?</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
              Contact details are hidden on the public site for safety. Open the JU LOFO mobile app to claim this item or follow the verified ownership flow.
            </p>
            <a
              href="#get-app"
              className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#1A56DB] px-5 py-3 text-sm font-black text-white shadow-md shadow-blue-500/25 transition hover:bg-[#1E40AF] active:scale-[0.98]"
            >
              <Smartphone size={16} />
              Open in app to claim / contact
            </a>
          </div>
        </div>
      </article>
    </section>
  );
}
