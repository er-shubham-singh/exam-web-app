// scripts/test-evaluate-theory.js

import { evaluateTheory } from "../src/Config/ai.theory.config.js";

async function run() {
  const model = "React builds a virtual DOM and when state/props change it diffs the new tree against the previous one to find minimal changes. React uses keys to optimize lists, compares component types, and updates only attributes/children that changed.";
  const student = "React keeps a copy of the DOM in memory called the virtual DOM. When props or state change, React creates a new virtual DOM tree and compares it with the previous version. This process, called reconciliation, identifies only the parts that are different. If two elements are of the same type, React updates their attributes and children; if not, it replaces the node. For lists, React uses keys to track items efficiently. Finally, React applies just those changes to the real DOM, which makes updates faster and more efficient.";

  const res = await evaluateTheory(student, model, 5);
  console.log("evaluateTheory result:", JSON.stringify(res, null, 2));
}
run().catch(e => console.error(e));
