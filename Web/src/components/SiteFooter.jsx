export default function SiteFooter({ className = '' }) {
  return (
    <footer
      className={`shrink-0 border-t border-slate-200/80 bg-white px-8 py-4 text-center text-xs font-bold text-slate-400 ${className}`}
    >
      © 2026 Jazeera University LOFO. All rights reserved.
    </footer>
  );
}
