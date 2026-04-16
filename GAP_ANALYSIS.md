# GAP Analysis (Production Readiness)

## Scope audited
- Backend API (`backend/src/app.ts`, tx writers, bootstrap/auth)
- DB schema (`docs/database/schema-mariadb.sql`)
- Frontend routes/pages for stock, purchases, assignments, users

## Findings before changes
1. **Role-based access missing**
   - Only `user_page_permissions` existed (direct user grants).
   - No reusable roles, no user-role mapping, no override layer.
2. **No effective permission resolution model**
   - Auth resolved from a single table, defaulting to full access when empty.
   - No formal precedence for role + direct + override.
3. **No assignment review workflow / uploads**
   - Assignments existed, but no task/review entity.
   - No attachment upload endpoint, no file validation policy.
4. **Validation/transaction gaps**
   - Numeric validation inconsistently enforced for quantities/prices.
   - Workflows lacked audit-friendly review records.
5. **Frontend admin gaps**
   - User permissions page existed, but no role administration UX.
   - No user role mapping UI.
   - No task review/upload page.
6. **Automated verification gaps**
   - Smoke covered health/login/bootstrap only.
   - No focused permission resolution tests.

## Implemented to close gaps
- Added RBAC schema and effective permission repository.
- Added task/review/attachments schema and API workflow.
- Added strict upload checks (type/size/filename sanitization; private file mode).
- Tightened stock/purchase numeric validations.
- Added minimal frontend pages and routing for roles, user-access, task review/upload.
- Extended smoke checks and added backend permission test.

## Remaining recommended hardening (next iteration)
- Replace base64 JSON uploads with streamed multipart endpoint + AV scanning.
- Add audit log writes for role/task mutations.
- Add full integration tests with isolated test DB.
- Add optimistic concurrency/version columns for mutable entities.
- Add retention policy + lifecycle cleanup for attachments.
