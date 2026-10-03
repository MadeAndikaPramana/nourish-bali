/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_INDEXABLE?: string;
  readonly PUBLIC_CONCEPT?: string;
  readonly SITE_URL?: string;
  readonly ADMIN_PASSWORD?: string;
  readonly SESSION_SECRET?: string;
  readonly GITHUB_TOKEN?: string;
  readonly GITHUB_REPO?: string;
  readonly GITHUB_BRANCH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
