export type MeasureBox = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  pxPerIn: number;
  in: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
};

export type MeasureSlide = {
  id: string;
  width: number;
  height: number;
  pxPerIn: number;
  in: {
    width: number;
    height: number;
  };
};

export type PptBox = Pick<MeasureBox["in"], "x" | "y" | "w" | "h">;

export type MeasureRuntime = {
  ready?: Promise<void> | (() => Promise<void> | void);
  measure?: () => Promise<void> | void;
  getBox?: (id: string) => Partial<MeasureBox> | undefined;
  getSlide?: (id?: string) => Partial<MeasureSlide> | undefined;
  getValue?: (id: string, key: string) => number | string | undefined;
};

export type MeasureReadOptions = {
  document?: Document;
  runtime?: MeasureRuntime;
  pxPerIn?: number;
};

const DEFAULT_PX_PER_IN = 120;

declare global {
  interface Window {
    ArtifactKitMeasure?: MeasureRuntime;
  }
}

export async function measureArtifacts(options: MeasureReadOptions = {}): Promise<void> {
  const runtime = options.runtime ?? getMeasureRuntime();
  if (runtime?.measure) {
    await runtime.measure();
  } else {
    measureDocument(options.document ?? getDefaultDocument(), options);
  }
  await waitForMeasure(options);
}

export async function waitForMeasure(options: MeasureReadOptions = {}): Promise<void> {
  const runtime = options.runtime ?? getMeasureRuntime();
  if (typeof runtime?.ready === "function") {
    await runtime.ready();
    return;
  }
  if (runtime?.ready) await runtime.ready;
}

export function getMeasureRuntime(globalObject: typeof globalThis = globalThis): MeasureRuntime | undefined {
  return (globalObject as typeof globalThis & { ArtifactKitMeasure?: MeasureRuntime }).ArtifactKitMeasure;
}

export function readBox(id: string, options: MeasureReadOptions = {}): MeasureBox {
  const runtimeBox = options.runtime?.getBox?.(id) ?? getMeasureRuntime()?.getBox?.(id);
  const attrBox = readElementBox(id, options);
  const pxPerIn = numberValue(runtimeBox?.pxPerIn, attrBox?.pxPerIn, options.pxPerIn, DEFAULT_PX_PER_IN);
  const x = numberValue(runtimeBox?.x, attrBox?.x, multiply(runtimeBox?.in?.x, pxPerIn), multiply(attrBox?.in?.x, pxPerIn));
  const y = numberValue(runtimeBox?.y, attrBox?.y, multiply(runtimeBox?.in?.y, pxPerIn), multiply(attrBox?.in?.y, pxPerIn));
  const w = numberValue(runtimeBox?.w, attrBox?.w, multiply(runtimeBox?.in?.w, pxPerIn), multiply(attrBox?.in?.w, pxPerIn));
  const h = numberValue(runtimeBox?.h, attrBox?.h, multiply(runtimeBox?.in?.h, pxPerIn), multiply(attrBox?.in?.h, pxPerIn));

  return {
    id,
    x,
    y,
    w,
    h,
    pxPerIn,
    in: {
      x: numberValue(runtimeBox?.in?.x, attrBox?.in?.x, x / pxPerIn),
      y: numberValue(runtimeBox?.in?.y, attrBox?.in?.y, y / pxPerIn),
      w: numberValue(runtimeBox?.in?.w, attrBox?.in?.w, w / pxPerIn),
      h: numberValue(runtimeBox?.in?.h, attrBox?.in?.h, h / pxPerIn),
    },
  };
}

export function readPptBox(id: string, options: MeasureReadOptions = {}): PptBox {
  return readBox(id, options).in;
}

export function readX(id: string, options: MeasureReadOptions = {}): number {
  return readBox(id, options).in.x;
}

export function readY(id: string, options: MeasureReadOptions = {}): number {
  return readBox(id, options).in.y;
}

export function readW(id: string, options: MeasureReadOptions = {}): number {
  return readBox(id, options).in.w;
}

export function readH(id: string, options: MeasureReadOptions = {}): number {
  return readBox(id, options).in.h;
}

export function readSlide(id = "default", options: MeasureReadOptions = {}): MeasureSlide {
  const runtimeSlide = options.runtime?.getSlide?.(id) ?? getMeasureRuntime()?.getSlide?.(id);
  const attrSlide = readElementSlide(id, options);
  const pxPerIn = numberValue(runtimeSlide?.pxPerIn, attrSlide?.pxPerIn, options.pxPerIn, DEFAULT_PX_PER_IN);
  const width = numberValue(runtimeSlide?.width, attrSlide?.width, multiply(runtimeSlide?.in?.width, pxPerIn), multiply(attrSlide?.in?.width, pxPerIn));
  const height = numberValue(runtimeSlide?.height, attrSlide?.height, multiply(runtimeSlide?.in?.height, pxPerIn), multiply(attrSlide?.in?.height, pxPerIn));

  return {
    id,
    width,
    height,
    pxPerIn,
    in: {
      width: numberValue(runtimeSlide?.in?.width, attrSlide?.in?.width, width / pxPerIn),
      height: numberValue(runtimeSlide?.in?.height, attrSlide?.in?.height, height / pxPerIn),
    },
  };
}

export function readSlideLayout(id = "default", options: MeasureReadOptions = {}): { name: string; width: number; height: number } {
  const slide = readSlide(id, options);
  return {
    name: `AK_${slide.id}_${Math.round(slide.width)}x${Math.round(slide.height)}`,
    width: slide.in.width,
    height: slide.in.height,
  };
}

export function readValue(id: string, key: string, options: MeasureReadOptions = {}): number | string {
  const runtimeValue = options.runtime?.getValue?.(id, key) ?? getMeasureRuntime()?.getValue?.(id, key);
  if (runtimeValue !== undefined) return runtimeValue;

  const element = findMeasureElement(id, options.document);
  if (!element) throw new Error(`No measured element found for "${id}".`);
  const value = readAttr(element, `data-ak-${key}`, `data-artifact-kit-${key}`);
  if (value === undefined) throw new Error(`No measured value "${key}" found for "${id}".`);
  return parseMaybeNumber(value);
}

export function readNumber(id: string, key: string, options: MeasureReadOptions = {}): number {
  const value = readValue(id, key, options);
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Measured value "${key}" for "${id}" is not numeric.`);
  }
  return value;
}

export function readFontPt(id: string, options: MeasureReadOptions = {}): number {
  return readNumber(id, "font-pt", options);
}

function readElementBox(id: string, options: MeasureReadOptions): MeasureBox | undefined {
  const element = findMeasureElement(id, options.document);
  if (!element) return undefined;

  const pxPerIn = numberAttr(element, "data-ak-px-per-in", "data-artifact-kit-px-per-in") ?? options.pxPerIn ?? DEFAULT_PX_PER_IN;
  const x = requiredNumberAttr(element, id, "x", "data-ak-x", "data-artifact-kit-x");
  const y = requiredNumberAttr(element, id, "y", "data-ak-y", "data-artifact-kit-y");
  const w = requiredNumberAttr(element, id, "w", "data-ak-w", "data-artifact-kit-w");
  const h = requiredNumberAttr(element, id, "h", "data-ak-h", "data-artifact-kit-h");

  return {
    id,
    x,
    y,
    w,
    h,
    pxPerIn,
    in: {
      x: numberAttr(element, "data-ak-in-x", "data-artifact-kit-in-x") ?? x / pxPerIn,
      y: numberAttr(element, "data-ak-in-y", "data-artifact-kit-in-y") ?? y / pxPerIn,
      w: numberAttr(element, "data-ak-in-w", "data-artifact-kit-in-w") ?? w / pxPerIn,
      h: numberAttr(element, "data-ak-in-h", "data-artifact-kit-in-h") ?? h / pxPerIn,
    },
  };
}

function readElementSlide(id: string, options: MeasureReadOptions): MeasureSlide | undefined {
  const element = findSlideElement(id, options.document);
  if (!element) return undefined;

  const pxPerIn = numberAttr(element, "data-ak-px-per-in", "data-artifact-kit-px-per-in") ?? options.pxPerIn ?? DEFAULT_PX_PER_IN;
  const width = requiredNumberAttr(element, id, "width", "data-ak-width", "data-artifact-kit-width", "data-width");
  const height = requiredNumberAttr(element, id, "height", "data-ak-height", "data-artifact-kit-height", "data-height");

  return {
    id,
    width,
    height,
    pxPerIn,
    in: {
      width: numberAttr(element, "data-ak-in-width", "data-artifact-kit-in-width") ?? width / pxPerIn,
      height: numberAttr(element, "data-ak-in-height", "data-artifact-kit-in-height") ?? height / pxPerIn,
    },
  };
}

function measureDocument(doc: Document | undefined, options: MeasureReadOptions): void {
  if (!doc) return;

  const slides = Array.from(
    doc.querySelectorAll("[data-ak-slide], [data-artifact-kit-slide], [data-slide-container]"),
  );

  slides.forEach((slideElement, index) => {
    const slideId = readAttr(slideElement, "data-ak-slide", "data-artifact-kit-slide", "data-slide-container") ?? (index === 0 ? "default" : `slide-${index + 1}`);
    const slideRect = slideElement.getBoundingClientRect();
    const pxPerIn = numberAttr(slideElement, "data-ak-px-per-in", "data-artifact-kit-px-per-in") ?? options.pxPerIn ?? DEFAULT_PX_PER_IN;
    const width = numberAttr(slideElement, "data-ak-width", "data-artifact-kit-width", "data-width") ?? slideRect.width;
    const height = numberAttr(slideElement, "data-ak-height", "data-artifact-kit-height", "data-height") ?? slideRect.height;
    const scaleX = width > 0 && slideRect.width > 0 ? slideRect.width / width : 1;
    const scaleY = height > 0 && slideRect.height > 0 ? slideRect.height / height : 1;

    writeNumberAttrs(slideElement, {
      "data-ak-width": width,
      "data-ak-height": height,
      "data-ak-px-per-in": pxPerIn,
      "data-ak-in-width": width / pxPerIn,
      "data-ak-in-height": height / pxPerIn,
    });

    const measuredElements = Array.from(
      slideElement.querySelectorAll("[data-ak-measure], [data-artifact-kit-measure]"),
    );

    measuredElements.forEach((element) => {
      const id = readAttr(element, "data-ak-measure", "data-artifact-kit-measure");
      if (!id) return;

      const rect = element.getBoundingClientRect();
      const x = (rect.left - slideRect.left) / scaleX;
      const y = (rect.top - slideRect.top) / scaleY;
      const w = rect.width / scaleX;
      const h = rect.height / scaleY;
      const fontPx = readComputedFontPx(element);

      writeNumberAttrs(element, {
        "data-ak-x": x,
        "data-ak-y": y,
        "data-ak-w": w,
        "data-ak-h": h,
        "data-ak-px-per-in": pxPerIn,
        "data-ak-in-x": x / pxPerIn,
        "data-ak-in-y": y / pxPerIn,
        "data-ak-in-w": w / pxPerIn,
        "data-ak-in-h": h / pxPerIn,
        ...(fontPx === undefined ? {} : { "data-ak-font-pt": (fontPx * 72) / pxPerIn }),
      });
      element.setAttribute("data-ak-slide-ref", slideId);
    });
  });
}

function findMeasureElement(id: string, doc = getDefaultDocument()): Element | undefined {
  if (!doc) return undefined;
  return findByDataValue(doc, "data-ak-measure", id) ?? findByDataValue(doc, "data-artifact-kit-measure", id);
}

function findSlideElement(id: string, doc = getDefaultDocument()): Element | undefined {
  if (!doc) return undefined;
  return (
    findByDataValue(doc, "data-ak-slide", id) ??
    findByDataValue(doc, "data-artifact-kit-slide", id) ??
    (id === "default" ? doc.querySelector("[data-slide-container]") ?? undefined : findByDataValue(doc, "data-slide-container", id))
  );
}

function findByDataValue(doc: Document, attr: string, value: string): Element | undefined {
  const elements = Array.from(doc.querySelectorAll(`[${attr}]`));
  return elements.find((element) => element.getAttribute(attr) === value);
}

function readAttr(element: Element, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = element.getAttribute(name);
    if (value !== null && value !== "") return value;
  }
  return undefined;
}

function numberAttr(element: Element, ...names: string[]): number | undefined {
  const value = readAttr(element, ...names);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function requiredNumberAttr(element: Element, id: string, label: string, ...names: string[]): number {
  const value = numberAttr(element, ...names);
  if (value === undefined) throw new Error(`Measured element "${id}" is missing numeric ${label}.`);
  return value;
}

function numberValue(...values: Array<number | undefined>): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  throw new Error("Expected a numeric measured value.");
}

function multiply(value: number | undefined, multiplier: number): number | undefined {
  return value === undefined ? undefined : value * multiplier;
}

function parseMaybeNumber(value: string): number | string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function readComputedFontPx(element: Element): number | undefined {
  const view = element.ownerDocument.defaultView;
  if (!view) return undefined;
  const fontSize = view.getComputedStyle(element).fontSize;
  const parsed = Number(fontSize.replace(/px$/, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function writeNumberAttrs(element: Element, attrs: Record<string, number>): void {
  for (const [name, value] of Object.entries(attrs)) {
    if (Number.isFinite(value)) element.setAttribute(name, formatNumber(value));
  }
}

function formatNumber(value: number): string {
  return Number(value.toFixed(6)).toString();
}

function getDefaultDocument(): Document | undefined {
  return typeof document === "undefined" ? undefined : document;
}
