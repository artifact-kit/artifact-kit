import assert from "node:assert/strict";

const {
  measureArtifacts,
  readBox,
  readFontPt,
  readPptBox,
  readSlideLayout,
} = await import("../dist/measure.es.js");

const runtime = {
  measured: false,
  async measure() {
    this.measured = true;
  },
  getBox(id) {
    if (id !== "title") return undefined;
    return {
      id,
      x: 120,
      y: 240,
      w: 360,
      h: 60,
      pxPerIn: 120,
      in: { x: 1, y: 2, w: 3, h: 0.5 },
    };
  },
  getSlide(id) {
    if (id !== "attention") return undefined;
    return {
      id,
      width: 1600,
      height: 900,
      pxPerIn: 120,
      in: { width: 13.333333, height: 7.5 },
    };
  },
  getValue(id, key) {
    if (id === "title" && key === "font-pt") return 30;
    return undefined;
  },
};

await measureArtifacts({ runtime });

assert.equal(runtime.measured, true);
assert.deepEqual(readPptBox("title", { runtime }), { x: 1, y: 2, w: 3, h: 0.5 });
assert.equal(readBox("title", { runtime }).pxPerIn, 120);
assert.deepEqual(readSlideLayout("attention", { runtime }), {
  name: "AK_attention_1600x900",
  width: 13.333333,
  height: 7.5,
});
assert.equal(readFontPt("title", { runtime }), 30);

console.log("Measure reader verification passed.");
