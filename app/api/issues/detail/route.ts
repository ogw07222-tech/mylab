import {NextRequest, NextResponse} from "next/server";
import {loggedIn} from "@/lib/auth";
import {owner} from "@/lib/github";

export const runtime = "nodejs";
const responseHeaders = {"Cache-Control": "private, no-store"};

export async function GET(req: NextRequest) {
  if (!await loggedIn()) return NextResponse.json({error: "인증이 필요합니다."}, {status: 401, headers: responseHeaders});
  const params = req.nextUrl.searchParams;
  const repository = params.get("repository") || "";
  const number = params.get("number") || "";
  const page = params.get("page") || "1";
  const parts = repository.split("/");
  if (parts.length !== 2 || parts[0].toLowerCase() !== owner().toLowerCase() ||
      !/^[a-zA-Z0-9_.-]+$/.test(parts[1]) ||
      !/^[1-9]\d{0,9}$/.test(number) || !/^[1-9]\d{0,5}$/.test(page)) {
    return NextResponse.json({error: "저장소와 Issue 번호를 확인하세요."}, {status: 400, headers: responseHeaders});
  }
  const comments = params.get("comments") === "1";
  const token = process.env.GITHUB_TOKEN;
  if (!token) return NextResponse.json({error: "GitHub 연결 설정을 확인하세요."}, {status: 503, headers: responseHeaders});
  try {
    const base = "https://api.github.com/repos/" + parts.map(encodeURIComponent).join("/") + "/issues/" + number;
    const res = await fetch(base + (comments ? "/comments?per_page=30&page=" + page : ""), {
      headers: {Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"},
      cache: "no-store", signal: AbortSignal.timeout(20000)
    });
    if (!res.ok) {
      const limited = res.status === 429 || (res.status === 403 && (res.headers.get("x-ratelimit-remaining") === "0" || res.headers.has("retry-after")));
      const status = limited ? 429 : [403, 404].includes(res.status) ? res.status : 502;
      const error = limited ? "GitHub API 호출 한도에 도달했습니다. 잠시 후 다시 시도하세요." :
        res.status === 404 ? "Issue가 없거나 이 저장소를 읽을 권한이 없습니다." :
        res.status === 403 ? "이 Issue를 읽을 권한이 없습니다." : "GitHub 연결에 실패했습니다. 다시 시도하세요.";
      return NextResponse.json({error}, {status, headers: responseHeaders});
    }
    const data = await res.json();
    const user = (value: {login: string; html_url: string} | null) => value ? {login: value.login, url: value.html_url} : null;
    if (comments) {
      return NextResponse.json({
        comments: data.map((c: {id: number; body: string; html_url: string; created_at: string; user: {login: string; html_url: string} | null}) =>
          ({id: c.id, body: c.body || "", url: c.html_url, createdAt: c.created_at, author: user(c.user)})),
        nextPage: /rel="next"/.test(res.headers.get("link") || "") ? Number(page) + 1 : null
      }, {headers: responseHeaders});
    }
    if (data.pull_request) return NextResponse.json({error: "이 항목은 Issue가 아닌 Pull Request입니다."}, {status: 404, headers: responseHeaders});
    return NextResponse.json({
      repository, number: data.number, title: data.title, body: data.body || "", state: data.state,
      url: data.html_url, createdAt: data.created_at, updatedAt: data.updated_at,
      author: user(data.user), assignees: (data.assignees || []).map(user),
      labels: (data.labels || []).map((l: string | {name: string}) => typeof l === "string" ? l : l.name),
      milestone: data.milestone ? {title: data.milestone.title, url: data.milestone.html_url} : null,
      commentCount: data.comments
    }, {headers: responseHeaders});
  } catch {
    return NextResponse.json({error: "GitHub 응답을 받지 못했습니다. 다시 시도하세요."}, {status: 502, headers: responseHeaders});
  }
}
