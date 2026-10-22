import {
  addResult,
  createStopWordWatcher,
  EMPTY_TRANSCRIPT,
  endsWithStopWord,
  transcriptText,
  withoutStopWord,
  type TranscriptState,
} from "@/lib/voice/transcript";

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

describe("stop word", () => {
  it("finishes on a closing stop or c'est tout, whatever the punctuation", () => {
    expect(endsWithStopWord("du riz et un yaourt stop")).toBe(true);
    expect(endsWithStopWord("Du riz. Stop.")).toBe(true);
    expect(endsWithStopWord("du riz, c’est tout ?")).toBe(true);
    expect(endsWithStopWord("stop !")).toBe(true);
  });

  it("ignores words that can end a food or sit inside a word", () => {
    expect(endsWithStopWord("une pizza et j'ai fini")).toBe(false);
    expect(endsWithStopWord("un poids défini")).toBe(false);
    expect(endsWithStopWord("un stop and go et du riz")).toBe(false);
  });

  it("removes the stop word from what Claude receives", () => {
    expect(withoutStopWord("200 g de poulet et du riz, stop.")).toBe("200 g de poulet et du riz");
    expect(withoutStopWord("un poids défini")).toBe("un poids défini");
    expect(withoutStopWord("Stop.")).toBe("");
  });
});

describe("createStopWordWatcher", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("finishes one second after a closing stop", () => {
    const onStop = jest.fn();
    const watcher = createStopWordWatcher(onStop, 1000);
    watcher.update("du riz stop");
    jest.advanceTimersByTime(999);
    expect(onStop).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("keeps listening when the sentence goes on after stop", () => {
    const onStop = jest.fn();
    const watcher = createStopWordWatcher(onStop, 1000);
    watcher.update("un stop");
    jest.advanceTimersByTime(500);
    watcher.update("un stop and go");
    jest.advanceTimersByTime(2000);
    expect(onStop).not.toHaveBeenCalled();
  });

  it("is not pushed back by the same result sent again", () => {
    const onStop = jest.fn();
    const watcher = createStopWordWatcher(onStop, 1000);
    watcher.update("du riz stop");
    jest.advanceTimersByTime(600);
    watcher.update("du riz stop");
    jest.advanceTimersByTime(400);
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
