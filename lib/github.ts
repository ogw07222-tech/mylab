const endpoint="https://api.github.com/graphql";
export async function graphql<T>(query:string,variables:Record<string,unknown>={}):Promise<T>{
 const token=process.env.GITHUB_TOKEN;if(!token)throw new Error("GITHUB_TOKEN 환경변수가 필요합니다.");
 const r=await fetch(endpoint,{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json","Accept":"application/vnd.github+json"},body:JSON.stringify({query,variables}),cache:"no-store"});
 const json=await r.json();if(!r.ok||json.errors)throw new Error(json.errors?.map((x:{message:string})=>x.message).join("; ")||"GitHub API "+r.status);return json.data as T;
}
export const owner=()=>process.env.GITHUB_OWNER||"ogw07222-tech";
export const projectNumber=()=>Number(process.env.GITHUB_PROJECT_NUMBER||4);
export const fieldFragment=`... on ProjectV2SingleSelectField { id name options {id name} }`;
export async function project() {
 const q=`query($owner:String!,$number:Int!){user(login:$owner){projectV2(number:$number){
  id title fields(first:100){nodes{ ${fieldFragment} }}
  items(first:100){pageInfo{hasNextPage endCursor} nodes{id content{... on Issue{id number title url state body repository{nameWithOwner} labels(first:25){nodes{name}}} ... on PullRequest {title url}} fieldValues(first:15){nodes{... on ProjectV2ItemFieldSingleSelectValue{name field{... on ProjectV2SingleSelectField{name}}}}}}}
 }}}`;
 const d=await graphql<{user:{projectV2:any}}>(q,{owner:owner(),number:projectNumber()});
 if(!d.user?.projectV2)throw new Error("Projects 보드를 찾을 수 없습니다.");return d.user.projectV2;
}
