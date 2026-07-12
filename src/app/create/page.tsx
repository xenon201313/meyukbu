import { ResumeEditor } from "@/components/resume-editor";
import { SiteHeader } from "@/components/site-header";

export default function CreatePage() {
  return (
    <main className="resume-shell">
      <SiteHeader currentLabel="메력서 작성" />
      <ResumeEditor />
    </main>
  );
}
