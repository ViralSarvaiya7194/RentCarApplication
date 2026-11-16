# Kiddie Kruzzer POS - Publish & Deployment Release Document

**Release Version:** v2.1.0  
**Release Date:** October 15, 2026  
**System:** Kiddie Kruzzer Enterprise Point of Sale & Fleet Management System  
**Package Output:** `dist/applet`, `publish/`, `KiddieKruzzer-IIS-Package.zip`  

---

## 1. Executive Summary & Purpose

This release addresses and resolves the security and visibility issue where the **Reports & Analytics Hub** was accessible to all users unconditionally. Reports are now strictly governed under the **Enterprise Role-Based Access Control (RBAC)** permission matrix in PostgreSQL, ensuring that only users whose assigned role has been granted permission can view, print, or export reports.

---

## 2. Issue Addressed & Root Cause

| Item | Details |
|---|---|
| **Reported Issue** | *"reports is not under user permission, its showing to each and evry users. it should be as other we give permission it should show and if not it should not show"* |
| **Root Cause** | In `src/app/app.ts`, the navigation item `<a routerLink="/reports">` was missing the `*ngIf="perm.can('REPORTS', 'VIEW')"` structural directive used by all other menu items. Additionally, `reports.ts` lacked route-level fallback protection and permission guards for thermal printing and CSV exporting. |
| **Resolution** | Implemented multi-layered RBAC protection across the Angular UI navigation, component route views, action buttons, client permission service, and PostgreSQL database migrations. |

---

## 3. Comprehensive List of File Changes

### A. Frontend Application (`src/app/`)

1. **[src/app/app.ts](file:///d:/AI/rental-car-application%20(1)/src/app/app.ts)**
   - **Line 60:** Added `*ngIf="perm.can('REPORTS', 'VIEW')"` to the Reports navigation link in the sidebar.
   - **Line 430:** Added `this.perm.refresh()` to `logout()` so permission caches are cleared upon logout.

2. **[src/app/reports.ts](file:///d:/AI/rental-car-application%20(1)/src/app/reports.ts)**
   - Injected `PermissionService` as `public perm = inject(PermissionService)`.
   - Imported `RouterLink`.
   - Wrapped the entire reports workspace inside `<ng-container *ngIf="perm.can('REPORTS', 'VIEW'); else accessDenied">`.
   - Added an **Access Denied** template with an icon, bilingual translation (`COMMON.ACCESS_DENIED` / `COMMON.NO_PERMISSION_REPORTS`), and a direct return button to the POS counter (`/`).
   - Protected the **Thermal Print** button with `*ngIf="perm.can('REPORTS', 'PRINT')"` and an internal guard check.
   - Protected the **CSV Export** button with `*ngIf="perm.can('REPORTS', 'EXPORT')"` and an internal guard check.
   - Guarded `ngOnInit()` so that report analytics are only fetched from the API if `can('REPORTS', 'VIEW')` is true.

3. **[src/app/periodic-report.ts](file:///d:/AI/rental-car-application%20(1)/src/app/periodic-report.ts)**
   - Injected `PermissionService` and imported `RouterLink`.
   - Wrapped template in `<ng-container *ngIf="perm.can('PERIODIC_REPORT', 'VIEW'); else accessDenied">`.
   - Added permission checks to Thermal Print (`perm.can('PERIODIC_REPORT', 'PRINT')`) and CSV Export (`perm.can('PERIODIC_REPORT', 'EXPORT')`).
   - Guarded `ngOnInit()` report loading.

4. **[src/app/permission.service.ts](file:///d:/AI/rental-car-application%20(1)/src/app/permission.service.ts)**
   - Changed default fallback `userRole` from `'ADMIN'` to `'STAFF'` to eliminate any momentary privilege escalation before session storage reads.
   - Updated `init()` to set `userRole` to `'GUEST'` and clear cached permissions if no logged-in user exists in `localStorage`.
   - Enhanced `loadPermissions()` to safely resolve boolean values for `canView`, `canPrint`, etc. (`p.canView === true || p.can_view === true`).

5. **[src/app/login.ts](file:///d:/AI/rental-car-application%20(1)/src/app/login.ts)**
   - Injected `PermissionService` and called `this.perm.refresh()` immediately upon successful login so the user's role permissions are fetched dynamically before navigating to `/`.

---

### B. Backend API & Server (`server/`)

1. **[server/server.ts](file:///d:/AI/rental-car-application%20(1)/server/server.ts)**
   - Added auto-migration SQL in the startup engine ensuring `role_permissions` table exists and seeds default entries for `REPORTS` and `PERIODIC_REPORT` for all roles (`ADMIN`, `MANAGER`, `STAFF`, `CASHIER`) using `ON CONFLICT (role, module) DO NOTHING`.
   - Updated `POST /api/user-rights` parameter mapping to use `Boolean(p.canView ?? p.can_view ?? false)` for all permission fields, ensuring strict boolean storage in PostgreSQL.

2. **[server/db/schema.sql](file:///d:/AI/rental-car-application%20(1)/server/db/schema.sql)**
   - Updated base database creation seeds to include `PERIODIC_REPORT` and `REPORTS` for `ADMIN`, `MANAGER`, and `STAFF`.

3. **[server/db/database_changes.sql](file:///d:/AI/rental-car-application%20(1)/server/db/database_changes.sql)**
   - Appended seed queries for `REPORTS` permissions across all four default roles.

4. **[server/seed-bills-translations.ts](file:///d:/AI/rental-car-application%20(1)/server/seed-bills-translations.ts)**
   - Added bilingual translation keys `COMMON.ACCESS_DENIED` and `COMMON.NO_PERMISSION_REPORTS`.

---

### C. Database Changes Script (`dbchanges.txt`)

- Appended **Section 11 (ROLE PERMISSIONS FOR REPORTS & ANALYTICS HUB)** containing:
  - Role permission insertion for `REPORTS` (`ADMIN`, `MANAGER`, `STAFF`, `CASHIER`).
  - Multilingual translations for access-denied notifications.

---

## 4. Default Permission Matrix for Reports

| Role | Module | View | Add | Edit | Delete | Print | Export | Cancel | Execute |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **ADMIN** | `REPORTS` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **MANAGER** | `REPORTS` | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **STAFF** | `REPORTS` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CASHIER** | `REPORTS` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> **Note:** Administrators can change these permissions at any time from **Masters → User Rights & Permissions** and click **Save to Postgres**.

---

## 5. Database Migration Script (Execute on PostgreSQL)

If updating an existing database without restarting the server:

```sql
-- ------------------------------------------------------------------------------
-- SEED REPORTS PERMISSIONS (ON CONFLICT DO NOTHING PRESERVES EXISTING SETTINGS)
-- ------------------------------------------------------------------------------
INSERT INTO role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_print, can_export, can_cancel, can_execute)
VALUES 
    ('ADMIN', 'REPORTS', true, true, true, true, true, true, true, true),
    ('MANAGER', 'REPORTS', true, false, false, false, true, true, false, false),
    ('STAFF', 'REPORTS', false, false, false, false, false, false, false, false),
    ('CASHIER', 'REPORTS', false, false, false, false, false, false, false, false)
ON CONFLICT (role, module) DO NOTHING;

-- SEED BILINGUAL ACCESS DENIED TRANSLATIONS
INSERT INTO translations (id, translation_key, english_text, arabic_text, module, description, is_active)
VALUES 
    ('TRN-708', 'COMMON.ACCESS_DENIED', 'Access Denied', 'غير مصرح بالدخول', 'Common', 'Access denied title', 'ACTIVE'),
    ('TRN-709', 'COMMON.NO_PERMISSION_REPORTS', 'You do not have permission to access Reports & Analytics. Please contact your administrator.', 'ليس لديك صلاحية للوصول إلى مركز التقارير والإحصائيات. يرجى مراجعة المسؤول.', 'Common', 'Reports permission denied message', 'ACTIVE')
ON CONFLICT (translation_key) DO UPDATE
SET english_text = EXCLUDED.english_text,
    arabic_text = EXCLUDED.arabic_text;
```

---

## 6. Build and Deployment Instructions

### A. Automatic IIS Deployment (Recommended)

1. Open PowerShell or Command Prompt in the repository root.
2. Run the packaging command:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\package-iis.ps1
   ```
3. The build compiles the Angular production bundle to `dist/applet`, moves backend files into `publish/`, and creates `KiddieKruzzer-IIS-Package.zip`.
4. On the deployment server, extract `KiddieKruzzer-IIS-Package.zip` (or use the `publish` folder) and execute:
   ```powershell
   .\INSTALL-AND-RUN-IIS.ps1
   ```

### B. Node.js Standalone / Development Server

1. **Build frontend:**
   ```bash
   cmd /c npm run build
   ```
2. **Start backend:**
   ```bash
   cmd /c npm run server
   ```
3. Open `http://localhost:3000` or `http://localhost:4200`.

---

## 7. Verification and Testing Checklist

- [x] **Admin Login:** Log in as `admin`. The Reports link is visible in the sidebar. Clicking it displays full dashboards, charts, and tables. Print and Export buttons are present and functional.
- [x] **Staff / Cashier Login:** Log in with a `STAFF` account (e.g. `ahmed.thabet` or `mustafa.sabra`). The Reports link is **hidden** from the sidebar navigation.
- [x] **Direct URL Attempt:** Logged in as `STAFF`, manually navigate to `http://localhost:4200/reports`. An **Access Denied** card is displayed; no analytics or financial data is loaded.
- [x] **Dynamic Permission Granting:**
  1. Log in as `admin`.
  2. Go to **Masters → User Rights & Permissions**.
  3. Select **STAFF**.
  4. Find **Reports & Analytics Hub (REPORTS)** and check the **View** box.
  5. Click **Save to Postgres**.
  6. Log in as `STAFF`. The Reports link now appears and is accessible.
- [x] **Dynamic Permission Revocation:**
  1. As `admin`, uncheck **View** for **STAFF** on `REPORTS`.
  2. Click **Save to Postgres**.
  3. Log in as `STAFF`. The Reports link disappears immediately.
- [x] **Logout State:** Logging out resets permissions so no cached permissions leak to the next session.
