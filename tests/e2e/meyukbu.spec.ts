import { expect, test } from "@playwright/test";

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

  const publicPath = new URL(page.url()).pathname;
  const imageUrl = `${publicPath}/image?v=1&layout=3`;
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
    await expect(page.getByText("메력서 미리보기").first()).toBeVisible();
    await expect(page.getByText("크로아/얀보 제작")).toBeVisible();
  });
});
