"use client";
import {useCallback, useEffect, useRef, useState} from "react";
import IssueMarkdown from "./issue-markdown";
import {checklistProgress} from "@/lib/issue-markdown";

type User = {login: string; url: string} | null;
type Detail = {repository: string; number: number; title: string; body: string; state: string; url: string;
  createdAt: string; updatedAt: string; author: User; assignees: User[]; labels: string[];
  milestone: {title: string; url: string} | null; commentCount: number};
type Comment = {id: number; body: string; url: string; createdAt: string; author: User};
type Discussion = {comments: Comment[]; nextPage: number | null};
type Cached = {detail: Detail; discussion?: Discussion};
const date = (value: string) => new Date(value).toLocaleString("ko-KR");
function hashKey() {
  const match = /^#issue=([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)\/([1-9]\d{0,9})$/.exec(window.location.hash);
  return match ? match[1] + "/" + match[2] : "";
}
async function get<T>(key: string, signal: AbortSignal, extra = ""): Promise<T> {
  const at = key.lastIndexOf("/");
  const response = await fetch("/api/issues/detail?repository=" + encodeURIComponent(key.slice(0, at)) + "&number=" + key.slice(at + 1) + extra, {cache: "no-store", signal});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "상세 내용을 가져오지 못했습니다.");
  return data;
}
export default function IssueDetail() {
  const dialog = useRef<HTMLDialogElement>(null);
  const cache = useRef(new Map<string, Cached>());
  const [key, setKey] = useState("");
  useEffect(() => {
    const sync = () => setKey(hashKey());
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);
  const close = useCallback(() => {
    if (window.history.state?.mylabIssue) window.history.back();
    else {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      setKey("");
    }
  }, []);
  useEffect(() => {
    if (!key) return;
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previous?.focus({preventScroll: true});
    };
  }, [key]);
  return <dialog ref={dialog} className="issue-dialog" aria-labelledby="issue-heading"
    onCancel={event => {event.preventDefault(); close();}}>
    {key && <DetailContent key={key} issueKey={key} cache={cache.current} close={close}/>}
  </dialog>;
}
function DetailContent({issueKey, cache, close}: {issueKey: string; cache: Map<string, Cached>; close: () => void}) {
  const [detail, setDetail] = useState<Detail | null>(() => cache.get(issueKey)?.detail || null);
  const [discussion, setDiscussion] = useState<Discussion | undefined>(() => cache.get(issueKey)?.discussion);
  const [loading, setLoading] = useState(!detail);
  const [commentLoading, setCommentLoading] = useState(false);
  const [error, setError] = useState("");
  const [commentError, setCommentError] = useState("");
  const [revision, setRevision] = useState(0);
  const commentRequest = useRef<AbortController | null>(null);
  useEffect(() => () => commentRequest.current?.abort(), []);
  useEffect(() => {
    if (!revision && cache.has(issueKey)) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    get<Detail>(issueKey, controller.signal).then(value => {
      if (controller.signal.aborted) return;
      if (cache.size >= 30) cache.delete(cache.keys().next().value!);
      cache.set(issueKey, {detail: value});
      setDetail(value);
      setDiscussion(undefined);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason.message);
    }).finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  }, [issueKey, cache, revision]);
  function refresh() {
    commentRequest.current?.abort();
    setCommentLoading(false);
    setCommentError("");
    setRevision(value => value + 1);
  }
  async function comments() {
    const controller = new AbortController();
    commentRequest.current?.abort();
    commentRequest.current = controller;
    setCommentLoading(true);
    setCommentError("");
    try {
      const page = discussion?.nextPage || 1;
      const result = await get<Discussion>(issueKey, controller.signal, "&comments=1&page=" + page);
      if (controller.signal.aborted) return;
      const merged = {comments: [...new Map([...(discussion?.comments || []), ...result.comments].map(c => [c.id, c])).values()], nextPage: result.nextPage};
      setDiscussion(merged);
      const current = cache.get(issueKey);
      if (current) cache.set(issueKey, {...current, discussion: merged});
    } catch (reason) {
      if (!controller.signal.aborted) setCommentError((reason as Error).message);
    } finally {if (!controller.signal.aborted) setCommentLoading(false);}
  }
  const progress = checklistProgress(detail?.body || "");
  return <>
    <header className="detail-header">
      <span className="muted tiny">Issue 상세</span>
      <div className="detail-actions"><button className="ghost" onClick={refresh} disabled={loading}>↻ 새로고침</button><button className="ghost" onClick={close} autoFocus>닫기</button></div>
    </header>
    <div className="detail-content" aria-busy={loading}>
      <h1 id="issue-heading">{detail?.title || (loading ? "Issue 불러오는 중…" : "Issue를 열 수 없습니다")}</h1>
      {loading && <p role="status" className="muted">최신 내용을 가져오는 중…</p>}
      {error && <div role="alert"><p className="error">{error}</p><button className="ghost" disabled={loading} onClick={refresh}>다시 시도</button></div>}
      {detail && <>
        <div className="detail-tags"><span className="pill">{detail.state === "open" ? "열림" : "닫힘"}</span><span className="muted">{detail.repository} #{detail.number}</span>{detail.labels.map(label => <span className="pill" key={label}>{label}</span>)}</div>
        <dl className="detail-meta">
          {detail.author && <><dt>작성자</dt><dd><a href={detail.author.url} target="_blank" rel="noopener noreferrer">{detail.author.login}</a></dd></>}
          <dt>생성</dt><dd><time dateTime={detail.createdAt}>{date(detail.createdAt)}</time></dd>
          <dt>수정</dt><dd><time dateTime={detail.updatedAt}>{date(detail.updatedAt)}</time></dd>
          {detail.assignees.length > 0 && <><dt>담당자</dt><dd>{detail.assignees.map(u => u && <a key={u.login} href={u.url} target="_blank" rel="noopener noreferrer">{u.login} </a>)}</dd></>}
          {detail.milestone && <><dt>마일스톤</dt><dd><a href={detail.milestone.url} target="_blank" rel="noopener noreferrer">{detail.milestone.title}</a></dd></>}
        </dl>
        <a href={detail.url} target="_blank" rel="noopener noreferrer">GitHub에서 열기 ↗</a>
        {progress.total > 0 && <section className="checklist-summary" aria-label="체크리스트 진행률"><div className="top"><strong>작업 {progress.completed} / {progress.total}</strong><span className="muted tiny">읽기 전용</span></div><progress max={progress.total} value={progress.completed} aria-label="완료한 작업"/></section>}
        <section className="detail-body" aria-label="Issue 본문">{detail.body ? <IssueMarkdown body={detail.body} repository={detail.repository}/> : <p className="muted">작성된 본문이 없습니다.</p>}</section>
        <section className="detail-comments" aria-label="댓글"><h2>댓글 {detail.commentCount}</h2>
          {discussion?.comments.map(comment => <article className="comment" key={comment.id}><div className="top"><strong>{comment.author?.login || "삭제된 사용자"}</strong><a href={comment.url} target="_blank" rel="noopener noreferrer"><time dateTime={comment.createdAt}>{date(comment.createdAt)}</time> ↗</a></div><IssueMarkdown body={comment.body} repository={detail.repository}/></article>)}
          {discussion && !discussion.comments.length && <p className="muted">댓글이 없습니다.</p>}
          {commentError && <p role="alert" className="error">{commentError}</p>}
          {(!discussion && detail.commentCount > 0 || discussion?.nextPage || commentError) && <button className="ghost" onClick={comments} disabled={commentLoading || loading}>{commentLoading ? "댓글 불러오는 중…" : commentError ? "댓글 다시 시도" : discussion ? "댓글 더 보기" : "댓글 보기"}</button>}
          {detail.commentCount === 0 && !discussion && <p className="muted">댓글이 없습니다.</p>}
        </section>
      </>}
    </div>
  </>;
}
