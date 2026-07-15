import { expect, test, type Page } from "@playwright/test";

async function publishResume(
  page: Page,
  characterName: string,
  options: { bundled?: boolean } = {},
): Promise<URL> {
  await page.goto("/");
  await page.getByRole("textbox", { name: "캐릭터명" }).fill(characterName);
  await page.getByRole("button", { name: "메력서 만들기" }).click();
  await expect(page).toHaveURL(/\/create\?name=/);

  await page.locator("#converted-stat").fill("110,650");
  await page.locator("#boss-target-0").selectOption("hblack");
  await page.locator("#boss-multiplier-0").fill("72.1");
  if (options.bundled) {
    await page.locator("#boss-target-add-select").selectOption("njup");
    await page.getByRole("button", { name: "보스 추가", exact: true }).click();
    await expect(page.locator("#boss-target-1")).toHaveValue("njup");
    await page.locator("#boss-multiplier-1").fill("45.86");
  }

  await Promise.all([
    page.waitForURL(/\/r\/m-[a-z0-9_-]+$/),
    page.getByRole("button", { name: "메력서 게시하기" }).click(),
  ]);
  return new URL(page.url());
}

test("여러 보스를 묶은 메력서로 사이트 안에서 파티 모집·지원·수락·마감한다", async ({ browser, page }) => {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": "198.51.100.41" });
  const ownerResume = await publishResume(page, "별빛검사", { bundled: true });
  const ownerSlug = ownerResume.pathname.slice("/r/".length);

  await page.locator(`a[href="/parties/new?resume=${ownerSlug}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/parties/new\\?resume=${ownerSlug}`));
  await expect(page.getByRole("heading", { name: "파티 글 작성" })).toBeVisible();
  await expect(page.getByText("월간 · 검은 마법사 (하드)")).toBeVisible();
  await expect(page.getByText("주간 · 유피테르 (노멀)")).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/parties\/p-[a-z0-9_-]+$/),
    page.getByRole("button", { name: "파티 글 게시하기" }).click(),
  ]);
  const partyUrl = new URL(page.url());
  expect(partyUrl.pathname).toMatch(/^\/parties\/p-[a-z0-9_-]+$/);
  await expect(page.getByRole("heading", { name: "함께 가려는 보스" })).toBeVisible();
  await expect(page.getByText("72.1%")).toBeVisible();
  await expect(page.getByText("45.86%")).toBeVisible();

  const applicantContext = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": "198.51.100.42" },
  });
  try {
    const applicantPage = await applicantContext.newPage();
    await publishResume(applicantPage, "루나힐러");
    await applicantPage.goto(partyUrl.pathname);
    await expect(applicantPage.getByRole("heading", { name: "이 파티에 지원하기" })).toBeVisible();
    await applicantPage
      .locator("#party-application-message")
      .fill("월간 보스 경험이 있어 약속 시간에 참여할 수 있습니다.");
    await applicantPage.getByRole("button", { name: "이 이력서로 지원하기" }).click();
    await expect(applicantPage.getByRole("status")).toContainText("지원이 접수되었습니다");
  } finally {
    await applicantContext.close();
  }

  await page.goto(partyUrl.pathname);
  await expect(page.getByRole("heading", { name: "게시글 관리" })).toBeVisible();
  await expect(page.getByText("루나힐러")).toBeVisible();
  await expect(page.getByText("월간 보스 경험이 있어 약속 시간에 참여할 수 있습니다.")).toBeVisible();
  await page.getByRole("button", { name: "수락" }).click();
  await expect(page.getByText("수락함")).toBeVisible();

  // Updating the source resume intentionally removes the post from public
  // discovery, but the same owner cookie must retain a private management view.
  await page.goto(`/create?edit=${ownerSlug}`);
  await expect(page.locator("#role-summary")).toBeVisible();
  await page.locator("#role-summary").fill("갱신 뒤에도 게시글 관리가 가능한지 확인합니다.");
  await Promise.all([
    page.waitForURL(ownerResume.pathname),
    page.getByRole("button", { name: "메력서 수정하기" }).click(),
  ]);
  await page.goto(partyUrl.pathname);
  await expect(page.getByRole("status")).toContainText("작성자만 지원 현황을 확인");
  await expect(page.getByRole("heading", { name: "게시글 관리" })).toBeVisible();
  await page.getByRole("button", { name: "게시글 마감하기" }).click();
  await expect(
    page.getByText("게시글을 마감했습니다. 공개 목록에서는 더 이상 보이지 않습니다."),
  ).toBeVisible();

  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.goto("/parties");
  await expect(page.getByText("현재 열린 파티 글이 없습니다.")).toBeVisible();
});
