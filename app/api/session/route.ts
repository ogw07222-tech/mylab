import {NextRequest,NextResponse} from "next/server";
import {configured,validPassword,loggedIn,startSession,endSession} from "@/lib/auth";
export const runtime="nodejs";
export async function GET(){return NextResponse.json({configured:configured(),authenticated:await loggedIn()},{headers:{"Cache-Control":"no-store"}});}
export async function POST(req:NextRequest){if(!configured())return NextResponse.json({error:"먼저 서버 환경변수를 설정하세요."},{status:503});const {password}=await req.json();if(typeof password!=="string"||!validPassword(password))return NextResponse.json({error:"비밀번호가 올바르지 않습니다."},{status:401});await startSession();return NextResponse.json({ok:true});}
export async function DELETE(){await endSession();return NextResponse.json({ok:true});}
