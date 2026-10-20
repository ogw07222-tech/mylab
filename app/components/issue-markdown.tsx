import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {markdownUrl} from "@/lib/issue-markdown";

export default function IssueMarkdown({body, repository}: {body: string; repository: string}) {
  return <div className="markdown"><Markdown skipHtml remarkPlugins={[remarkGfm]}
    urlTransform={url => markdownUrl(url, repository)}
    components={{
      a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
      img: ({src, alt}) => <a href={typeof src === "string" ? src : undefined} target="_blank" rel="noopener noreferrer">이미지: {alt || "첨부 이미지 열기"} ↗</a>,
      input: ({checked}) => <input type="checkbox" checked={Boolean(checked)} disabled aria-label={checked ? "완료한 작업" : "미완료 작업"}/>,
      table: ({children}) => <div className="markdown-table" tabIndex={0}><table>{children}</table></div>
    }}>{body}</Markdown></div>;
}
