const fromEnv = import.meta.env.VITE_DEVEXTREME_LICENSE_KEY?.trim()

/** DevExtreme license: commercial key from env, otherwise evaluation key (see README). */
export const DEVEXTREME_LICENSE_KEY = (fromEnv && fromEnv.length > 0 ? fromEnv : 'non-commercial-and-evaluation') as string

/**
 * When false, skip eval watermark CSS/JS (use after configuring a commercial license key).
 * Set via `VITE_ENABLE_EVAL_WATERMARK_MITIGATION=false` in `.env.production` when ready.
 */
export const enableEvalWatermarkMitigation = () =>
  import.meta.env.VITE_ENABLE_EVAL_WATERMARK_MITIGATION !== 'false'
