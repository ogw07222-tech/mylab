import {NextRequest,NextResponse} from "next/server";
import {loggedIn} from "@/lib/auth";import {project,graphql} from "@/lib/github";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){if(!await loggedIn())return NextResponse.json({error:"인증이 필요합니다."},{status:401});try{return NextResponse.json(await project(),{headers:{"Cache-Control":"no-store"}});}catch(e){return NextResponse.json({error:(e as Error).message},{status:502});}}
export async function PATCH(req:NextRequest){if(!await loggedIn())return NextResponse.json({error:"인증이 필요합니다."},{status:401});try{
 const {itemId,optionId}=await req.json();if(typeof itemId!=="string"||typeof optionId!=="string")return NextResponse.json({error:"잘못된 요청"},{status:400});
 const p=await project();const field=p.fields.nodes.find((x:any)=>x?.name==="Status");if(!field||!p.items.nodes.some((x:any)=>x.id===itemId)||!field.options.some((x:any)=>x.id===optionId))return NextResponse.json({error:"유효하지 않은 항목/상태"},{status:400});
 await graphql(`mutation($p:ID!,$i:ID!,$f:ID!,$o:String!){updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{singleSelectOptionId:$o}}){projectV2Item{id}}}`,{p:p.id,i:itemId,f:field.id,o:optionId});return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:(e as Error).message},{status:502});}}
