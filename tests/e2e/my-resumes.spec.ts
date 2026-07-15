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
  await page.locator("#boss-target-0").selectOption(bossId);
  await page.locator("#boss-multiplier-0").fill("412.5");
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

test("소유자는 메력서를 한 번 수정해 새 버전으로 이동한다", async ({ page }) => {
  const resumeUrl = await publishMockResume(page, "xblack");
  const slug = resumeUrl.pathname.slice("/r/".length);
  let patchCount = 0;

  page.on("request", (request) => {
    if (request.method() === "PATCH" && request.url().endsWith(`/api/resumes/${slug}`)) {
      patchCount += 1;
    }
  });

  const firstEditorLoad = page.waitForResponse(
    (response) => response.request().method() === "GET" && response.url().endsWith(`/api/resumes/${slug}`),
  );
  await page.getByRole("link", { name: "수정" }).click();
  await expect(page).toHaveURL(`/create?edit=${slug}`);
  const firstEditorPayload = await firstEditorLoad;
  expect(firstEditorPayload.headers()["cache-control"]).toContain("private, no-store");
  expect((await firstEditorPayload.json()).resume.version.versionNumber).toBe(1);
  await expect(page.locator("#role-summary")).toBeVisible();
  await page.locator("#role-summary").fill("수정한 어필 포인트입니다.");

  await Promise.all([
    page.waitForURL(resumeUrl.pathname),
    page.getByRole("button", { name: "메력서 수정하기" }).click(),
  ]);

  await expect.poll(() => patchCount).toBe(1);
  await expect(page.getByText(/v2 ·/)).toBeVisible();

  // Reopen the editor without another mutation to ensure the single saved
  // version carries the changed draft and the owner cookie remains valid.
  const secondEditorLoad = page.waitForResponse(
    (response) => response.request().method() === "GET" && response.url().endsWith(`/api/resumes/${slug}`),
  );
  await page.getByRole("link", { name: "수정" }).click();
  const secondEditorPayload = await secondEditorLoad;
  const secondEditorBody = await secondEditorPayload.json();
  expect(secondEditorBody.resume.version.versionNumber).toBe(2);
  expect(secondEditorBody.resume.version.draft.roleSummary).toBe("수정한 어필 포인트입니다.");
  await expect(page.locator("#role-summary")).toHaveValue("수정한 어필 포인트입니다.");
  expect(patchCount).toBe(1);
});
