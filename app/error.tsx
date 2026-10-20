"use client";
import {useEffect} from "react";
export default function ErrorPage({error,reset}:{error:Error & {digest?:string};reset:()=>void}){
 useEffect(()=>{console.error("MyLab client error",error);},[error]);
 return <main className="shell"><div className="panel login"><h1>MyLab 화면 오류</h1><p className="muted">화면 데이터를 처리하는 중 문제가 발생했습니다. 새로고침하거나 다시 시도해 주세요.</p><p className="error">{error?.message||"알 수 없는 오류"}</p><button onClick={()=>reset()}>다시 시도</button></div></main>;
}
