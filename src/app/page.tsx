import Link from "next/link";

import { ko } from "@/content/ko";

const writingSteps = [
  {
    number: "01",
    title: "캐릭터 정보 확인",
    description: "캐릭터명을 검색하면 공개된 기본 정보와 기준 시각을 먼저 확인합니다.",
  },
  {
    number: "02",
    title: "지원 내용을 작성",
    description: "희망 보스, 파티 유형, 가능한 시간과 어필 포인트를 내 말로 정리합니다.",
  },
  {
    number: "03",
    title: "한 장으로 공유",
    description: "출처와 사용자 입력이 구분된 메력서, 검증 링크와 공유 PNG를 만듭니다.",
  },
];

const documentSections = [
  ["01", "기본 정보", "캐릭터명 · 월드 · 직업 · 레벨"],
  ["02", "지원 조건", "희망 보스 · 난이도 · 역할 · 파티 유형"],
  ["03", "어필 포인트", "클리어 경험 · 참여 시간 · 선호 조건"],
  ["04", "공개 정보", "데이터 기준 시각 · 출처 · 검증 URL"],
] as const;

export default function Home() {
  return (
    <main className="resume-shell min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8 sm:py-6">
        <Link href="/" className="resume-brand flex items-center gap-3" aria-label="메력부 홈">
          <span className="resume-brand-mark !h-9 !w-9" aria-hidden>
            M
          </span>
          <span>
            <span className="block text-lg font-black tracking-tight">{ko.brand}</span>
            <span className="block text-[0.63rem] font-bold tracking-[0.2em]">MERIT RESUME</span>
          </span>
        </Link>
        <nav aria-label="보조 메뉴" className="resume-nav flex items-center gap-4 text-sm sm:gap-6">
          <Link href="/privacy" className="transition-opacity hover:opacity-70">
            개인정보
          </Link>
          <Link href="/terms" className="transition-opacity hover:opacity-70">
            서비스 고지
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(26rem,0.95fr)] lg:items-center lg:gap-16">
        <div className="max-w-2xl">
          <p className="resume-kicker">PARTY APPLICATION · START HERE</p>
          <h1 className="resume-heading mt-5 text-4xl font-black tracking-[-0.055em] sm:text-6xl sm:leading-[1.06]">
            파티에 보여줄 정보를,
            <br />
            <span>한 장의 이력서로 정리하세요.</span>
          </h1>
          <p className="resume-lead mt-6 max-w-xl text-lg leading-8 sm:text-xl">
            캐릭터 정보와 내가 직접 쓰는 지원 내용을 구분해 담는 파티 구직용 메력서입니다. 필요한 내용만
            차분히 작성하고, 공유 전에 한 번 더 확인할 수 있어요.
          </p>

          <form
            id="character-search"
            action="/create"
            className="resume-search mt-9 max-w-xl"
            aria-label="캐릭터명으로 메력서 만들기"
          >
            <div className="rounded-2xl border p-4 sm:p-5">
              <label htmlFor="character-name" className="block text-sm font-extrabold">
                캐릭터명
              </label>
              <p id="character-name-help" className="mt-1 text-sm leading-6">
                닉네임을 입력하면 작성할 캐릭터 정보를 불러옵니다.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  id="character-name"
                  name="name"
                  required
                  minLength={2}
                  maxLength={12}
                  pattern="[가-힣A-Za-z0-9_]+"
                  aria-describedby="character-name-help"
                  placeholder="캐릭터명을 입력하세요"
                  className="min-h-13 flex-1 rounded-xl border px-4 py-3 text-base shadow-sm"
                />
                <button
                  className="min-h-13 rounded-xl px-6 py-3 font-extrabold transition-transform hover:-translate-y-0.5"
                  type="submit"
                >
                  메력서 만들기
                </button>
              </div>
            </div>
          </form>

          <p className="resume-caption mt-4 max-w-xl text-sm leading-6">
            API 조회 정보, 사용자 입력, 서비스 계산 항목은 문서 안에서 각각의 출처와 함께 표시됩니다.
          </p>
        </div>

        <aside
          className="resume-paper relative mx-auto w-full max-w-xl rounded-[1.5rem] border p-5 sm:p-8"
          aria-labelledby="resume-outline-heading"
        >
          <div className="flex items-start justify-between gap-4 border-b pb-5">
            <div>
              <p className="resume-kicker">MEYUKBU / DOCUMENT</p>
              <h2 id="resume-outline-heading" className="mt-2 text-2xl font-black tracking-tight">
                메력서 작성 순서
              </h2>
            </div>
            <span className="resume-document-mark shrink-0 rounded-sm border px-3 py-2 text-xs font-extrabold">
              DRAFT
            </span>
          </div>

          <ol className="mt-5 space-y-3">
            {documentSections.map(([number, title, description]) => (
              <li
                key={number}
                className="resume-document-row grid grid-cols-[2.5rem_1fr] gap-3 rounded-xl border p-4"
              >
                <span className="text-sm font-black" aria-hidden>
                  {number}
                </span>
                <div>
                  <h3 className="font-extrabold">{title}</h3>
                  <p className="mt-1 text-sm leading-6">{description}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="resume-document-note mt-5 rounded-xl border p-4">
            <p className="text-sm font-extrabold">작성 전 확인</p>
            <p className="mt-1 text-sm leading-6">
              메력부는 합격 여부를 판단하지 않습니다. 조회된 정보와 작성자가 제공한 내용을 구분해 보여 줍니다.
            </p>
          </div>
        </aside>
      </section>

      <section className="resume-process border-y" aria-labelledby="writing-process-heading">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="max-w-2xl">
            <p className="resume-kicker">HOW TO WRITE</p>
            <h2
              id="writing-process-heading"
              className="resume-heading mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl"
            >
              이력서를 쓰듯, 필요한 정보부터 채웁니다.
            </h2>
            <p className="resume-lead mt-4 leading-7">
              스펙을 한 줄로 판단하지 않고, 파티에 필요한 조건과 참여 방식을 이해하기 쉽게 정리합니다.
            </p>
          </div>

          <ol className="mt-9 grid gap-4 md:grid-cols-3">
            {writingSteps.map((step) => (
              <li key={step.number} className="resume-step rounded-2xl border p-6">
                <span className="text-sm font-black" aria-hidden>
                  {step.number}
                </span>
                <h3 className="mt-7 text-xl font-black tracking-tight">{step.title}</h3>
                <p className="mt-3 text-sm leading-7">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"
        aria-labelledby="resume-principles-heading"
      >
        <div className="resume-paper rounded-[1.5rem] border p-6 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="resume-kicker">DOCUMENT PRINCIPLES</p>
              <h2
                id="resume-principles-heading"
                className="resume-heading mt-3 text-3xl font-black tracking-[-0.04em]"
              >
                읽는 사람이 바로 이해할 수 있게
              </h2>
            </div>
            <ul className="grid gap-4 sm:grid-cols-3">
              <li>
                <h3 className="font-extrabold">출처를 구분</h3>
                <p className="mt-2 text-sm leading-6">
                  API 조회값과 작성자가 직접 입력한 내용을 혼동하지 않게 표시합니다.
                </p>
              </li>
              <li>
                <h3 className="font-extrabold">공개 범위는 신중히</h3>
                <p className="mt-2 text-sm leading-6">
                  연락처는 선택 사항이며, 공개할 정보만 메력서에 담습니다.
                </p>
              </li>
              <li>
                <h3 className="font-extrabold">공유 뒤에도 확인</h3>
                <p className="mt-2 text-sm leading-6">
                  검증 URL과 데이터 기준 시각으로 같은 문서를 다시 확인할 수 있습니다.
                </p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 border-t px-5 py-7 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>Data based on NEXON Open API</p>
        <p>{ko.affiliationNotice}</p>
      </footer>
    </main>
  );
}
