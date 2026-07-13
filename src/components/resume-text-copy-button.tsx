"use client";

import { useId, useState } from "react";

interface ResumeTextCopyButtonProps {
  text: string;
  className?: string;
}

async function copyTextWithFallback(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Some browsers deny Clipboard API access outside a secure/user-initiated context.
      // Fall back to the broadly supported selection-based copy path below.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("aria-hidden", "true");
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    if (!document.execCommand("copy")) {
      throw new Error("The browser rejected the copy command.");
    }
  } finally {
    textarea.remove();
  }
}

/** Copies the public resume in a consistent Korean text format for chat posts. */
export function ResumeTextCopyButton({ text, className = "" }: ResumeTextCopyButtonProps) {
  const statusId = useId();
  const [status, setStatus] = useState("");
  const [isCopying, setIsCopying] = useState(false);

  async function handleCopy() {
    setIsCopying(true);
    setStatus("");

    try {
      await copyTextWithFallback(text);
      setStatus("이력서 내용을 클립보드에 복사했습니다.");
    } catch {
      setStatus("클립보드에 복사하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleCopy}
        disabled={isCopying}
        aria-describedby={statusId}
        className="rounded-lg border border-[#bfae99] bg-[#fffefa] px-3 py-2 text-sm font-semibold text-[#202a36] transition hover:border-[#a44640]/70 hover:text-[#7c2f2c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a44640] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isCopying ? "복사 중…" : "이력서 글 복사"}
      </button>
      <p id={statusId} role="status" aria-live="polite" className="mt-2 text-xs leading-5 text-[#52606d]">
        {status}
      </p>
    </div>
  );
}
