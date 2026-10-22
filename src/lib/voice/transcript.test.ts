import { addResult, EMPTY_TRANSCRIPT, transcriptText, type TranscriptState } from "@/lib/voice/transcript";

const r = (transcript: string, isFinal = false) => ({ isFinal, results: [{ transcript }] });
const play = (events: Parameters<typeof addResult>[1][]) =>
  transcriptText(events.reduce<TranscriptState>(addResult, EMPTY_TRANSCRIPT));

describe("dictation transcript", () => {
  it("keeps the words said before a pause (iOS 18 segments)", () => {
    expect(
      play([
        r("200 g"),
        r("200 g de poulet"),
        r("200 g de poulet", true),
        r(" et un"),
        r(" et un yaourt"),
        r(" et un yaourt", true),
        { isFinal: true, results: [] },
      ]),
    ).toBe("200 g de poulet et un yaourt");
  });

  it("uses the cumulative results of older iOS once", () => {
    expect(play([r("du riz"), r("du riz et du poulet"), r("du riz et du poulet", true)])).toBe(
      "du riz et du poulet",
    );
  });

  it("shows the words being said before any pause", () => {
    expect(play([r("une banane")])).toBe("une banane");
  });

  it("is not wiped by a final event without results", () => {
    expect(play([r("une pomme", true), { isFinal: true, results: [] }])).toBe("une pomme");
  });
});
