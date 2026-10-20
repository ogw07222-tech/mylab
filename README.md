# MyLab
Private project workspace for `ogw07222-tech` GitHub Projects #4.

## Features
- Read Projects V2 fields and first 100 issue items through GitHub GraphQL.
- Group issues by Status and update Status from the dashboard.
- Create GitHub Issues with task checklists, label `status:idea` if it exists, and add to Projects #4.
- Password-protected dashboard with HMAC-signed HttpOnly SameSite=Strict cookies.
- Client polling every 20 seconds when the page is visible.
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
