import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Smartphone, Tag } from 'lucide-react';
import SafeRemoteImage from '@/components/admin/SafeRemoteImage';
import PublicOwnershipChallengeClaim from '@/components/public/PublicOwnershipChallengeClaim';
import { getItemPlaceholderIcon } from '@/lib/itemPlaceholderIcon';
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
        ? `Lost on campus · ${item.category}`
        : `Lost on campus · ${item.category}`,
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
                  ? 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700'
                  : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500'
              }`}
            >
              {(() => {
                const PlaceholderIcon = getItemPlaceholderIcon(item.title, item.category);
                return <PlaceholderIcon size={56} strokeWidth={1.4} />;
              })()}
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
                ? 'Photos stay private for safety. Prove ownership with the challenge below, or open the JU LOFO app.'
                : 'Contact details stay private. Prove ownership with the Ownership Challenge, or open the mobile app.'}
            </p>
            <PublicOwnershipChallengeClaim item={item} />
            <a
              href="/#get-app"
              className="public-press mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-[#1A56DB]"
            >
              <Smartphone size={15} />
              Prefer the app? Get JU LOFO
            </a>
          </div>
        </div>
      </article>
    </section>
  );
}
