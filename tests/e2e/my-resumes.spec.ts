import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Publishes a separate public resume while retaining its edit-token cookie in
 * the supplied browser context. The list page must later show only resumes
 * whose cookies belong to that context.
 */
async function publishMockResume(page: Page, bossId: string): Promise<URL> {
  await page.goto("/");
  await page.locator("#character-name").fill("별빛검사");
  await page.locator("#character-search button[type='submit']").click();

  await expect(page).toHaveURL(/\/create\?name=/);
  await page.locator("#converted-stat").fill("110,650");
  await page.locator("#boss-multiplier-percent").fill("412.5");
  if (bossId === "xsu") {
    await page.getByRole("button", { name: /^주간 보스/ }).click();
  }
  await page.locator("#boss-quick-select").selectOption(bossId);
  await Promise.all([
    page.waitForURL(/\/r\/m-[a-z0-9_-]+$/),
    page.locator("form button[type='submit']").click(),
  ]);

  return new URL(page.url());
}

function cardForResume(page: Page, publicPath: string) {
  return page.getByTestId("my-resume-card").filter({ has: page.locator(`a[href='${publicPath}']`) });
}

async function publishOutsiderResume(browser: Browser): Promise<URL> {
  const outsider = await browser.newContext();
  try {
    const outsiderPage = await outsider.newPage();
    return await publishMockResume(outsiderPage, "xblack");
  } finally {
    await outsider.close();
  }
}

test("나의 이력서는 편집 권한 쿠키가 없으면 비어 있는 상태를 보여준다", async ({ page }) => {
  await page.goto("/my-resumes");

  await expect(page.getByRole("heading", { name: "나의 이력서" })).toBeVisible();
  await expect(page.getByText("저장된 메력서가 없어요", { exact: false })).toBeVisible();
  await expect(page.getByTestId("my-resume-card")).toHaveCount(0);
});

test("나의 이력서는 소유한 여러 장을 보스별 탭으로 열람하고 편집 링크를 제공한다", async ({
  browser,
  page,
}) => {
  const monthlyResume = await publishMockResume(page, "xblack");
  const weeklyResume = await publishMockResume(page, "xsu");
  const outsiderResume = await publishOutsiderResume(browser);

  await page.goto("/my-resumes");
  await expect(page.getByRole("heading", { name: "나의 이력서" })).toBeVisible();
  await expect(page.getByTestId("my-resume-card")).toHaveCount(2);

  const monthlyCard = cardForResume(page, monthlyResume.pathname);
  const weeklyCard = cardForResume(page, weeklyResume.pathname);
  await expect(monthlyCard).toContainText("검은 마법사");
  await expect(weeklyCard).toContainText("스우");
  await expect(page.locator(`a[href='${outsiderResume.pathname}']`)).toHaveCount(0);

  const monthlySlug = monthlyResume.pathname.slice("/r/".length);
  const weeklySlug = weeklyResume.pathname.slice("/r/".length);
  await expect(monthlyCard.getByRole("link", { name: "메력서 열기" })).toHaveAttribute(
    "href",
    monthlyResume.pathname,
  );
  await expect(monthlyCard.getByRole("link", { name: "수정" })).toHaveAttribute(
    "href",
    `/create?edit=${monthlySlug}`,
  );
  await expect(weeklyCard.getByRole("link", { name: "새 메력서로 저장" })).toHaveAttribute(
    "href",
    `/create?copy=${weeklySlug}`,
  );

  const monthlyTab = page.getByRole("tab", { name: /검은 마법사.*익스트림/ });
  await monthlyTab.click();
  await expect(monthlyTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("my-resume-card")).toHaveCount(1);
  await expect(monthlyCard).toBeVisible();

  await page.getByRole("tab", { name: /전체/ }).click();
  await expect(page.getByTestId("my-resume-card")).toHaveCount(2);

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole("heading", { name: "나의 이력서" })).toBeVisible();
  await expect(page.getByRole("tab", { name: /전체/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "새 메력서로 저장" }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
