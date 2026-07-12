import Link from "next/link";

import { ko } from "@/content/ko";

const sampleCharacters = [
  { name: "별빛검사", detail: "격수 · 정상 데이터" },
  { name: "루나힐러", detail: "지원 · 일부 정보 누락" },
  { name: "오래된모험가", detail: "stale 상태 예시" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-slate-700/50 px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight text-white">
          <span
            className="h-3 w-3 rounded-full bg-teal-300 shadow-[0_0_14px_rgba(94,234,212,0.9)]"
            aria-hidden
          />
          {ko.brand}
        </Link>
        <nav aria-label="보조 메뉴" className="flex items-center gap-4 text-sm text-slate-300">
          <Link href="/privacy" className="transition hover:text-teal-200">
            개인정보
          </Link>
          <Link href="/terms" className="transition hover:text-teal-200">
            서비스 고지
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-20">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-teal-300/40 bg-teal-300/10 px-3 py-1 text-sm font-bold text-teal-100">
            메이플 파티 구직용 캐릭터 이력서
          </p>
          <h1 className="max-w-2xl text-4xl font-black tracking-[-0.05em] text-white sm:text-6xl sm:leading-[1.08]">
            캐릭터명 하나로 만드는
            <br /> <span className="text-teal-200">파티 구직 메력서</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            API 조회 정보와 파티 경험·가능 시간을 한 장에 정리하고, QR로 데이터 기준 시각과 원본을 확인하세요.
          </p>

          <form action="/create" className="mt-9 max-w-xl" aria-label="캐릭터명으로 메력서 만들기">
            <label htmlFor="character-name" className="mb-2 block text-sm font-bold text-slate-100">
              캐릭터명
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="character-name"
                name="name"
                required
                minLength={2}
                maxLength={12}
                pattern="[가-힣A-Za-z0-9_]+"
                placeholder="캐릭터명을 입력하세요"
                className="ui-input min-h-13 flex-1 rounded-xl border px-4 py-3 text-base shadow-sm"
              />
              <button className="ui-action min-h-13 rounded-xl px-6 py-3 font-bold transition" type="submit">
                메력서 만들기
              </button>
            </div>
          </form>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            API 조회값, 서비스 계산값, 사용자 입력값을 구분해 표시합니다.
          </p>
        </div>

        <div className="ui-panel rounded-[2rem] p-5 sm:p-7">
          <div className="flex items-center justify-between border-b border-slate-700/70 pb-4">
            <span className="font-black text-white">샘플로 체험하기</span>
            <span className="rounded-full border border-sky-300/40 bg-sky-300/10 px-3 py-1 text-xs font-bold text-sky-100">
              mock mode
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {sampleCharacters.map((sample) => (
              <Link
                key={sample.name}
                href={`/create?name=${encodeURIComponent(sample.name)}`}
                className="group flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-950/50 p-4 transition hover:-translate-y-0.5 hover:border-teal-300/70 hover:bg-slate-900"
              >
                <span>
                  <span className="block font-bold text-white">{sample.name}</span>
                  <span className="mt-1 block text-sm text-slate-400">{sample.detail}</span>
                </span>
                <span className="text-xl text-slate-500 transition group-hover:text-teal-200" aria-hidden>
                  →
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-5 rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 text-xs leading-5 text-slate-400">
            API 키가 없어도 샘플 캐릭터로 검색부터 게시·검증·PNG 생성까지 체험할 수 있습니다.
          </p>
        </div>
      </section>

      <section className="border-y border-slate-800 bg-slate-950/45">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-10 sm:grid-cols-3 sm:px-8">
          {[
            ["1", "검색", "정규화된 캐릭터 정보와 데이터 출처를 확인합니다."],
            ["2", "작성", "지원 조건과 가능한 시간을 입력하고 카드로 미리 봅니다."],
            ["3", "검증", "공개 URL·QR·버전이 있는 PNG로 공유합니다."],
          ].map(([number, title, description]) => (
            <article key={number} className="ui-panel-subtle rounded-2xl p-5">
              <span className="text-sm font-black text-lime-200">0{number}</span>
              <h2 className="mt-2 text-xl font-bold text-white">{title}</h2>
              <p className="mt-2 leading-6 text-slate-400">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
