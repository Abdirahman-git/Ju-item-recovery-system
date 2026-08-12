export default function SectionHeading({ eyebrow, title, subtitle, align = 'center', className = '' }) {
  const alignClass = align === 'left' ? 'text-left' : 'text-center mx-auto';
  return (
    <div className={`max-w-2xl ${alignClass} ${className}`}>
      {eyebrow ? (
        <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#1A56DB]">{eyebrow}</p>
      ) : null}
      <h2 className="text-balance text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">{title}</h2>
      {subtitle ? (
        <p className="mt-3 text-pretty text-base font-medium leading-relaxed text-slate-600">{subtitle}</p>
      ) : null}
    </div>
  );
}
