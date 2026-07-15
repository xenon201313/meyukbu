import { describe, expect, it } from "vitest";

import { canFormPartyTogether, partyWorldGroupFor } from "@/domain/party-world";

describe("party world groups", () => {
  it("keeps 본서버, 에오스·헬리오스, and 챌린저스 as separate groups", () => {
    expect(partyWorldGroupFor("크로아")).toBe("MAIN");
    expect(partyWorldGroupFor("스카니아")).toBe("MAIN");
    expect(partyWorldGroupFor("에오스")).toBe("EOS_HELIOS");
    expect(partyWorldGroupFor("헬리오스")).toBe("EOS_HELIOS");
    expect(partyWorldGroupFor("챌린저스")).toBe("CHALLENGERS");
    expect(partyWorldGroupFor("챌린저스 2")).toBe("CHALLENGERS");
  });

  it("allows parties only inside a known matching group", () => {
    expect(canFormPartyTogether("루나", "크로아")).toBe(true);
    expect(canFormPartyTogether("에오스", "헬리오스")).toBe(true);
    expect(canFormPartyTogether("챌린저스", "챌린저스 2")).toBe(true);
    expect(canFormPartyTogether("크로아", "에오스")).toBe(false);
    expect(canFormPartyTogether("헬리오스", "챌린저스")).toBe(false);
    expect(canFormPartyTogether(null, "크로아")).toBe(false);
  });
});
