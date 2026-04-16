/** DevExtreme evaluation key — replace with commercial config before production. */
export const DEVEXTREME_LICENSE_KEY = 'non-commercial-and-evaluation' as const

/**
 * When false, skip eval watermark CSS/JS (use after configuring a commercial license key).
 * Set via `VITE_ENABLE_EVAL_WATERMARK_MITIGATION=false` in `.env.production` when ready.
 */
export const enableEvalWatermarkMitigation = () =>
  import.meta.env.VITE_ENABLE_EVAL_WATERMARK_MITIGATION !== 'false'
