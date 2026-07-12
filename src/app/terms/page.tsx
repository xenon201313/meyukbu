import { SiteHeader } from "@/components/site-header";

export default function TermsPage() {
  return (
    <main className="resume-shell">
      <SiteHeader currentLabel="서비스 고지" />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <p className="ui-kicker">SERVICE NOTICE</p>
        <h1 className="resume-heading mt-2 text-3xl font-black tracking-tight sm:text-4xl">서비스 고지</h1>
        <div className="resume-paper mt-7 space-y-6 rounded-2xl p-6 leading-7 text-[#52606d] sm:p-8">
          <p>
            메력부는 파티 구직용 정보를 정리하는 도구이며 합격·불합격, 직업별 단일 점수, 숙련도 인증을
            제공하지 않습니다.
          </p>
          <p>Data based on NEXON Open API. 본 서비스는 NEXON의 공식 제휴 또는 인증 서비스가 아닙니다.</p>
          <p>
            API 데이터와 사용자 입력은 서로 다른 출처 배지로 표시됩니다. 오래된 API 데이터는 stale 또는
            expired 상태로 안내하며, 갱신 전까지 일부 공개가 제한될 수 있습니다.
          </p>
        </div>
      </div>
    </main>
  );
}
