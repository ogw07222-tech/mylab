import {NextRequest,NextResponse} from "next/server";
import {loggedIn} from "@/lib/auth";
import {owner} from "@/lib/github";
export const runtime="nodejs";
const headers={"Cache-Control":"no-store"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
async function gh(path:string,method:string,body:unknown){
 const r=await fetch("https://api.github.com"+path,{method,headers:{Authorization:"Bearer "+process.env.GITHUB_TOKEN,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store"});
 const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.message||"GitHub API "+r.status);return data;
}
export async function PATCH(req:NextRequest){return handle(req,"PATCH");}
export async function POST(req:NextRequest){return handle(req,"POST");}
async function handle(req:NextRequest,method:string){
 if(!await loggedIn())return fail("인증이 필요합니다.",401);
 try{
 const input=await req.json();const repo=String(input.repository||"").split("/");
 if(repo.length!==2||repo[0]!==owner()||!/^[a-zA-Z0-9_.-]+$/.test(repo[1]))return fail("저장소 오류",400);
 const number=Number(input.number);if(!Number.isSafeInteger(number)||number<1)return fail("Issue 번호 오류",400);
 const base="/repos/"+repo.map(encodeURIComponent).join("/")+"/issues/"+number;
 if(input.action==="issue"&&method==="PATCH"){
 const data:Record<string,string>={};if(typeof input.title==="string"&&input.title.trim().length>0&&input.title.length<=250)data.title=input.title.trim();
 if(typeof input.body==="string"&&input.body.length<=150000)data.body=input.body;
 if(input.state==="open"||input.state==="closed")data.state=input.state;
 if(!Object.keys(data).length)return fail("변경할 값이 없습니다.",400);
 return NextResponse.json(await gh(base,"PATCH",data),{headers});
 }
 if(input.action==="check"&&method==="PATCH"){
 const line=Number(input.line);const checked=input.checked;
 if(!Number.isInteger(line)||line<0||typeof checked!=="boolean"||typeof input.expectedBody!=="string")return fail("체크리스트 입력 오류",400);
 const before=await gh(base,"GET",undefined);if((before.body||"")!==input.expectedBody)return fail("다른 곳에서 Issue가 수정되었습니다. 새로고침 후 다시 시도하세요.",409);
 const lines=String(before.body||"").split("\n");const match=lines[line]?.match(/^(\s*(?:[-*+]\s+|\d+\.\s+)\[)[ xX](\].*)$/);
 if(!match)return fail("체크리스트 항목을 찾을 수 없습니다.",409);
 lines[line]=match[1]+(checked?"x":" ")+match[2];
 return NextResponse.json(await gh(base,"PATCH",{body:lines.join("\n")}),{headers});
 }
 if(input.action==="comment"&&method==="POST"){
 if(typeof input.body!=="string"||!input.body.trim()||input.body.length>30000)return fail("댓글을 입력하세요.",400);
 return NextResponse.json(await gh(base+"/comments","POST",{body:input.body}),{headers});
 }
 if(input.action==="comment"&&method==="PATCH"){
 const id=Number(input.commentId);if(!Number.isSafeInteger(id)||id<1||typeof input.body!=="string"||!input.body.trim()||input.body.length>30000)return fail("댓글 오류",400);
 return NextResponse.json(await gh("/repos/"+repo.map(encodeURIComponent).join("/")+"/issues/comments/"+id,"PATCH",{body:input.body}),{headers});
 }
 return fail("지원하지 않는 작업",400);
 }catch(e){return fail((e as Error).message,502);}
}
