// PreToolUse hook: ask before Claude edits anything under the skill's references/ folder.
// Those files hold event facts and judging lenses that should only change on purpose.
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let input = {};
  try {
    input = JSON.parse(raw || "{}");
  } catch {
    process.exit(0);
  }
  const ti = input.tool_input || {};
  const target = String(ti.file_path || ti.notebook_path || "").replace(/\\/g, "/");
  if (/\/sciences-po-hack-coach\/references\//i.test(target)) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "ask",
          permissionDecisionReason:
            "This file is in references/ (event facts, judging lenses, templates). Confirm you want it changed.",
        },
      })
    );
  }
  process.exit(0);
});
