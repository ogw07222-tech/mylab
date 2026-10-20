# MyLab
Private project workspace for `ogw07222-tech` GitHub Projects #4.

## Features
- Read Projects V2 fields and first 100 issue items through GitHub GraphQL.
- Group issues by Status and update Status from the dashboard.
- Create GitHub Issues with task checklists, label `status:idea` if it exists, and add to Projects #4.
- Password-protected dashboard with HMAC-signed HttpOnly SameSite=Strict cookies.
- Manual refresh only; no client polling.
- Open Issue cards inside the app: Markdown, read-only tasks/progress, metadata and opt-in paginated comments.
- Issue deep links use #issue=owner/repository/number. Browser Back and Escape close the dialog and preserve the board.
- Details are cached in memory for up to 30 issues during the signed-in session; use the detail refresh button for current content.
- Raw HTML is ignored, unsafe URL schemes are blocked, and attachment images open as links without loading remote trackers.
- No model calls or model usage charges in this first release.

## Deploy
1. Import the `ogw07222-tech/mylab` repository into Vercel as Next.js.
2. Configure **server-only** environment variables:
   - `GITHUB_TOKEN`: classic PAT with `repo` and `project` scopes, or token permitting user Projects V2 and repository issue writes.
   - `MYLAB_PASSWORD`: strong unique personal login password.
   - `MYLAB_SESSION_SECRET`: random secret of at least 32 bytes.
   - `GITHUB_OWNER=ogw07222-tech`
   - `GITHUB_PROJECT_NUMBER=4`
3. Redeploy and log in.
4. `PROJECTS_TOKEN` saved in **GitHub Actions Secrets is not automatically available to the Vercel runtime**; set `GITHUB_TOKEN` separately in Vercel. Never put tokens in NEXT_PUBLIC variables or committed files.

## Limitations & security
- Project listing currently loads **first 100 items**. It signals when more pages exist.
- Status options must already exist in GitHub Projects. Changes require refresh to reconcile.
- Issue checklist is entered line-by-line; AI generation is a planned feature, not implemented.
- The repository may be public, but web dashboard access is blocked by server password. For stronger protection use provider authentication or Vercel Deployment Protection.
- Session cookie is signed, not encrypted; contains only an expiry and signature.
- The token grants powerful access: use a dedicated least-privilege credential when GitHub supports it. Rotate if exposed.
- Runtime secrets are never returned from API routes.
- For a private personal deployment, protect deployment preview URLs too.

## Done item cleanup
- Vercel Cron calls `/api/cron/cleanup-done` once per day at 03:00 UTC (12:00 KST).
- Add a `CRON_SECRET` server environment variable in Vercel (long random value). Without this secret, cleanup is disabled with HTTP 401.
- Completed items are **removed only from Projects #4**, not deleted from their GitHub repositories.
- Uses the Project item `updatedAt` timestamp: an item with status Done and **no project-item edits for at least five days** is removed. This is a conservative proxy for completion time; modifying an item after completion restarts the inactivity interval.
- Protect the endpoint using `CRON_SECRET`, never disclose it or put it in source control.
- GitHub Actions may re-add removed issues later if their issue labels change; consider removing the `status:in-progress`/`status:idea` label when marking them Done and avoid future triggers for archived items.
