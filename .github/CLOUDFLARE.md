# Cloudflare Pages deploy

The workflows send the web Storybook and the pull request reports to Cloudflare
Pages. `deploy-storybook.yaml` sends the Storybook. `visual-review.yaml` sends
each report.

## Setup

Do these steps one time.

1. Make the Pages project:

   ```
   npx wrangler pages project create zingo-visual --production-branch=production
   ```

2. Get the account ID from the Cloudflare dashboard. Or run `npx wrangler whoami`.

3. Make an API token. Give the token the `Cloudflare Pages: Edit` permission.

4. Add two secrets to the GitHub repository:

   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

## Links

- The `dev` build: `https://zingo-visual.pages.dev`
- Each pull request: `https://pr-<number>.zingo-visual.pages.dev`

## Notes

- Keep the token secret. Do not put the token in a file.
- A fork pull request cannot read the secrets. The deploy step stops, but you
  still get the report as an artifact.
- When a pull request closes, a workflow deletes all its preview deployments.
- To make the pages private, use Cloudflare Access.
