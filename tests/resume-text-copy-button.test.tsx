// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResumeTextCopyButton } from "@/components/resume-text-copy-button";
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
const originalExecCommand = Object.getOwnPropertyDescriptor(document, "execCommand");
const resumeText = "[메력서 · RESUMAE]\n디스코드: 선택\n검증 URL: https://example.test/r/m-copy?v=1";

function restoreProperty(target: object, key: string, descriptor: PropertyDescriptor | undefined) {
  if (descriptor) {
    Object.defineProperty(target, key, descriptor);
    return;
  }

  Reflect.deleteProperty(target, key);
}

afterEach(() => {
  cleanup();
  restoreProperty(navigator, "clipboard", originalClipboard);
  restoreProperty(document, "execCommand", originalExecCommand);
  vi.restoreAllMocks();
});

describe("ResumeTextCopyButton", () => {
  it("copies the fixed resume text through the Clipboard API and announces success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    render(<ResumeTextCopyButton text={resumeText} />);

    fireEvent.click(screen.getByRole("button", { name: "이력서 글 복사" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    expect(writeText).toHaveBeenCalledWith(resumeText);
    expect(screen.getByRole("status")).toHaveTextContent("이력서 내용을 클립보드에 복사했습니다.");
  });

  it("uses the textarea copy fallback when Clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });

    render(<ResumeTextCopyButton text={resumeText} />);

    fireEvent.click(screen.getByRole("button", { name: "이력서 글 복사" }));

    await waitFor(() => {
      expect(execCommand).toHaveBeenCalledWith("copy");
    });
    expect(screen.getByRole("status")).toHaveTextContent("이력서 내용을 클립보드에 복사했습니다.");
    expect(document.querySelector('textarea[aria-hidden="true"]')).toBeNull();
  });

  it("announces an error when neither copy path succeeds", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });

    render(<ResumeTextCopyButton text={resumeText} />);

    fireEvent.click(screen.getByRole("button", { name: "이력서 글 복사" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "클립보드에 복사하지 못했습니다. 다시 시도해 주세요.",
      );
    });
  });
});
