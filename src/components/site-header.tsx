import Link from "next/link";

interface SiteHeaderProps {
  currentLabel?: string;
}

/** Shared document-style site header used across writing and verification pages. */
export function SiteHeader({ currentLabel }: SiteHeaderProps) {
  return (
    <header className="resume-page-header">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="resume-brand flex items-center gap-2" aria-label="메력서 홈">
          <span className="resume-brand-mark" aria-hidden>
            R
          </span>
          <span>
            <span className="block text-lg font-black tracking-tight">메력서</span>
            <span className="block text-[0.58rem] font-bold tracking-[0.2em]">RESUMAE</span>
          </span>
        </Link>
        <div className="flex items-center gap-4 text-sm font-semibold">
          {currentLabel ? <span className="hidden text-[#687380] sm:inline">{currentLabel}</span> : null}
          <nav aria-label="보조 메뉴" className="flex items-center gap-3 text-[#52606d]">
            <Link className="transition hover:text-[#7c2f2c]" href="/privacy">
              개인정보
            </Link>
            <Link className="transition hover:text-[#7c2f2c]" href="/terms">
              서비스 고지
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
