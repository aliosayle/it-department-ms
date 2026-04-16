/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_EVAL_WATERMARK_MITIGATION?: string
  /** When set (e.g. `http://localhost:4000/api/v1`), mutations POST to the REST API instead of the mock store. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
