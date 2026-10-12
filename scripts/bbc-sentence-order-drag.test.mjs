import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const filename = process.env.DRAG_TEST_SOURCE ?? new URL("../src/components/bbc-sentence-practice.tsx", import.meta.url);
const source = ts.createSourceFile("practice.tsx", fs.readFileSync(filename, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = new Set(["moveSentenceOrderAnswer", "getDropTarget", "startSentenceOrderPointerDrag", "startSentenceOrderTouchDrag", "handleTouchEnd"]);
const functions = [];
function collect(node) {
  if (ts.isFunctionDeclaration(node) && names.has(node.name?.text)) functions.push(node.getText(source));
  ts.forEachChild(node, collect);
}
collect(source);
const code = ts.transpileModule(functions.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;

function harness(initial = {}) {
  let answers = initial;
  let drag = null;
  const elements = [];
  const context = vm.createContext({
    setSentenceOrderAnswers: (update) => { answers = update(answers); },
    setSentenceOrderDrag: (value) => { drag = value; },
    setSentenceOrderHover: () => {},
    setSentenceOrderPointerPosition: () => {},
    isMobilePointerViewport: true,
    window: { PointerEvent: class {} },
    document: { elementsFromPoint: () => elements, elementFromPoint: () => elements[0] ?? null },
    sentenceOrderLineRef: { current: { contains: (element) => element.owner === "current" && element.kind === "slot" } },
    sentenceOrderBankRef: { current: { contains: (element) => element.owner === "current" && element.kind === "bank" } },
  });
  vm.runInContext(code, context);
  return {
    context,
    elements,
    answers: () => JSON.parse(JSON.stringify(answers)),
    drag: () => drag,
    move: (payload, target) => context.moveSentenceOrderAnswer(payload, target),
    target: () => context.getDropTarget(10, 20),
  };
}

function slot(index, owner = "current") {
  return { kind: "slot", owner, dataset: { sentenceOrderDropTarget: String(index) }, closest() { return this; } };
}
const a = { token: "We", tokenIndex: 0 };
const b = { token: "work", tokenIndex: 2 };

test("a word moves from the bank into a blank, between blanks, and back to the bank", () => {
  const h = harness();
  h.move({ ...a, sourceSlot: null }, 0);
  assert.deepEqual(h.answers(), { 0: a });
  h.move({ ...a, sourceSlot: 0 }, 4);
  assert.deepEqual(h.answers(), { 4: a });
  h.move({ ...a, sourceSlot: 4 }, "bank");
  assert.deepEqual(h.answers(), {});
});

test("moving onto a filled blank exchanges both words without losing either", () => {
  const h = harness({ 0: a, 2: b });
  h.move({ ...a, sourceSlot: 0 }, 2);
  assert.deepEqual(h.answers(), { 0: b, 2: a });
});

test("a bank word replacing a filled blank returns the displaced word to the bank", () => {
  const h = harness({ 0: b });
  h.move({ ...a, sourceSlot: null }, 0);
  assert.deepEqual(h.answers(), { 0: a });
  assert.equal(Object.values(h.answers()).some((answer) => answer.tokenIndex === b.tokenIndex), false);
});

test("dropping onto the source blank leaves the placement unchanged", () => {
  const h = harness({ 0: a });
  h.move({ ...a, sourceSlot: 0 }, 0);
  assert.deepEqual(h.answers(), { 0: a });
});

test("duplicate surface words retain separate word-bank identities", () => {
  const h = harness({ 0: a, 2: { ...a, tokenIndex: 4 } });
  h.move({ ...a, sourceSlot: 0 }, "bank");
  assert.deepEqual(h.answers(), { 2: { ...a, tokenIndex: 4 } });
});

test("drop detection finds an owned blank underneath an overlay, including index zero", () => {
  const h = harness();
  h.elements.push({ closest: () => null }, slot(0));
  assert.equal(h.target(), 0);
});

test("another sentence's blank or bank cannot receive this sentence's word", () => {
  const h = harness();
  h.elements.push(slot(2, "other"));
  assert.equal(h.target(), null);
  h.elements.splice(0, 1, { kind: "bank", owner: "other", closest: () => null });
  assert.equal(h.target(), null);
  h.elements.splice(0, 1, { kind: "bank", owner: "current", closest: () => null });
  assert.equal(h.target(), "bank");
});

test("a touch pointer starts dragging even when pointer capture throws", () => {
  const h = harness();
  h.context.startSentenceOrderPointerDrag({ pointerType: "touch", pointerId: 7, clientX: 10, clientY: 20, preventDefault() {}, stopPropagation() {}, currentTarget: { setPointerCapture() { throw new Error("Capture unsupported"); } } }, a, null);
  assert.equal(h.drag()?.token, a.token);
  assert.equal(h.drag()?.sourceSlot, null);
});

test("old touch-only browsers can drag placed words back from a blank", () => {
  const h = harness();
  h.context.window.PointerEvent = undefined;
  assert.equal(typeof h.context.startSentenceOrderTouchDrag, "function");
  h.context.startSentenceOrderTouchDrag({ changedTouches: [{ identifier: 7, clientX: 10, clientY: 20 }], stopPropagation() {} }, a, 2);
  assert.equal(h.drag()?.token, a.token);
  assert.equal(h.drag()?.sourceSlot, 2);
  assert.equal(h.drag()?.input, "touch");
});

test("touch fallback does not duplicate a drag in a pointer-capable browser", () => {
  const h = harness();
  assert.equal(typeof h.context.startSentenceOrderTouchDrag, "function");
  h.context.startSentenceOrderTouchDrag({ changedTouches: [{ identifier: 7, clientX: 10, clientY: 20 }], stopPropagation() {} }, a, null);
  assert.equal(h.drag(), null);
});

test("legacy touch release places the word; a canceled touch leaves it in the bank", () => {
  for (const type of ["touchend", "touchcancel"]) {
    const h = harness();
    h.context.window.PointerEvent = undefined;
    h.context.startSentenceOrderTouchDrag({ changedTouches: [{ identifier: 7, clientX: 10, clientY: 20 }], stopPropagation() {} }, a, null);
    h.context.activeDrag = h.drag();
    h.elements.push(slot(0));
    h.context.handleTouchEnd({ type, changedTouches: [{ identifier: 7, clientX: 10, clientY: 20 }] });
    assert.deepEqual(h.answers(), type === "touchend" ? { 0: a } : {});
    assert.equal(h.drag(), null);
  }
});

test("another finger's release does not finish the active touch drag", () => {
  const h = harness();
  h.context.window.PointerEvent = undefined;
  h.context.startSentenceOrderTouchDrag({ changedTouches: [{ identifier: 7, clientX: 10, clientY: 20 }], stopPropagation() {} }, a, null);
  h.context.activeDrag = h.drag();
  h.elements.push(slot(0));
  h.context.handleTouchEnd({ type: "touchend", changedTouches: [{ identifier: 9, clientX: 10, clientY: 20 }] });
  assert.deepEqual(h.answers(), {});
  assert.equal(h.drag()?.pointerId, 7);
});
