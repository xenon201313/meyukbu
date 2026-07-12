import { expect, test } from "@playwright/test";

test("mock 검색부터 게시, 검증, PNG 및 버전 갱신까지 동작한다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "캐릭터명" }).fill("별빛검사");
  await page.getByRole("button", { name: "메력서 만들기" }).click();

  await expect(page).toHaveURL(/\/create\?name=/);
  await expect(page.getByText("현재 데모 데이터로 표시 중입니다.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "메력서 게시하기" })).toBeEnabled();

  await page.locator("#target-boss").fill("카링");
  await Promise.all([
    page.waitForURL(/\/r\/m-[a-z0-9_-]+$/),
    page.getByRole("button", { name: "메력서 게시하기" }).click(),
  ]);

  await expect(page.getByRole("heading", { name: "검증 정보" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "장착 장비와 전투력" })).toBeVisible();
  await expect(page.getByText("Data based on NEXON Open API").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "최신 데이터로 갱신" })).toBeVisible();

  const publicPath = new URL(page.url()).pathname;
  const imageResponse = await page.request.get(`${publicPath}/image?v=1`);
  expect(imageResponse.ok()).toBeTruthy();
  expect(imageResponse.headers()["content-type"]).toContain("image/png");
  expect((await imageResponse.body()).subarray(1, 4).toString("ascii")).toBe("PNG");

  const bossArtResponse = await page.request.get("/api/boss-art/blackmage");
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
    await expect(page.getByLabel("월간 희망 보스")).toBeVisible();
    const quickSelect = page.locator("#boss-quick-select");
    await expect(quickSelect).toBeEnabled();
    await quickSelect.selectOption("xblack");
    await expect(page.getByLabel("월간 희망 보스")).toHaveValue("검은 마법사 (익스트림)");
    await expect(page.getByLabel("시작 가능 시간")).toBeVisible();
    await expect(page.getByLabel("종료 가능 시간")).toBeVisible();
    await expect(page.getByText("메력서 미리보기").first()).toBeVisible();
  });
});
