import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {title:"MyLab — Developer Workspace",description:"Private GitHub project workspace"};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="ko"><body>{children}</body></html>}
