import Link from "next/link";

import { ko } from "@/content/ko";

const sampleCharacters = [
  { name: "별빛검사", detail: "격수 · 정상 데이터" },
  { name: "루나힐러", detail: "지원 · 일부 정보 누락" },
  { name: "오래된모험가", detail: "stale 상태 예시" },
];

export default function Home() {
  return (
    <main>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight">
          <span className="h-3 w-3 rounded-full bg-[#e26d2f]" aria-hidden />
          {ko.brand}
        </Link>
        <nav aria-label="보조 메뉴" className="flex items-center gap-4 text-sm text-stone-600">
          <Link href="/privacy" className="hover:text-stone-950">
            개인정보
          </Link>
          <Link href="/terms" className="hover:text-stone-950">
            서비스 고지
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-20">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-900">
            메이플 파티 구직용 캐릭터 이력서
          </p>
          <h1 className="max-w-2xl text-4xl font-black tracking-[-0.04em] text-stone-950 sm:text-6xl sm:leading-[1.12]">
            캐릭터명 하나로 만드는
            <br />
            파티 구직 메력서
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-stone-700">
            API 조회 정보와 파티 경험·가능 시간을 한 장에 정리하고, QR로 데이터 기준 시각과 원본을 확인하세요.
          </p>

          <form action="/create" className="mt-9 max-w-xl" aria-label="캐릭터명으로 메력서 만들기">
            <label htmlFor="character-name" className="mb-2 block text-sm font-bold text-stone-800">
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
                className="min-h-13 flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 text-base shadow-sm placeholder:text-stone-400"
              />
              <button
                className="min-h-13 rounded-xl bg-stone-950 px-6 py-3 font-bold text-white transition hover:bg-stone-700"
                type="submit"
              >
                메력서 만들기
              </button>
            </div>
          </form>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            API 조회값, 서비스 계산값, 사용자 입력값을 구분해 표시합니다.
          </p>
        </div>

        <div className="rounded-[2rem] border border-stone-300 bg-white p-5 shadow-[10px_12px_0_#e8dfd2] sm:p-7">
          <div className="flex items-center justify-between border-b border-stone-200 pb-4">
            <span className="font-black">샘플로 체험하기</span>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">mock mode</span>
          </div>
          <div className="mt-4 space-y-3">
            {sampleCharacters.map((sample) => (
              <Link
                key={sample.name}
                href={`/create?name=${encodeURIComponent(sample.name)}`}
                className="group flex items-center justify-between rounded-2xl border border-stone-200 bg-[#fffdf8] p-4 transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-sm"
              >
                <span>
                  <span className="block font-bold">{sample.name}</span>
                  <span className="mt-1 block text-sm text-stone-600">{sample.detail}</span>
                </span>
                <span className="text-xl text-stone-400 transition group-hover:text-orange-700" aria-hidden>
                  →
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-5 rounded-xl bg-stone-100 p-3 text-xs leading-5 text-stone-600">
            API 키가 없어도 샘플 캐릭터로 검색부터 게시·검증·PNG 생성까지 체험할 수 있습니다.
          </p>
        </div>
      </section>

      <section className="border-y border-stone-200 bg-stone-100/70">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-10 sm:grid-cols-3 sm:px-8">
          {[
            ["1", "검색", "정규화된 캐릭터 정보와 데이터 출처를 확인합니다."],
            ["2", "작성", "지원 조건과 가능한 시간을 입력하고 카드로 미리 봅니다."],
            ["3", "검증", "공개 URL·QR·버전이 있는 PNG로 공유합니다."],
          ].map(([number, title, description]) => (
            <article key={number} className="rounded-2xl border border-stone-200 bg-white p-5">
              <span className="text-sm font-black text-orange-700">0{number}</span>
              <h2 className="mt-2 text-xl font-bold">{title}</h2>
              <p className="mt-2 leading-6 text-stone-600">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
