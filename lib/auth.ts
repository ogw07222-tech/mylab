import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
const cookieName="mylab_session";
const secret=()=>process.env.MYLAB_SESSION_SECRET || "";
export function configured(){return Boolean(process.env.MYLAB_PASSWORD && secret() && process.env.GITHUB_TOKEN);}
function signature(value:string){return createHmac("sha256",secret()).update(value).digest("hex");}
export function validPassword(input:string){const expected=process.env.MYLAB_PASSWORD||"";const a=Buffer.from(input),b=Buffer.from(expected);return Boolean(expected)&&a.length===b.length&&timingSafeEqual(a,b);}
export async function loggedIn(){if(!configured())return false;const token=(await cookies()).get(cookieName)?.value||"";const [expiry,sig]=token.split(".");if(!expiry||!sig||!/^\d+$/.test(expiry)||Number(expiry)<Date.now())return false;const expected=Buffer.from(signature(expiry)),got=Buffer.from(sig);return expected.length===got.length&&timingSafeEqual(expected,got);}
export async function startSession(){const expiry=String(Date.now()+7*24*3600*1000);(await cookies()).set(cookieName,expiry+"."+signature(expiry),{httpOnly:true,sameSite:"strict",secure:process.env.NODE_ENV==="production",path:"/",maxAge:604800});}
export async function endSession(){(await cookies()).delete(cookieName);}
