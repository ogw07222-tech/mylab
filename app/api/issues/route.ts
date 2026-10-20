import {NextRequest,NextResponse} from "next/server";
import {loggedIn} from "@/lib/auth";import {graphql,owner,project} from "@/lib/github";
export const runtime="nodejs";
export async function POST(req:NextRequest){if(!await loggedIn())return NextResponse.json({error:"인증이 필요합니다."},{status:401});try{
 const {repo,title,details}=await req.json();const allow=["noct","chronicle-rpg","vacode","relationship-mathematics","mylab"];if(!allow.includes(repo)||typeof title!=="string"||title.trim().length<3||title.length>150||typeof details!=="string"||details.length>10000)return NextResponse.json({error:"입력 내용을 확인하세요."},{status:400});
 const repoData=await graphql<{repository:{id:string,labels:{nodes:{id:string,name:string}[]}}}>(`query($owner:String!,$name:String!){repository(owner:$owner,name:$name){id labels(first:100){nodes{id name}}}}`,{owner:owner(),name:repo});const repository=repoData.repository;if(!repository)throw new Error("저장소가 없습니다.");
 const check=details.split("\n").map((x:string)=>x.trim()).filter(Boolean).map((x:string)=>"- [ ] "+x.replace(/^- \[[ xX]\] /,"").replace(/^- /,"")).join("\n");
 const label=repository.labels.nodes.find(x=>x.name==="status:idea");const body="## 목표\n"+title.trim()+"\n\n## 세부 작업\n"+(check||"- [ ] 요구사항 정리")+"\n\n## 완료 조건\n- [ ] 기능 및 검증 기준 확정\n";
 const created=await graphql<{createIssue:{issue:{id:string,url:string,number:number}}}>(`mutation($repo:ID!,$title:String!,$body:String!,$labels:[ID!]){createIssue(input:{repositoryId:$repo,title:$title,body:$body,labelIds:$labels}){issue{id url number}}}`,{repo:repository.id,title:title.trim(),body,labels:label?[label.id]:[]});
 const issue=created.createIssue.issue;
 // Link immediately; existing repository Actions may also try to add, which is idempotent.
 let linked=false;try{const p=await project();await graphql(`mutation($p:ID!,$i:ID!){addProjectV2ItemById(input:{projectId:$p,contentId:$i}){item{id}}}`,{p:p.id,i:issue.id});linked=true;}catch(e){console.error("Project link failed",(e as Error).message);}
 return NextResponse.json({...issue,linked});
 }catch(e){return NextResponse.json({error:(e as Error).message},{status:502});}}
