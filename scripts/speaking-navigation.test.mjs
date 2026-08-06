import assert from "node:assert/strict";
import test from "node:test";
import { findSpeakingPartForItem } from "../src/lib/ielts/speaking-navigation.ts";

const parts = [
  { id: "part-1", label: "Part 1" },
  { id: "part-2", label: "Part 2" },
  { id: "part-3", label: "Part 3" },
];

test("speaking cards resolve by identity instead of their rendered order", () => {
  const reorderedItems = [
    { id: "speaking-part-3", href: "/speaking/part-3", title: "Part 3" },
    { id: "speaking-part-1", href: "/speaking/part-1", title: "Part 1" },
  ];

  assert.equal(findSpeakingPartForItem(reorderedItems[0], parts)?.id, "part-3");
  assert.equal(findSpeakingPartForItem(reorderedItems[1], parts)?.id, "part-1");
});
