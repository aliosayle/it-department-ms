# IT Department Portal

Internal operations portal scaffold: **Vite**, **React**, **TypeScript**, and **DevExtreme** (see [devextreme-template.md](./devextreme-template.md) for replication notes). Mock JSON drives the first UI slice until APIs are integrated.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — ESLint

## DevExtreme licensing (evaluation vs production)

- **Development / evaluation:** The app sets `config({ licenseKey: 'non-commercial-and-evaluation' })` in [`src/main.tsx`](src/main.tsx). Optional evaluation UI mitigation runs via [`src/utils/hideDevExtremeWatermark.ts`](src/utils/hideDevExtremeWatermark.ts) and [`src/styles/devextreme-license-fix.css`](src/styles/devextreme-license-fix.css). Disable the runtime mitigation with `VITE_ENABLE_EVAL_WATERMARK_MITIGATION=false` (see below); remove the CSS import from `main.tsx` when it is no longer needed.
- **Production:** Purchase a **commercial DevExtreme** license and configure the **official license key** per [DevExpress licensing documentation](https://js.devexpress.com/React/Documentation/Guide/Common/Licensing/). Then remove evaluation-only mitigation (CSS/JS above), set the commercial key in `config()`, and ship only compliant bundles.

## Environment

| Variable | Purpose |
|----------|---------|
| `VITE_ENABLE_EVAL_WATERMARK_MITIGATION` | If `false`, skips the runtime watermark helper in [`src/app/App.tsx`](src/app/App.tsx). Default is on (omit or any value except `false`). |

Example `.env.production` when you are licensed and no longer need the helper:

```env
VITE_ENABLE_EVAL_WATERMARK_MITIGATION=false
```
