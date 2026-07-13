import { expect, test, type Page } from "@playwright/test";

async function publishMockResume(page: Page, characterName: string): Promise<string> {
  await page.goto("/");
  await page.getByRole("textbox", { name: "캐릭터명" }).fill(characterName);
  await page.getByRole("button", { name: "메력서 만들기" }).click();

  await expect(page).toHaveURL(/\/create\?name=/);
  await page.locator("#converted-stat").fill("110,650");
  await page.locator("#boss-multiplier-percent").fill("412.5");
  await page.locator("#boss-quick-select").selectOption("xblack");
  await Promise.all([
    page.waitForURL(/\/r\/m-[a-z0-9_-]+$/),
    page.getByRole("button", { name: "메력서 게시하기" }).click(),
  ]);

  return page.url();
}

test("mock 검색부터 게시, 검증, PNG 및 버전 갱신까지 동작한다", async ({ page }) => {
  await page.goto("/");
  await expect
    .poll(() => page.locator("body").evaluate((element) => getComputedStyle(element).fontSynthesis))
    .toBe("none");
  await expect(page.locator('link[rel="icon"][href*="icon.svg"]')).toHaveCount(1);
  const outlineHeading = page.getByRole("heading", { name: "메력서 작성 순서" });
  await expect(outlineHeading).toBeVisible();
  const outlineTypography = await outlineHeading.evaluate((element) => {
    const styles = getComputedStyle(element);
    return { fontWeight: styles.fontWeight, letterSpacing: styles.letterSpacing };
  });
  expect(outlineTypography.fontWeight).toBe("700");
  expect(["normal", "0px"]).toContain(outlineTypography.letterSpacing);
  await expect(page.getByText("샘플로 체험하기", { exact: true })).toHaveCount(0);
  await page.getByRole("textbox", { name: "캐릭터명" }).fill("별빛검사");
  await page.getByRole("button", { name: "메력서 만들기" }).click();

  await expect(page).toHaveURL(/\/create\?name=/);
  await expect(
    page.getByText("현재 데모 데이터로 표시 중입니다. 실제 게임 데이터와 다를 수 있습니다.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("자동 연동은 해당 서비스의 공식 파트너 API 사용 권한이 확인된 뒤에만 제공됩니다."),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "메력서 게시하기" })).toBeEnabled();

  await page.locator("#converted-stat").fill("110,650");
  await page.locator("#boss-multiplier-percent").fill("412.5");
  await page.locator("#party-type").selectOption("ACHIEVEMENT");
  await expect(page.locator("#party-type")).toHaveValue("ACHIEVEMENT");
  await expect(page.locator("#target-boss")).toHaveCount(0);
  await page.locator("#boss-quick-select").selectOption("xblack");
  await Promise.all([
    page.waitForURL(/\/r\/m-[a-z0-9_-]+$/),
    page.getByRole("button", { name: "메력서 게시하기" }).click(),
  ]);

  await expect(page.getByRole("heading", { name: "검증 정보" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "전투력과 최종 능력치" })).toBeVisible();
  await expect(page.getByText("Data based on NEXON Open API").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "최신 데이터로 갱신" })).toBeVisible();
  await expect(page.getByRole("button", { name: "이력서 글 복사" })).toBeVisible();
  await page.getByRole("button", { name: "이력서 글 복사" }).click();
  await expect(page.getByRole("status")).toHaveText("이력서 내용을 클립보드에 복사했습니다.");

  const publicPath = new URL(page.url()).pathname;
  const imageUrl = `${publicPath}/image?v=1&layout=5`;
  await expect(page.locator("[data-resume-share-image]")).toHaveAttribute("src", imageUrl);
  const imageResponse = await page.request.get(imageUrl);
  expect(imageResponse.ok()).toBeTruthy();
  expect(imageResponse.headers()["content-type"]).toContain("image/png");
  const imageBody = await imageResponse.body();
  expect(imageBody.subarray(1, 4).toString("ascii")).toBe("PNG");
  const imageView = new DataView(imageBody.buffer, imageBody.byteOffset, imageBody.byteLength);
  expect(imageView.getUint32(16)).toBe(1080);
  expect(imageView.getUint32(20)).toBe(1350);
  await expect(page.getByRole("link", { name: "이미지 저장 (1080×1350 PNG)" })).toHaveAttribute(
    "download",
    new RegExp(`메력서-${publicPath.slice(3)}-v1\\.png`),
  );

  const bossArtResponse = await page.request.get("/images/bosses/blackmage.png");
  expect(bossArtResponse.ok()).toBeTruthy();
  expect(bossArtResponse.headers()["content-type"]).toContain("image/png");

  await page.getByRole("button", { name: "최신 데이터로 갱신" }).click();
  await expect(page.getByText(/버전 \/ content hash/)).toBeVisible();
  await expect(page.getByText(/v2 ·/)).toBeVisible();

  const originalResumeUrl = page.url();
  await page.getByRole("link", { name: "새 메력서로 저장" }).click();
  await expect(page).toHaveURL(/\/create\?copy=/);
  await expect(page.getByRole("heading", { name: "새 메력서로 저장" })).toBeVisible();
  await expect(page.locator("#boss-quick-select")).toBeEnabled();
  await page.getByRole("button", { name: /^주간 보스/ }).click();
  await expect(page.locator("#boss-quick-select")).toHaveValue("njup");
  await page.locator("#boss-quick-select").selectOption("xsu");
  await expect(page.locator("#party-size")).toHaveValue("2");
  await expect(page.locator("#party-size option")).toHaveCount(2);
  await Promise.all([
    page.waitForURL(/\/r\/m-[a-z0-9_-]+$/),
    page.getByRole("button", { name: "새 메력서로 저장하기" }).click(),
  ]);
  expect(new URL(page.url()).pathname).not.toBe(publicPath);

  await page.goto(originalResumeUrl);
  await expect(page.locator("[data-resume-share-image]")).toHaveAttribute(
    "src",
    `${publicPath}/image?v=2&layout=5`,
  );
});

test("메숭이 체온은 별점 없이 기명 동행 태그만 공개하고 공유 이미지는 바꾸지 않는다", async ({
  browser,
  page,
}) => {
  const ownerResumeUrl = await publishMockResume(page, "별빛검사");
  const originalImageUrl = await page.locator("[data-resume-share-image]").getAttribute("src");
  expect(originalImageUrl).toMatch(/^\/r\/m-[a-z0-9_-]+\/image\?v=1&layout=5$/);

  await page.getByRole("button", { name: "동행 확인 링크 만들기" }).click();
  await expect(page.getByLabel("동행 확인 링크")).toBeVisible();
  const invitationUrl = await page.locator("#temperature-invite-url").inputValue();
  const invitation = new URL(invitationUrl);
  expect(invitation.hash).toMatch(/^#invite=.+/);

  const reviewerContext = await browser.newContext();
  try {
    const reviewerPage = await reviewerContext.newPage();
    const reviewerResumeUrl = await publishMockResume(reviewerPage, "루나힐러");

    // The invitation uses the canonical public origin. Keep this isolated E2E
    // server on its own port while preserving the one-time fragment verbatim.
    await reviewerPage.goto(`${invitation.pathname}${invitation.search}${invitation.hash}`);
    await expect(reviewerPage.getByText("동행 기록 초대 링크를 확인했습니다.")).toBeVisible();
    await reviewerPage.getByLabel("내 공개 메력서").fill(reviewerResumeUrl);
    await reviewerPage.getByLabel("약속 시간 준수").check();
    await reviewerPage.getByLabel("공략 준비").check();
    await reviewerPage.getByRole("button", { name: "동행 기록 남기기" }).click();
    await expect(
      reviewerPage.getByText("동행 기록을 남겼습니다. 메력서에 작성 내용으로 표시됩니다."),
    ).toBeVisible();

    await page.goto(ownerResumeUrl);
    const temperaturePanel = page.getByRole("region", { name: "메숭이 체온 · 동행 기록" });
    await expect(temperaturePanel).toContainText("루나힐러");
    await expect(temperaturePanel).toContainText("약속 시간 준수");
    await expect(temperaturePanel).toContainText("공략 준비");
    await expect(temperaturePanel.getByRole("progressbar")).toHaveCount(0);
    await expect(
      temperaturePanel.locator("[aria-valuenow], [aria-label*='별점'], [aria-label*='점수']"),
    ).toHaveCount(0);
    await expect(temperaturePanel.getByText(/별점|평균|온도\s*\d|\d+\s*(점|℃|도)/)).toHaveCount(0);
    await expect(page.locator("[data-resume-share-image]")).toHaveAttribute("src", originalImageUrl ?? "");
  } finally {
    await reviewerContext.close();
  }
});

test.describe("375px mobile accessibility", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("검색과 편집기의 label, 키보드 흐름을 제공한다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox", { name: "캐릭터명" }).fill("루나힐러");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/create\?name=/);
    await expect(page.getByLabel("희망 보스 선택")).toBeVisible();
    const quickSelect = page.locator("#boss-quick-select");
    await expect(quickSelect).toBeEnabled();
    await quickSelect.selectOption("xblack");
    await expect(quickSelect).toHaveValue("xblack");
    await expect(page.getByLabel("시작 가능 시간")).toBeVisible();
    await expect(page.getByLabel("종료 가능 시간")).toBeVisible();
    await page.getByText("요일·시간 협의 가능", { exact: true }).click();
    await expect(page.locator("#start-time")).toHaveCount(0);
    await expect(page.locator("#end-time")).toHaveCount(0);
    await expect(page.getByLabel("디스코드")).toBeVisible();
    await expect(page.getByText("메력서 미리보기").first()).toBeVisible();
    await expect(page.getByText("크로아/얀보 제작")).toBeVisible();
  });
});
