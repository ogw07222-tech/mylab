import {unified} from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import {defaultUrlTransform} from "react-markdown";

const parser = unified().use(remarkParse).use(remarkGfm);
type Node = {type: string; checked?: boolean | null; children?: Node[]};

export function checklistProgress(body: string) {
  let total = 0, completed = 0;
  function visit(node: Node) {
    if (node.type === "listItem" && typeof node.checked === "boolean") {
      total++;
      if (node.checked) completed++;
    }
    node.children?.forEach(visit);
  }
  visit(parser.parse(body) as Node);
  return {total, completed};
}

export function markdownUrl(url: string, repository: string) {
  if (!url || !defaultUrlTransform(url)) return "";
  try {
    const resolved = new URL(url, "https://github.com/" + repository + "/blob/HEAD/");
    return ["https:", "http:", "mailto:"].includes(resolved.protocol) ? resolved.href : "";
  } catch { return ""; }
}
