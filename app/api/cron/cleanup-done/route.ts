import { NextRequest, NextResponse } from "next/server";
import { graphql, owner, projectNumber } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;
const doneNames = new Set(["done", "완료"]);
type ProjectItem = {
  id: string;
  updatedAt: string;
  fieldValues: { nodes: Array<{ name?: string; field?: { name?: string } } | null> };
};
type Page = { user: { projectV2: { id: string; items: { nodes: ProjectItem[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } | null } | null };

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    let cursor: string | null = null;
    let projectId = "";
    let inspected = 0;
    const removed: string[] = [];
    const cutoff = Date.now() - FIVE_DAYS;
    do {
      const data: Page = await graphql<Page>(`query($owner:String!,$number:Int!,$after:String) {
        user(login:$owner) { projectV2(number:$number) {
          id
          items(first:100, after:$after) {
            nodes { id updatedAt fieldValues(first:30) {
              nodes { ... on ProjectV2ItemFieldSingleSelectValue {
                name field { ... on ProjectV2SingleSelectField { name } }
              }}
            }}
            pageInfo { hasNextPage endCursor }
          }
        }}
      }`, { owner: owner(), number: projectNumber(), after: cursor });
      const p: NonNullable<NonNullable<Page["user"]>["projectV2"]> | undefined = data.user?.projectV2 ?? undefined;
      if (!p) throw new Error("Project not found");
      projectId = p.id;
      const page = p.items;
      inspected += page.nodes.length;
      for (const item of page.nodes) {
        const status = item.fieldValues?.nodes?.find(x => x?.field?.name?.toLowerCase() === "status")?.name?.toLowerCase();
        const modified = Date.parse(item.updatedAt);
        if (!doneNames.has(status ?? "") || !Number.isFinite(modified) || modified > cutoff) continue;
        await graphql(`mutation($project:ID!,$item:ID!) {
          deleteProjectV2Item(input:{projectId:$project,itemId:$item}) { deletedItemId }
        }`, { project: projectId, item: item.id });
        removed.push(item.id);
      }
      cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    } while (cursor);
    return NextResponse.json({ inspected, removed: removed.length, project: projectNumber() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("MyLab done cleanup failed", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
