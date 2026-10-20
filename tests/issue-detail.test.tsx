import {test} from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import IssueMarkdown from "../app/components/issue-markdown";
import {checklistProgress, markdownUrl} from "../lib/issue-markdown";

test("counts nested GFM tasks and excludes code examples", () => {
  const body = ["- [x] complete", "- [ ] pending", "  - [X] nested", "", "~~~md", "- [x] example", "~~~", "", "    - [ ] indented code"].join("\n");
  assert.deepEqual(checklistProgress(body), {total: 3, completed: 2});
  assert.deepEqual(checklistProgress("No tasks"), {total: 0, completed: 0});
});
test("blocks unsafe URL schemes and resolves repository attachments", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,test", "vbscript:bad", ""]) {
    assert.equal(markdownUrl(url, "owner/repo"), "");
  }
  assert.equal(markdownUrl("./guide.md", "owner/repo"), "https://github.com/owner/repo/blob/HEAD/guide.md");
  assert.equal(markdownUrl("https://github.com/owner/repo/issues/2", "owner/repo"), "https://github.com/owner/repo/issues/2");
});
test("renders read-only GFM tasks, tables and fenced code without executing raw HTML", () => {
  const body = ["# Title", "- [x] complete", "- [ ] pending", "", "| A | B |", "| - | - |", "| one | two |", "", "~~~js", "const x = 1", "~~~", "", '<script>alert("bad")</script>', "", "[unsafe](javascript:alert)", "", "[safe](https://example.com)", "", "![attachment](https://example.com/tracker.png)"].join("\n");
  const html = renderToStaticMarkup(createElement(IssueMarkdown, {body, repository: "owner/repo"}));
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<table>/);
  assert.match(html, /<pre>/);
  assert.equal((html.match(/type="checkbox"/g) || []).length, 2);
  assert.equal((html.match(/disabled=""/g) || []).length, 2);
  assert.doesNotMatch(html, /<script|<img|href="javascript:/i);
  assert.match(html, /rel="noopener noreferrer"/);
});
