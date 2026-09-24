# Put Hearth on GitHub Pages

The upload bundle contains the app source and an automatic GitHub Pages deployment workflow. Supabase remains the account and encrypted-data backend. No Supabase secret/service-role key is needed in GitHub.

**Use Pages for testing.** GitHub advises against using Pages for sensitive transactions such as sending passwords. For real family passwords, keep the source in GitHub and deploy to an appropriate application host instead. See https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https.

## 1. Upload the source

1. Extract `hearth-github-upload.zip` on your computer.
2. Open your GitHub repository. An empty repository is easiest; do not overwrite an unrelated existing app.
3. Choose **Add file → Upload files**.
4. Drag all files and folders **inside the extracted folder** into GitHub, including `.github` and `.gitignore`. `package.json`, `index.html`, and `.github` must be at the repository root, not inside another `family-vault` folder.
5. Commit the upload to the **main** branch. If your branch has another name, change `branches: [main]` in `.github/workflows/pages.yml` to match.

Uploading the ZIP file itself will not work: upload its extracted contents. The bundle deliberately excludes dependencies, build output, local Git history, hosting credentials and private runtime state.

## 2. Enable the website

1. In your repository, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Open **Actions → Publish Hearth website → Run workflow**. Choose `main` and run it. The first upload may have triggered a failed build before Pages was enabled; rerun after enabling it.
4. Wait for both **build** and **deploy** to turn green.
5. Open the website link shown in the deploy job or **Settings → Pages**. It will normally look like `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

Future pushes to `main` redeploy automatically. The workflow detects the actual repository path, including account-root sites and custom domains. Do not rename the `github-pages` environment without updating the workflow and Pages settings.

GitHub Free supports Pages from public repositories. Private-repository Pages requires a supporting paid plan. A private source repository does not by itself make the published Pages website private. See https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages.

## 3. Update Supabase links

Your existing project and encrypted-vault table are reused. **Do not rerun setup.sql if the table already exists.**

In Supabase, go to **Authentication → URL Configuration**:

- Set **Site URL** to the exact new website URL, including its repository path and trailing slash.
- Add the same URL followed by `**` to **Redirect URLs**, for example `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/**`.
- You can keep the previous hosted app URL in Redirect URLs if you still use it.

Keep email confirmation enabled. For confirmation and reset emails to family members, configure **custom SMTP**; Supabase's default mail service is restricted and intended for testing. See https://supabase.com/docs/guides/auth/auth-smtp.

The existing Supabase project URL and **public publishable key** are in `lib/supabase.ts`. They are designed to be visible to browsers. Access must remain enforced by the SQL row-level security policies. Never replace the publishable key with a secret or service-role key.

## 4. Try it

Open the website and choose **Take a look with demo data**, or test account creation and encrypted syncing with disposable passwords. Every person creates a separate account and a separate vault passphrase. A forgotten vault passphrase cannot be recovered by email.

On iPhone, open the website in **Safari → Share → Add to Home Screen**. This is a web app; it has no native password AutoFill or Face ID integration.

## Run locally

Use Node.js 24. Run `npm ci`, then `npm run dev:pages`.

- `npm run build:pages` builds the static site to `pages-dist/`.
- `npm run preview:pages` previews that build locally.
- Set `PAGES_BASE_PATH=/repository-name` when building locally to test a repository subpath. The GitHub workflow supplies this automatically.
- `node --experimental-strip-types --test scripts/crypto.test.mjs` checks encryption and generation.

## Verification limits

The build and crypto tests have been run locally. The workflow can only be verified on GitHub after upload. Before using any real passwords, account confirmation/reset, two-account database isolation, cross-device sync and locking on actual iPhones still need end-to-end verification. This initial implementation has not had an independent security audit.
