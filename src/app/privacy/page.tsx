import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <Link href="/" className="text-sm font-semibold text-slate-300 transition hover:text-teal-200">
        ← 메력부 홈
      </Link>
      <h1 className="mt-8 text-3xl font-black text-white">개인정보 및 공개 범위</h1>
      <div className="ui-panel mt-7 space-y-6 rounded-3xl p-6 leading-7 text-slate-300">
        <p>
          메력부는 캐릭터명으로 조회되는 공개 게임 데이터와 작성자가 직접 입력한 파티 구직 정보를 메력서에
          표시합니다.
        </p>
        <p>
          연락 방법은 선택 입력이며, 공개 체크를 선택한 경우에만 검증 페이지와 이미지가 아닌 검증 페이지에
          표시됩니다. 전화번호, 실명, 주소는 수집하지 않습니다.
        </p>
        <p>
          게시·수정·갱신 권한은 생성 시 현재 브라우저에 저장되는 HttpOnly 편집 토큰으로 보호합니다. 토큰
          원문은 서버 저장소에 보관하지 않습니다.
        </p>
      </div>
    </main>
  );
}
