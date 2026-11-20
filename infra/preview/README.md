# PR previews (S3 + CloudFront)

`.github/workflows/preview.yml` builds every PR (except drafts and PRs from forks) and uploads `dist/` to `s3://<bucket>/pr-<N>/`. CloudFront then serves it at `https://pr-<N>.<preview-domain>`, and the URL is posted to the PR. When the PR closes, the workflow deletes the prefix, marks the PR's GitHub deployments inactive and updates the comment.

The workflow does nothing until the `PREVIEW_BUCKET` repo variable is set.

## How it works

```
https://pr-42.<preview-domain>/app/threads/abc
      │  DNS: *.<preview-domain> → CloudFront distribution
      ▼
CloudFront (HTTPS via a *.<preview-domain> ACM certificate)
      │  viewer-request function (cloudfront-function.js):
      │    host pr-42.… + /app/threads/abc → /pr-42/_spa.html
      ▼
S3 bucket (private; only this distribution can read it, via Origin Access Control)
      pr-42/index.html, pr-42/amazonia.html, pr-42/_spa.html, pr-42/assets/…
```

The function mirrors the rewrites in `vercel.json`:

- A path with a file extension is served as-is.
- `/` → `index.html` and `/amazonia` → `amazonia.html`. Both are prerendered by `scripts/prerender.mjs`.
- Any other route → `_spa.html`, the SPA shell.

**If you add a prerendered page to `scripts/prerender.mjs`, also add it to `PRERENDERED` in the function** and republish the function.

Why subdomains and not `/pr-42/` paths? The app assumes it is served from the domain root:

- `vite.config.ts` has no `base`.
- The router has no `basename`.
- Assets in `public/` are referenced by absolute paths.
- The auth callback is `${origin}/auth/callback`.

Caching: the workflow uploads HTML and other non-hashed files with `Cache-Control: no-cache`, and `assets/*` as immutable. New pushes therefore show up without a CloudFront invalidation.

## AWS setup (one-time, in the console)

You need a Route 53 hosted zone where you can add records. Pick a preview domain under it, e.g. `gnw-preview.example.org`. There is nothing to create for the preview domain itself; the records in steps 1 and 7 go into the existing hosted zone.

Use **us-east-1** throughout. CloudFront only accepts certificates from that region.

### 1. Certificate (ACM)

1. **Certificate Manager → Request → Request a public certificate.**
2. **Domain:** `*.<preview-domain>`. **Validation:** DNS. **Key algorithm:** RSA 2048. **Allow export:** Disable export.
3. On the certificate's page, click **Create records in Route 53** to add the validation CNAME.
4. Wait for the status to change to **Issued**, usually 5–10 minutes. You can do steps 2 and 3 meanwhile.

### 2. S3 bucket

1. **S3 → Create bucket**, general purpose, e.g. `gnw-pr-previews`.
   - ACLs disabled.
   - **Block all public access** on.
   - Versioning off.
   - Default encryption.
2. **Management → Create lifecycle rule** `expire-previews`, applying to all objects:
   - Expire current versions after **30 days**. This is a safety net for a cleanup job that fails.
   - Delete incomplete multipart uploads after **1 day**.

There is no need to write a bucket policy; CloudFront writes it in step 4.

### 3. CloudFront Function

1. **CloudFront → Functions → Create function.** Name it `gnw-preview-router`, with runtime `cloudfront-js-2.0`.
2. Paste in [`cloudfront-function.js`](./cloudfront-function.js) and click **Save changes**.
3. Optional: on the **Test** tab, check that a Viewer Request for `/app/threads/abc` with header `host: pr-12.<preview-domain>` returns `"uri": "/pr-12/_spa.html"`.
4. On the **Publish** tab, click **Publish function**. Unpublished functions can't be attached to a distribution.

### 4. CloudFront distribution

**CloudFront → Distributions → Create distribution.** Go through the wizard:

1. **Plan:** Pay as you go.
2. **Name:** e.g. `gnw-pr-previews`. **Type:** single website or app.
3. **Domain:** leave **Route 53 managed domain** empty. That field issues its own single-name certificate; we attach the wildcard in step 6.
4. **Origin:** Amazon S3, using the bucket's REST endpoint (`<bucket>.s3.us-east-1.amazonaws.com`), not a website endpoint. Leave the origin path empty.
5. **Settings:**
   - Tick **Allow private S3 bucket access to CloudFront**. This creates the Origin Access Control and writes the bucket policy.
   - Use the recommended origin settings.
   - Use the recommended cache settings for S3. That gives `CachingOptimized`, redirect HTTP to HTTPS, compression on, and GET/HEAD only.
6. **WAF:** Do not enable security protections. The site is static files in a private bucket, and WAF costs extra.
7. **Create distribution.**

Note the **distribution ID** (`E…`) and **domain name** (`dxxxx.cloudfront.net`).

### 5. Attach the function

The wizard doesn't offer this, so do it afterwards:

1. On the distribution's **Behaviors** tab, select `Default (*)` and click **Edit**.
2. Under **Function associations → Viewer request**, set the function type to **CloudFront Functions** and pick `gnw-preview-router`.
3. Leave the other three function associations empty and save.

To check it: the function's page should list the distribution with event type `viewer-request`.

### 6. Attach the domain and certificate

1. On the distribution's **General** tab, under **Settings**, click **Edit**.
2. **Alternate domain name:** add `*.<preview-domain>`.
3. **Custom SSL certificate:** choose the certificate from step 1.
4. Leave **Default root object** empty, because the function handles `/`. Save.

### 7. Wildcard DNS record

In **Route 53 → the hosted zone → Create record**:

- **Name:** `*.<preview subdomain>`, e.g. `*.gnw-preview`.
- **Type:** A. Turn **Alias** on, then choose **Alias to CloudFront distribution** and pick the distribution.
  - The distribution only appears in the list once step 6 is saved. You can also paste `dxxxx.cloudfront.net` into the box.
- **Routing policy:** Simple.
- Optional: add the same record again with type **AAAA**, for IPv6.

### 8. Smoke test

1. Upload a file `pr-0/index.html` containing `hello pr-0` to the bucket.
2. Check these URLs, then delete `pr-0/`:

| URL                                 | Expected                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `https://pr-0.<preview-domain>/`    | 200, `hello pr-0`                                                             |
| `https://pr-0.<preview-domain>/x/y` | 403 AccessDenied (routed to `pr-0/_spa.html`, which the test doesn't include) |
| `https://dxxxx.cloudfront.net/`     | 404 from the function (no `pr-` subdomain)                                    |

### 9. GitHub OIDC provider

This lets the workflow get short-lived AWS credentials, so no access keys are stored in GitHub.

**IAM → Identity providers.** If `token.actions.githubusercontent.com` is already there, check that its audiences include `sts.amazonaws.com` and skip this step. Otherwise:

1. Click **Add provider** and choose **OpenID Connect**.
2. **Provider URL:** `https://token.actions.githubusercontent.com`. **Audience:** `sts.amazonaws.com`.

### 10. IAM role for the workflow

1. **IAM → Roles → Create role.** For **Select trusted entity**, choose **Custom trust policy** and paste the policy below.
2. **Add permissions:** select nothing. Do not use a managed S3 policy; those grant access to every bucket.
3. **Name:** e.g. `gh-project-zeno-next-preview`.
4. After creating the role, go to **Permissions → Add permissions → Create inline policy → JSON**. Paste the permissions policy below and name it `gnw-pr-previews-write`.

The trust policy must allow two OIDC subjects:

- The deploy job declares a per-PR GitHub `environment` (which gives the PR its "View deployment" button), so its subject is `repo:wri/project-zeno-next:environment:pr-<N>-preview`.
- The cleanup job has no environment, so its subject is `repo:wri/project-zeno-next:pull_request`.

The console warns about the `*` in the subject. It is safe here: the repository is fixed, the `*` only matches the PR number, and the role can only write to `pr-*` in one bucket.

Trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:wri/project-zeno-next:pull_request",
            "repo:wri/project-zeno-next:environment:pr-*-preview"
          ]
        }
      }
    }
  ]
}
```

Permissions policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListPreviewPrefixes",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::<bucket>",
      "Condition": { "StringLike": { "s3:prefix": ["pr-*"] } }
    },
    {
      "Sid": "WritePreviewObjects",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::<bucket>/pr-*"
    }
  ]
}
```

The role needs no CloudFront permissions, because the cache headers make invalidations unnecessary.

## GitHub repo settings

These go under **Settings → Secrets and variables → Actions** and need repo admin rights.

| Kind     | Name                                                                     | Example                                                       |
| -------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Variable | `AWS_PREVIEW_ROLE_ARN`                                                   | `arn:aws:iam::<account-id>:role/gh-project-zeno-next-preview` |
| Variable | `AWS_REGION`                                                             | `us-east-1`                                                   |
| Variable | `PREVIEW_BUCKET`                                                         | `gnw-pr-previews` (setting this turns the workflow on)        |
| Variable | `PREVIEW_DOMAIN`                                                         | `gnw-preview.example.org` (without `*.` or `https://`)        |
| Secret   | `PREVIEW_MAPBOX_ACCESS_TOKEN`                                            | `pk.…`                                                        |
| Variable | `PREVIEW_API_HOST` (optional)                                            | defaults to staging (`app/config/api.ts`)                     |
| Variable | `PREVIEW_LANDING_PAGE_VERSION` (optional)                                | `public`                                                      |
| Variable | `PREVIEW_ENABLE_DEBUG_TOOLS` (optional)                                  | `true`                                                        |
| Variable | `PREVIEW_RW_API_URL`, `PREVIEW_ANALYTICS_API_HOST`, `PREVIEW_EOAPI_HOST` | optional overrides; empty values use the app defaults         |

## Outside AWS

These let the preview talk to the backends and log in:

- **Backend CORS:** the staging API, the analytics API and eoAPI must allow the origin `https://*.<preview-domain>`.
- **Login:** the RW API must accept `callbackUrl=https://pr-<N>.<preview-domain>/auth/callback`.
- **Mapbox:** if the token has URL restrictions, add `*.<preview-domain>`.

## Troubleshooting

| Symptom                                                   | Likely cause                                                                      |
| --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Workflow jobs are skipped                                 | `PREVIEW_BUCKET` is unset, the PR is a draft, or it comes from a fork             |
| `Not authorized to perform sts:AssumeRoleWithWebIdentity` | The trust policy's `sub` patterns or repository name don't match                  |
| `AccessDenied` during `aws s3 sync`                       | The role's inline policy is missing, or names the wrong bucket                    |
| 403 AccessDenied XML on `/`                               | The file isn't in the bucket, or the bucket policy doesn't name this distribution |
| 404 on every page                                         | The function isn't attached on viewer request (step 5), or isn't published        |
| Certificate or SSL error                                  | The alternate domain or certificate isn't set (step 6), or it's still deploying   |
| Distribution missing from the Route 53 alias list         | The alternate domain isn't saved yet (step 6)                                     |
| Page loads but API calls or login fail                    | CORS or the login callback allowlist (see "Outside AWS")                          |

## Teardown

Use this to retire previews, or to move them to another AWS account. When moving, set up the new account first (steps 1–10), point the repo variables at it, check that a PR deploys, and only then tear down the old one.

The order matters: several resources can't be deleted while something still uses them.

1. **Stop the workflow.** Delete the `PREVIEW_BUCKET` repo variable. Both jobs then skip, so nothing writes to the bucket while you work. To remove previews entirely, also delete `.github/workflows/preview.yml`, the other preview variables and the `PREVIEW_MAPBOX_ACCESS_TOKEN` secret.
2. **Remove the DNS records.** In Route 53, delete the `*.<preview subdomain>` A record, and the AAAA record if there is one. Leave the ACM validation CNAME for step 7.
3. **Disable the distribution.** In **CloudFront → Distributions**, select it and click **Disable**. Wait until **Last modified** shows a date instead of "Deploying".
4. **Delete the distribution.**
5. **Delete the function.** In **CloudFront → Functions**, delete `gnw-preview-router`. This only works once no distribution uses it.
6. **Delete the origin access control.** In **CloudFront → Origin access**, delete the OAC the wizard created. It's named after the bucket.
7. **Delete the certificate.** In **Certificate Manager (us-east-1)**, delete the `*.<preview-domain>` certificate. This only works once no distribution uses it. Then delete its `_….<preview-domain>` validation CNAME from Route 53.
8. **Empty and delete the bucket.** In **S3**, select the bucket, click **Empty**, then **Delete**.
9. **Delete the IAM role.** In **IAM → Roles**, delete `gh-project-zeno-next-preview`. Its inline policy goes with it.
10. **Leave the GitHub OIDC provider, unless you're sure.** `token.actions.githubusercontent.com` is shared by every GitHub repo that logs in to this account. Only delete it if no other role's trust relationship mentions it.

Outside AWS:

- **GitHub environments.** Each PR leaves an inactive `pr-<N>-preview` environment. A repo admin can delete them under **Settings → Environments**, or with:
  ```bash
  gh api repos/wri/project-zeno-next/environments --paginate \
    --jq '.environments[].name | select(test("^pr-[0-9]+-preview$"))' |
    xargs -I{} gh api -X DELETE repos/wri/project-zeno-next/environments/{}
  ```
- **Allowlists.** Ask for `*.<preview-domain>` to be removed from the backend CORS settings, the RW API login callback allowlist and the Mapbox token's URL restrictions.

### Inventory

Everything this setup creates, for an account handover:

| Where           | Resource                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| S3              | bucket `gnw-pr-previews`, with its lifecycle rule and the bucket policy CloudFront wrote                                 |
| CloudFront      | the distribution, function `gnw-preview-router`, the origin access control                                               |
| ACM (us-east-1) | certificate `*.<preview-domain>`                                                                                         |
| Route 53        | the `*.<preview subdomain>` A (and AAAA) record, the certificate's validation CNAME                                      |
| IAM             | role `gh-project-zeno-next-preview` with inline policy `gnw-pr-previews-write`; the GitHub OIDC provider (may be shared) |
| GitHub          | the preview repo variables, the Mapbox secret, the `pr-<N>-preview` environments                                         |
