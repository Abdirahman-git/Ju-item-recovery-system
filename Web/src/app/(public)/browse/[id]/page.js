import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Package, Shield, Smartphone, Tag } from 'lucide-react';
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
      description: item.isSecure
        ? `Secure campus hold · ${item.category}`
        : `${item.itemType === 'found' ? 'Found' : 'Lost'} on campus, ${item.category}`,
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
  const isSecure = Boolean(item.isSecure);

  return (
    <section className="mx-auto max-w-2xl px-4 pb-14 pt-8 sm:px-6 sm:pt-10">
      <Link
        href="/browse"
        className="public-press inline-flex min-h-10 cursor-pointer items-center gap-1.5 text-sm font-bold text-slate-600 transition-[transform,color] duration-200 hover:text-[#1A56DB]"
      >
        <ArrowLeft size={15} />
        Back to Browse
      </Link>

      <article className="public-detail-card relative z-[1] mt-4 overflow-hidden rounded-[24px] bg-white animate-fade-in">
        <div className="public-detail-media relative overflow-hidden bg-slate-100">
          {isSecure || !item.imageUrl ? (
            <div
              className={`public-detail-placeholder relative flex aspect-[4/3] w-full items-center justify-center ${
                isSecure
                  ? 'public-detail-placeholder--secure'
                  : isFound
                    ? 'public-detail-placeholder--found'
                    : 'public-detail-placeholder--lost'
              }`}
            >
              {isSecure ? (
                <span className="public-secure-mark relative inline-flex">
                  <Shield size={56} strokeWidth={0} className="public-detail-secure-icon" />
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-xs font-black text-white">
                    !
                  </span>
                </span>
              ) : (
                <Package size={48} strokeWidth={1.25} />
              )}
            </div>
          ) : (
            <div className="relative aspect-[4/3] w-full">
              <SafeRemoteImage
                src={item.imageUrl}
                alt={item.title}
                fill
                className="object-cover object-center"
                sizes="(max-width: 672px) 100vw, 672px"
                priority
              />
            </div>
          )}
          <span
            className={`absolute left-3 top-3 z-[2] rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)] ${
              isSecure ? 'bg-amber-600' : isFound ? 'bg-[#1A56DB]' : 'bg-amber-500'
            }`}
          >
            {isSecure ? 'Secure' : isFound ? 'Found' : 'Lost'}
          </span>
        </div>

        <div className="public-detail-body p-5 sm:p-6">
          <h1 className="public-detail-title text-balance text-2xl font-black tracking-tight sm:text-3xl">
            {item.title}
          </h1>
          <p className="public-detail-muted mt-1.5 text-sm font-semibold tabular-nums">
            {formatPublicDate(item.reportedAt)}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="public-detail-chip inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold">
              <Tag size={12} />
              {item.category}
            </span>
            <span className="public-detail-chip public-detail-chip--blue inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold">
              <MapPin size={12} />
              {item.location}
            </span>
          </div>

          <div className="mt-5">
            <h2 className="public-detail-label text-[10px] font-black uppercase tracking-[0.14em]">
              {isSecure ? 'Public notice' : 'Description'}
            </h2>
            <p className="public-detail-desc mt-1.5 text-pretty text-sm font-medium leading-relaxed">
              {item.description || 'No additional description provided.'}
            </p>
          </div>

          <div
            className={`public-detail-claim mt-6 rounded-[16px] p-4 ${
              isSecure ? 'public-detail-claim--secure' : 'public-detail-claim--default'
            }`}
          >
            <h3 className="public-detail-claim-title text-base font-black">
              {isSecure ? 'Held at campus security' : 'Is this yours?'}
            </h3>
            <p className="public-detail-claim-text mt-1.5 text-pretty text-sm font-medium leading-relaxed">
              {isSecure
                ? 'Photos stay private for safety. Open the JU LOFO app to follow up with the Lost & Found desk.'
                : 'Contact details stay private for safety. Open the JU LOFO mobile app to claim this item.'}
            </p>
            <a
              href="/#get-app"
              className="public-detail-cta public-press mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full pl-5 pr-4 text-sm font-black shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_10px_24px_rgba(26,86,219,0.28)] transition-[transform,background-color,box-shadow] duration-200 hover:bg-[#1E40AF]"
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
