import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { pool, db, testConnection } from './db/connection';
import { runDatabaseMigrations } from './db/migrations';
import * as schema from './db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { ThermalPrinterService, ThermalPrinterConfig, ThermalPrintPayload } from './thermal-printer';
import { EmailService } from './email-service';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = process.env['PORT'] || 3000;

async function resolvePrinterConfig(params?: {
  branch?: string;
  location?: string;
  terminal?: string;
  printType?: string;
  branchId?: string;
  locationId?: string;
}): Promise<ThermalPrinterConfig> {
  try {
    const res = await pool.query(`SELECT * FROM printer_settings WHERE is_active = true ORDER BY id ASC`);
    const activePrinters: any[] = res.rows;
    if (activePrinters.length > 0) {
      const b = (params?.branch || '').toLowerCase().trim();
      const bId = (params?.branchId || '').toLowerCase().trim();
      const l = (params?.location || '').toLowerCase().trim();
      const lId = (params?.locationId || '').toLowerCase().trim();
      const t = (params?.terminal || 'POS-Terminal-1').toLowerCase().trim();
      const pt = (params?.printType || 'ALL').toUpperCase().trim();

      // Designated default printer (explicit is_default or DEFAULT_PRINTER id)
      const defaultPrinter = activePrinters.find(p => p.is_default) || activePrinters.find(p => p.id === 'DEFAULT_PRINTER');

      // 1. Terminal-specific printer check (if explicitly bound to this terminal, not ALL)
      const terminalOverride = activePrinters.find(p => {
        const pTerm = (p.terminal || 'ALL').toLowerCase().trim();
        const pType = (p.print_type || 'ALL').toUpperCase().trim();
        return t !== 'all' && pTerm === t && pTerm !== 'all' && (pType === 'ALL' || pType === pt);
      });

      let match = defaultPrinter || terminalOverride;
      if (!match) {
        // Fallback by branch & location
        match = activePrinters.find(p => {
          const pBranch = (p.branch_name || '').toLowerCase().trim();
          const pLoc = (p.location_name || '').toLowerCase().trim();
          return (!b || pBranch === b || pBranch === 'all branches') && (!l || pLoc === l || pLoc === 'all locations');
        });
      }

      if (!match) {
        match = activePrinters[0];
      }

      if (match) {
        return {
          id: match.id,
          printerName: match.printer_name,
          windowsPrinterName: match.windows_printer_name || (match.interface_type === 'USB' ? 'POS-80' : undefined),
          interfaceType: match.interface_type,
          ipAddress: match.ip_address,
          port: Number(match.port) || 9100,
          branchId: match.branch_id,
          branchName: match.branch_name,
          locationId: match.location_id,
          locationName: match.location_name,
          terminal: match.terminal,
          printerType: match.printer_type || 'ESC/POS',
          printType: match.print_type || 'ALL',
          paperWidth: match.paper_width || '80mm',
          encoding: match.encoding || 'CP864',
          autoCut: match.auto_cut !== false,
          cashDrawer: match.cash_drawer === true,
          isActive: match.is_active !== false,
          isDefault: match.is_default === true,
          printOnStart: match.print_on_start !== false,
          createdAt: match.created_at,
          updatedAt: match.updated_at,
        };
      }
    }
  } catch (e) {
    console.error('Error resolving printer config from DB:', e);
  }

  return {
    id: 'PRN-DEFAULT',
    printerName: 'Counter 1 Thermal Printer',
    interfaceType: 'VIRTUAL',
    ipAddress: '192.168.1.200',
    port: 9100,
    paperWidth: '80mm',
    encoding: 'CP864',
    autoCut: true,
    cashDrawer: false,
    isActive: true,
    printOnStart: true,
  };
}

async function getActivePrinterConfig(): Promise<ThermalPrinterConfig> {
  return resolvePrinterConfig();
}

app.use(cors());
app.use(express.json());

// Prevent caching on all API endpoints (solves production refresh / stale data issue)
app.use('/api', (_req: Request, res: Response, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Auto run database migrations once (tracked via schema_migrations)
(async () => {
  try {
    await runDatabaseMigrations(pool);
    // Ensure default configuration records exist in grace_periods (10 mins) and rates (Single 1.000/0.500, Double 2.000/1.000)
    await pool.query(`
      INSERT INTO grace_periods (id, minutes, status, updated_at)
      SELECT 'GRP-101', 10, 'ACTIVE', NOW()
      WHERE NOT EXISTS (SELECT 1 FROM grace_periods WHERE UPPER(COALESCE(status, 'ACTIVE')) = 'ACTIVE');
    `);
    await pool.query(`
      INSERT INTO rates (id, model_id, model, duration, amount, status) VALUES
        ('RAT-001', 'MOD-101', 'Single Seater', 60, 1.000, 'ACTIVE'),
        ('RAT-002', 'MOD-101', 'Single Seater', 30, 0.500, 'ACTIVE'),
        ('RAT-004', 'MOD-102', 'Double Seater', 60, 2.000, 'ACTIVE'),
        ('RAT-005', 'MOD-102', 'Double Seater', 30, 1.000, 'ACTIVE')
      ON CONFLICT (id) DO NOTHING;
    `);
    // Ensure active sales date is initialized in system_settings
    await getActiveSalesDate(pool);
  } catch (e: any) {
    console.warn('Database migration startup warning:', e.message);
  }
})();

// Helper function to get current local date in YYYY-MM-DD
function getLocalTodayStr(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuwait' }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

// Active Sales Business Date management
async function getActiveSalesDate(clientOrPool: any = pool): Promise<string> {
  try {
    const res = await clientOrPool.query(
      `SELECT value FROM system_settings WHERE key = 'CURRENT_SALES_DATE' LIMIT 1`
    );
    if (res.rows.length > 0 && res.rows[0].value) {
      return String(res.rows[0].value).trim();
    }

    // Determine initial active sales date
    const localToday = getLocalTodayStr();
    let initialSalesDate = localToday;

    const dayCloseRes = await clientOrPool.query(
      `SELECT close_date FROM day_closes ORDER BY close_date DESC LIMIT 1`
    );
    if (dayCloseRes.rows.length > 0) {
      const latestClosed = dayCloseRes.rows[0].close_date;
      if (latestClosed >= localToday) {
        // Advance to next day if today or a later date was already closed
        const [y, m, d] = latestClosed.split('-').map(Number);
        const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
        initialSalesDate = nextDay.toISOString().split('T')[0];
      }
    }

    await clientOrPool.query(
      `INSERT INTO system_settings (key, value, description, updated_at)
       VALUES ('CURRENT_SALES_DATE', $1, 'Active POS Sales Business Date', NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [initialSalesDate]
    );

    return initialSalesDate;
  } catch (e: any) {
    console.warn('Error fetching active sales date:', e.message);
    return getLocalTodayStr();
  }
}

// Advance and reset Sales Date after Day Close
async function resetSalesDateAfterDayClose(clientOrPool: any, closedDate: string): Promise<string> {
  const [y, m, d] = closedDate.split('-').map(Number);
  const nextDayObj = new Date(Date.UTC(y, m - 1, d + 1));
  const nextDateStr = nextDayObj.toISOString().split('T')[0];
  const localToday = getLocalTodayStr();
  const newSalesDate = localToday > nextDateStr ? localToday : nextDateStr;

  await clientOrPool.query(
    `INSERT INTO system_settings (key, value, description, updated_at)
     VALUES ('CURRENT_SALES_DATE', $1, 'Active POS Sales Business Date', NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [newSalesDate]
  );

  return newSalesDate;
}

// Helper function to record audit trail entries
async function logAudit(clientOrPool: any, params: {
  userId?: string;
  username?: string;
  shiftId?: string;
  branch?: string;
  location?: string;
  terminal?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  remarks?: string;
}) {
  try {
    await clientOrPool.query(
      `INSERT INTO audit_logs (
        user_id, username, shift_id, branch, location, terminal,
        action, entity_type, entity_id, old_values, new_values, remarks, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
      [
        params.userId || null,
        params.username || 'System',
        params.shiftId || null,
        params.branch || null,
        params.location || null,
        params.terminal || null,
        params.action,
        params.entityType || null,
        params.entityId || null,
        params.oldValues ? (typeof params.oldValues === 'string' ? params.oldValues : JSON.stringify(params.oldValues)) : null,
        params.newValues ? (typeof params.newValues === 'string' ? params.newValues : JSON.stringify(params.newValues)) : null,
        params.remarks || null,
      ]
    );
  } catch (err: any) {
    console.warn('Audit logging notice:', err.message);
  }
}

// ----------------------------------------------------
// Health, DB Status & Auth Endpoints
// ----------------------------------------------------
app.get('/api/health', async (_req: Request, res: Response) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

app.post('/api/login', async (req: Request, res: Response) => {
  try {
    const { username, password, terminal } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const foundUsers = await db
      .select()
      .from(schema.users)
      .where(
        and(
          sql`LOWER(${schema.users.username}) = LOWER(${String(username).trim()})`,
          eq(schema.users.status, 'ACTIVE')
        )
      );

    if (foundUsers.length === 0) {
      res.status(401).json({ error: 'User not found or account is inactive' });
      return;
    }

    const user = foundUsers[0];
    if (user.password !== String(password).trim()) {
      res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
      return;
    }

    // Fetch operating company, branch, and location for the user's session
    const companies = await db.select().from(schema.companies).limit(1);
    const branches = await db.select().from(schema.branches).limit(1);
    const locations = await db.select().from(schema.locations).limit(1);

    const compName = companies[0]?.name || 'Your Events Management Company';
    const brName = branches[0]?.name || 'Kiddie Kruzzer';
    const locName = locations[0]?.name || 'Avenues Mall -Phase -4- Gate 25';
    const termInfo = terminal || 'POS-Terminal-1';

    // Get current active sales business date
    const activeSalesDate = await getActiveSalesDate(pool);

    // Dynamically determine active shift for this user and location
    const activeShift = await getOrCreateActiveShift(pool, {
      userId: user.id,
      username: user.username,
      cashierName: user.employeeName || user.username,
      branch: brName,
      location: locName,
      terminal: termInfo,
      businessDate: activeSalesDate,
    });

    // Record LOGIN in audit trail
    await logAudit(pool, {
      userId: user.id,
      username: user.username,
      shiftId: activeShift?.id || null,
      branch: brName,
      location: locName,
      terminal: termInfo,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: user.id,
      remarks: `User ${user.username} logged in successfully`,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        employeeName: user.employeeName || user.username,
        role: user.role,
        status: user.status,
      },
      salesDate: activeSalesDate,
      shift: activeShift ? {
        id: activeShift.id,
        shiftNumber: activeShift.shift_number || 1,
        businessDate: activeShift.business_date,
        status: activeShift.status || 'OPEN',
        startTime: activeShift.start_time,
        cashierName: activeShift.cashier_name,
      } : null,
      company: compName,
      branch: brName,
      location: locName,
    });
  } catch (err: any) {
    console.error('Error in POST /api/login:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Supervisor / Manager Authorization Verification
// ----------------------------------------------------
app.post(['/api/auth/verify-supervisor', '/api/verify-supervisor'], async (req: Request, res: Response) => {
  try {
    const { password, username } = req.body;
    if (!password) {
      res.status(400).json({ authorized: false, error: 'Supervisor password is required.' });
      return;
    }

    let queryStr = `SELECT id, username, employee_name, role FROM users WHERE TRIM(password) = $1 AND UPPER(TRIM(role)) IN ('ADMIN', 'MANAGER', 'SUPERVISOR') AND COALESCE(UPPER(TRIM(status)), 'ACTIVE') = 'ACTIVE'`;
    const params: any[] = [String(password).trim()];

    if (username && String(username).trim()) {
      queryStr += ` AND LOWER(TRIM(username)) = LOWER($2)`;
      params.push(String(username).trim());
    }

    const check = await pool.query(queryStr, params);
    if (check.rows.length > 0) {
      const u = check.rows[0];
      res.json({
        authorized: true,
        user: {
          id: u.id,
          username: u.username,
          employeeName: u.employee_name,
          employee_name: u.employee_name,
          role: u.role
        }
      });
    } else {
      res.status(401).json({
        authorized: false,
        error: 'Invalid password. Supervisor or Manager authorization is required.'
      });
    }
  } catch (err: any) {
    res.status(500).json({ authorized: false, error: err.message });
  }
});

// ----------------------------------------------------
// Sales Business Date Endpoints
// ----------------------------------------------------
app.get('/api/sales-date', async (req: Request, res: Response) => {
  try {
    const salesDate = await getActiveSalesDate(pool);
    const closedRes = await pool.query(`SELECT * FROM day_closes WHERE close_date = $1`, [salesDate]);
    const isDayClosed = closedRes.rows.length > 0;

    const branch = (req.query['branch'] as string) || 'Kiddie Kruzzer';
    const location = (req.query['location'] as string) || 'Avenues Mall -Phase -4- Gate 25';
    const terminal = (req.query['terminal'] as string) || 'POS-Terminal-1';

    // Get current active shift if exists
    let activeShift = null;
    const shiftRes = await pool.query(
      `SELECT * FROM shifts WHERE status = 'OPEN' AND business_date = $1 ORDER BY start_time DESC LIMIT 1`,
      [salesDate]
    );
    if (shiftRes.rows.length > 0) {
      const s = shiftRes.rows[0];
      activeShift = {
        id: s.id,
        shiftNumber: s.shift_number || 1,
        businessDate: s.business_date,
        cashierName: s.cashier_name,
        status: s.status,
        startTime: s.start_time,
      };
    }

    res.json({
      salesDate,
      isDayClosed,
      activeShift,
      localTime: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales-date/reset', async (req: Request, res: Response) => {
  try {
    const { targetDate } = req.body;
    const newDate = targetDate ? String(targetDate).trim() : getLocalTodayStr();
    await pool.query(
      `INSERT INTO system_settings (key, value, description, updated_at)
       VALUES ('CURRENT_SALES_DATE', $1, 'Active POS Sales Business Date', NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [newDate]
    );
    res.json({ success: true, salesDate: newDate, message: `Sales date updated to ${newDate}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logout', async (req: Request, res: Response) => {
  try {
    const { userId, username, shiftId, branch, location, terminal } = req.body;
    await logAudit(pool, {
      userId: userId || null,
      username: username || 'User',
      shiftId: shiftId || null,
      branch: branch || null,
      location: location || null,
      terminal: terminal || null,
      action: 'LOGOUT',
      entityType: 'USER',
      entityId: userId || null,
      remarks: `User ${username || 'User'} logged out`,
    });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/session-info', async (_req: Request, res: Response) => {
  try {
    const companies = await db.select().from(schema.companies).limit(1);
    const branches = await db.select().from(schema.branches).limit(1);
    const locations = await db.select().from(schema.locations).limit(1);
    const summaryToday = await pool.query(
      `SELECT COUNT(*) AS total_rentals, COALESCE(SUM(total_amount), 0) AS total_revenue 
       FROM rentals WHERE DATE(start_time) = CURRENT_DATE`
    );
    const carsCount = await pool.query(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'Rented') AS rented FROM cars`
    );

    const totalCars = parseInt(carsCount.rows[0]?.total || '0', 10);
    const rentedCars = parseInt(carsCount.rows[0]?.rented || '0', 10);
    const occupancy = totalCars > 0 ? Math.round((rentedCars / totalCars) * 100) : 0;

    res.json({
      company: companies[0]?.name || 'Your Events Management Company',
      branch: branches[0]?.name || 'Kiddie Kruzzer',
      location: locations[0]?.name || 'Avenues Mall -Phase -4- Gate 25',
      revenueToday: Number(summaryToday.rows[0]?.total_revenue || 0).toFixed(3),
      occupancy: `${occupancy}%`,
      rentedCount: rentedCars,
      totalCars,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Role-Based Access Control (RBAC) & Security Engine
// ----------------------------------------------------
async function checkUserPermission(userId?: string, userRole?: string, module?: string, action?: string): Promise<boolean> {
  const role = (userRole || 'ADMIN').toUpperCase().trim();
  if (role === 'ADMIN') return true; // Full unrestricted access
  if (!module || !action) return true;

  try {
    const permRes = await pool.query(
      `SELECT * FROM role_permissions WHERE UPPER(role) = $1 AND UPPER(module) = $2 LIMIT 1`,
      [role, module.toUpperCase().trim()]
    );
    if (permRes.rowCount > 0) {
      const row = permRes.rows[0];
      const colMap: Record<string, string> = {
        'VIEW': 'can_view',
        'ADD': 'can_add',
        'EDIT': 'can_edit',
        'DELETE': 'can_delete',
        'PRINT': 'can_print',
        'EXPORT': 'can_export',
        'CANCEL': 'can_cancel',
        'EXECUTE': 'can_execute',
      };
      const col = colMap[action.toUpperCase()] || 'can_view';
      return row[col] === true;
    } else if (module.toUpperCase().trim().startsWith('REPORT_')) {
      // Fallback check to general REPORTS permission if specific report module not explicitly configured yet
      const fallbackRes = await pool.query(
        `SELECT * FROM role_permissions WHERE UPPER(role) = $1 AND UPPER(module) = 'REPORTS' LIMIT 1`,
        [role]
      );
      if (fallbackRes.rowCount > 0) {
        const row = fallbackRes.rows[0];
        const colMap: Record<string, string> = {
          'VIEW': 'can_view',
          'PRINT': 'can_print',
          'EXPORT': 'can_export',
        };
        const col = colMap[action.toUpperCase()] || 'can_view';
        return row[col] === true;
      }
    }
  } catch (e) {
    console.error('Error checking user permission:', e);
  }
  return false;
}

function requirePermission(module: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req.headers['x-user-role'] as string) || (req.query['role'] as string) || 'ADMIN';
    const userId = (req.headers['x-user-id'] as string) || (req.query['userId'] as string);

    const allowed = await checkUserPermission(userId, userRole, module, action);
    if (!allowed) {
      res.status(403).json({
        error: `Access Denied: You do not have permission to ${action} ${module}.`,
        module,
        action,
        role: userRole,
      });
      return;
    }
    next();
  };
}

// ----------------------------------------------------
// User Rights & Permissions Master Endpoints
// ----------------------------------------------------
app.get('/api/user-rights', async (_req: Request, res: Response) => {
  try {
    const data = await pool.query(`SELECT * FROM role_permissions ORDER BY role, id ASC`);
    res.json(data.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user-rights', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { permissions } = req.body;

    if (Array.isArray(permissions)) {
      for (const p of permissions) {
        await client.query(
          `INSERT INTO role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_print, can_export, can_cancel, can_execute, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
           ON CONFLICT (role, module) DO UPDATE
           SET can_view = EXCLUDED.can_view,
               can_add = EXCLUDED.can_add,
               can_edit = EXCLUDED.can_edit,
               can_delete = EXCLUDED.can_delete,
               can_print = EXCLUDED.can_print,
               can_export = EXCLUDED.can_export,
               can_cancel = EXCLUDED.can_cancel,
               can_execute = EXCLUDED.can_execute,
               updated_at = NOW()`,
          [
            p.role,
            p.module,
            Boolean(p.canView ?? p.can_view ?? false),
            Boolean(p.canAdd ?? p.can_add ?? false),
            Boolean(p.canEdit ?? p.can_edit ?? false),
            Boolean(p.canDelete ?? p.can_delete ?? false),
            Boolean(p.canPrint ?? p.can_print ?? false),
            Boolean(p.canExport ?? p.can_export ?? false),
            Boolean(p.canCancel ?? p.can_cancel ?? false),
            Boolean(p.canExecute ?? p.can_execute ?? false),
          ]
        );
      }
    }
    await client.query('COMMIT');
    const updated = await pool.query(`SELECT * FROM role_permissions ORDER BY role, id ASC`);
    res.json({ success: true, permissions: updated.rows });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/user-rights/my-permissions', async (req: Request, res: Response) => {
  try {
    const role = (req.headers['x-user-role'] as string) || (req.query['role'] as string) || 'ADMIN';
    if (role === 'ADMIN') {
      const allMods = await pool.query(`SELECT DISTINCT module FROM role_permissions`);
      const fullPerms = allMods.rows.map(m => ({
        module: m.module,
        canView: true, canAdd: true, canEdit: true, canDelete: true, canPrint: true, canExport: true, canCancel: true, canExecute: true
      }));
      res.json(fullPerms);
      return;
    }

    const data = await pool.query(`SELECT * FROM role_permissions WHERE UPPER(role) = $1`, [role.toUpperCase()]);
    res.json(data.rows.map(r => ({
      module: r.module,
      canView: r.can_view,
      canAdd: r.can_add,
      canEdit: r.can_edit,
      canDelete: r.can_delete,
      canPrint: r.can_print,
      canExport: r.can_export,
      canCancel: r.can_cancel,
      canExecute: r.can_execute,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Print Format Master Endpoints (CRUD, Toggle, Set Default)
// ----------------------------------------------------
app.get('/api/print-formats', async (req: Request, res: Response) => {
  try {
    const { search, status, branch, printType, language } = req.query;
    let query = `SELECT * FROM print_formats WHERE 1=1`;
    const params: any[] = [];

    if (status && status !== 'ALL') {
      params.push(status === 'ACTIVE');
      query += ` AND is_active = $${params.length}`;
    }
    if (branch && branch !== 'ALL') {
      params.push(branch);
      query += ` AND (branch_name = $${params.length} OR branch_id = $${params.length})`;
    }
    if (printType && printType !== 'ALL') {
      params.push(printType);
      query += ` AND (print_type = $${params.length} OR print_type = 'ALL')`;
    }
    if (language && language !== 'ALL') {
      params.push(language);
      query += ` AND (language = $${params.length} OR language = 'BOTH')`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (format_name ILIKE $${params.length} OR id ILIKE $${params.length} OR header_title ILIKE $${params.length})`;
    }

    query += ` ORDER BY is_default DESC, created_at DESC, id ASC`;
    const data = await pool.query(query, params);
    res.json(data.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/print-formats', async (req: Request, res: Response) => {
  try {
    const {
      id,
      formatName,
      branchId,
      branchName,
      locationId,
      locationName,
      terminal,
      printerId,
      printerName,
      printType,
      language,
      paperWidth,
      fontSize,
      fontFamily,
      fontStyle,
      headerTitle,
      headerSubtitle,
      showLogo,
      showCompanyHeader,
      showBranchInfo,
      showCustomerInfo,
      showCarDetails,
      showPricingBreakdown,
      showPaymentMethod,
      showCashier,
      showBarcode,
      footerNotes,
      termsConditions,
      isDefault,
      isActive,
    } = req.body;

    const formatId = String(id || `FMT-${Math.floor(100 + Math.random() * 900)}`);
    const insertRes = await pool.query(
      `INSERT INTO print_formats (
        id, format_name, branch_id, branch_name, location_id, location_name,
        terminal, printer_id, printer_name, print_type, language, paper_width,
        font_size, font_family, font_style, header_title, header_subtitle, show_logo, show_company_header, show_branch_info,
        show_customer_info, show_car_details, show_pricing_breakdown, show_payment_method,
        show_cashier, show_barcode, footer_notes, terms_conditions, is_default, is_active,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE
      SET format_name = EXCLUDED.format_name,
          branch_id = EXCLUDED.branch_id,
          branch_name = EXCLUDED.branch_name,
          location_id = EXCLUDED.location_id,
          location_name = EXCLUDED.location_name,
          terminal = EXCLUDED.terminal,
          printer_id = EXCLUDED.printer_id,
          printer_name = EXCLUDED.printer_name,
          print_type = EXCLUDED.print_type,
          language = EXCLUDED.language,
          paper_width = EXCLUDED.paper_width,
          font_size = EXCLUDED.font_size,
          font_family = EXCLUDED.font_family,
          font_style = EXCLUDED.font_style,
          header_title = EXCLUDED.header_title,
          header_subtitle = EXCLUDED.header_subtitle,
          show_logo = EXCLUDED.show_logo,
          show_company_header = EXCLUDED.show_company_header,
          show_branch_info = EXCLUDED.show_branch_info,
          show_customer_info = EXCLUDED.show_customer_info,
          show_car_details = EXCLUDED.show_car_details,
          show_pricing_breakdown = EXCLUDED.show_pricing_breakdown,
          show_payment_method = EXCLUDED.show_payment_method,
          show_cashier = EXCLUDED.show_cashier,
          show_barcode = EXCLUDED.show_barcode,
          footer_notes = EXCLUDED.footer_notes,
          terms_conditions = EXCLUDED.terms_conditions,
          is_default = EXCLUDED.is_default,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      RETURNING *`,
      [
        formatId,
        formatName || 'Standard POS Thermal Format',
        branchId || null,
        branchName || 'All Branches',
        locationId || null,
        locationName || 'All Locations',
        terminal || 'ALL',
        printerId || 'ALL',
        printerName || 'ALL',
        printType || 'ALL',
        language || 'BOTH',
        paperWidth || '80mm',
        fontSize || 'LARGE',
        fontFamily || 'MONOSPACE',
        fontStyle || 'BOLD',
        headerTitle || 'KIDDIE KRUZZER ENTERTAINMENT',
        headerSubtitle || 'Car Rental Tax Invoice',
        showLogo !== false,
        showCompanyHeader !== false,
        showBranchInfo !== false,
        showCustomerInfo !== false,
        showCarDetails !== false,
        showPricingBreakdown !== false,
        showPaymentMethod !== false,
        showCashier !== false,
        showBarcode !== false,
        footerNotes || 'Thank you for choosing Kiddie Kruzzer! / شكراً لاختياركم كيدي كروزر',
        termsConditions || 'Non-refundable after 5 minutes / المبلغ غير مسترد بعد مرور 5 دقائق',
        isDefault === true,
        isActive !== false,
      ]
    );

    res.json(insertRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/print-formats/:id', async (req: Request, res: Response) => {
  const id = req.params['id'];
  try {
    const {
      formatName,
      branchId,
      branchName,
      locationId,
      locationName,
      terminal,
      printerId,
      printerName,
      printType,
      language,
      paperWidth,
      fontSize,
      fontFamily,
      fontStyle,
      headerTitle,
      headerSubtitle,
      showLogo,
      showCompanyHeader,
      showBranchInfo,
      showCustomerInfo,
      showCarDetails,
      showPricingBreakdown,
      showPaymentMethod,
      showCashier,
      showBarcode,
      footerNotes,
      termsConditions,
      isDefault,
      isActive,
    } = req.body;

    const updateRes = await pool.query(
      `UPDATE print_formats
       SET format_name = COALESCE($1, format_name),
           branch_id = $2,
           branch_name = $3,
           location_id = $4,
           location_name = $5,
           terminal = COALESCE($6, terminal),
           printer_id = COALESCE($7, printer_id),
           printer_name = COALESCE($8, printer_name),
           print_type = COALESCE($9, print_type),
           language = COALESCE($10, language),
           paper_width = COALESCE($11, paper_width),
           font_size = COALESCE($12, font_size),
           font_family = COALESCE($13, font_family),
           font_style = COALESCE($14, font_style),
           header_title = COALESCE($15, header_title),
           header_subtitle = COALESCE($16, header_subtitle),
           show_logo = COALESCE($17, show_logo),
           show_company_header = COALESCE($18, show_company_header),
           show_branch_info = COALESCE($19, show_branch_info),
           show_customer_info = COALESCE($20, show_customer_info),
           show_car_details = COALESCE($21, show_car_details),
           show_pricing_breakdown = COALESCE($22, show_pricing_breakdown),
           show_payment_method = COALESCE($23, show_payment_method),
           show_cashier = COALESCE($24, show_cashier),
           show_barcode = COALESCE($25, show_barcode),
           footer_notes = COALESCE($26, footer_notes),
           terms_conditions = COALESCE($27, terms_conditions),
           is_default = COALESCE($28, is_default),
           is_active = COALESCE($29, is_active),
           updated_at = NOW()
       WHERE id = $30
       RETURNING *`,
      [
        formatName,
        branchId || null,
        branchName || null,
        locationId || null,
        locationName || null,
        terminal,
        printerId,
        printerName,
        printType,
        language,
        paperWidth,
        fontSize,
        fontFamily,
        fontStyle,
        headerTitle,
        headerSubtitle,
        showLogo,
        showCompanyHeader,
        showBranchInfo,
        showCustomerInfo,
        showCarDetails,
        showPricingBreakdown,
        showPaymentMethod,
        showCashier,
        showBarcode,
        footerNotes,
        termsConditions,
        isDefault,
        isActive,
        id,
      ]
    );

    if (updateRes.rowCount === 0) {
      res.status(404).json({ error: 'Print format not found' });
      return;
    }
    res.json(updateRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/print-formats/:id', async (req: Request, res: Response) => {
  const id = req.params['id'];
  try {
    await pool.query(`DELETE FROM print_formats WHERE id = $1`, [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/print-formats/:id/toggle', async (req: Request, res: Response) => {
  const id = req.params['id'];
  try {
    const updateRes = await pool.query(
      `UPDATE print_formats SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (updateRes.rowCount === 0) {
      res.status(404).json({ error: 'Print format not found' });
      return;
    }
    res.json(updateRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/print-formats/:id/set-default', async (req: Request, res: Response) => {
  const id = req.params['id'];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const formatRes = await client.query(`SELECT * FROM print_formats WHERE id = $1`, [id]);
    if (formatRes.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Print format not found' });
      return;
    }
    const fmt = formatRes.rows[0];
    await client.query(`UPDATE print_formats SET is_default = false WHERE print_type = $1`, [fmt.print_type]);
    const updateRes = await client.query(`UPDATE print_formats SET is_default = true, updated_at = NOW() WHERE id = $1 RETURNING *`, [id]);
    await client.query('COMMIT');
    res.json(updateRes.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/db-status', async (_req: Request, res: Response) => {
  try {
    const check = await testConnection();
    if (!check.success) {
      res.status(500).json({ error: 'Database not connected', details: check.error });
      return;
    }

    const tables = [
      'companies',
      'branches',
      'locations',
      'car_models',
      'cars',
      'rates',
      'grace_periods',
      'users',
      'shifts',
      'rentals',
      'day_closes',
      'translations',
    ];
    const counts: Record<string, number> = {};

    for (const table of tables) {
      const q = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
      counts[table] = parseInt(q.rows[0].count, 10);
    }

    res.json({
      status: 'connected',
      database: check.database,
      version: check.version,
      schema: check.schema,
      tableCounts: counts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Seed / Reset Database Endpoint
// ----------------------------------------------------
app.post('/api/seed', async (_req: Request, res: Response) => {
  try {
    const sqlPath = path.resolve(__dirname, 'db', 'schema.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf-8');
    await pool.query(sqlScript);
    res.json({ success: true, message: 'Database schema and seed data successfully initialized.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Truncate / Wipe Transaction Data Endpoint
// ----------------------------------------------------
app.post('/api/system/wipe-transactions', async (_req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      TRUNCATE TABLE rentals CASCADE;
      TRUNCATE TABLE shifts CASCADE;
      TRUNCATE TABLE day_closes CASCADE;
      TRUNCATE TABLE print_audit_logs CASCADE;
      UPDATE cars SET status = 'Available', updated_at = NOW();
      ALTER SEQUENCE IF EXISTS day_closes_id_seq RESTART WITH 1;
      ALTER SEQUENCE IF EXISTS print_audit_logs_id_seq RESTART WITH 1;
    `);
    await client.query('COMMIT');
    res.json({ success: true, message: 'All transaction data wiped and cars reset to Available.' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------
// Companies Endpoints
// ----------------------------------------------------
app.get('/api/companies', async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(schema.companies).orderBy(schema.companies.id);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/companies', async (req: Request, res: Response) => {
  try {
    const { id, name, contact, status } = req.body;
    const compId = String(id || `CMP-${Math.floor(100 + Math.random() * 900)}`);
    const [saved] = await db
      .insert(schema.companies)
      .values({ id: compId, name: String(name || ''), contact, status: status || 'ACTIVE' })
      .onConflictDoUpdate({
        target: schema.companies.id,
        set: { name: String(name || ''), contact, status: status || 'ACTIVE', updatedAt: new Date() },
      })
      .returning();
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/companies/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params['id']);
    await db.delete(schema.companies).where(eq(schema.companies.id, id));
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Branches Endpoints
// ----------------------------------------------------
app.get('/api/branches', async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(schema.branches).orderBy(schema.branches.id);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/branches', async (req: Request, res: Response) => {
  try {
    const { id, name, companyId, company, status } = req.body;
    const branchId = String(id || `BRN-${Math.floor(100 + Math.random() * 900)}`);
    const [saved] = await db
      .insert(schema.branches)
      .values({ id: branchId, name: String(name || ''), companyId, company, status: status || 'ACTIVE' })
      .onConflictDoUpdate({
        target: schema.branches.id,
        set: { name: String(name || ''), companyId, company, status: status || 'ACTIVE', updatedAt: new Date() },
      })
      .returning();
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/branches/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params['id']);
    await db.delete(schema.branches).where(eq(schema.branches.id, id));
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Locations Endpoints
// ----------------------------------------------------
app.get('/api/locations', async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(schema.locations).orderBy(schema.locations.id);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/locations', async (req: Request, res: Response) => {
  try {
    const { id, name, branchId, branch, status } = req.body;
    const locId = String(id || `LOC-${Math.floor(100 + Math.random() * 900)}`);
    const [saved] = await db
      .insert(schema.locations)
      .values({ id: locId, name: String(name || ''), branchId, branch, status: status || 'ACTIVE' })
      .onConflictDoUpdate({
        target: schema.locations.id,
        set: { name: String(name || ''), branchId, branch, status: status || 'ACTIVE', updatedAt: new Date() },
      })
      .returning();
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/locations/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params['id']);
    await db.delete(schema.locations).where(eq(schema.locations.id, id));
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Car Models Endpoints
// ----------------------------------------------------
const getCarModelsHandler = async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(schema.carModels).orderBy(schema.carModels.id);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

const createCarModelHandler = async (req: Request, res: Response) => {
  try {
    const { id, name, seats, status } = req.body;
    const modelId = String(id || `MOD-${Math.floor(100 + Math.random() * 900)}`);
    const [saved] = await db
      .insert(schema.carModels)
      .values({ id: modelId, name: String(name || ''), seats: Number(seats) || 1, status: status || 'ACTIVE' })
      .onConflictDoUpdate({
        target: schema.carModels.id,
        set: { name: String(name || ''), seats: Number(seats) || 1, status: status || 'ACTIVE', updatedAt: new Date() },
      })
      .returning();
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

const deleteCarModelHandler = async (req: Request, res: Response) => {
  try {
    const id = String(req.params['id']);
    await db.delete(schema.carModels).where(eq(schema.carModels.id, id));
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

app.get('/api/car-models', getCarModelsHandler);
app.get('/api/categories', getCarModelsHandler);
app.post('/api/car-models', createCarModelHandler);
app.post('/api/categories', createCarModelHandler);
app.delete('/api/car-models/:id', deleteCarModelHandler);
app.delete('/api/categories/:id', deleteCarModelHandler);

// ----------------------------------------------------
// Cars Endpoints
// ----------------------------------------------------
app.get('/api/cars', async (_req: Request, res: Response) => {
  try {
    // 1. Self-heal and sync status in DB: Any car with an ACTIVE rental is guaranteed to be 'Rented'
    await pool.query(`
      UPDATE cars SET status = 'Rented', updated_at = NOW()
      WHERE id IN (SELECT car_id FROM rentals WHERE status = 'ACTIVE') AND status != 'Rented'
    `).catch(() => {});

    // Any car marked 'Rented' with NO active rental is self-healed back to 'Available'
    await pool.query(`
      UPDATE cars SET status = 'Available', updated_at = NOW()
      WHERE id NOT IN (SELECT car_id FROM rentals WHERE status = 'ACTIVE') AND status = 'Rented'
    `).catch(() => {});

    // 2. Fetch active rental car IDs & car numbers
    const activeRentalsRes = await pool.query(`SELECT DISTINCT car_id, car_no FROM rentals WHERE status = 'ACTIVE'`);
    const activeCarIds = new Set(activeRentalsRes.rows.map(r => String(r.car_id)));
    const activeCarNos = new Set(activeRentalsRes.rows.map(r => String(r.car_no)));

    // 3. Select cars ordered by carNo numeric order
    const data = await db
      .select()
      .from(schema.cars)
      .orderBy(
        sql`CAST(NULLIF(regexp_replace(${schema.cars.carNo}, '[^0-9]', '', 'g'), '') AS INTEGER) ASC NULLS LAST`,
        schema.cars.carNo
      );

    // 4. Return data with guaranteed 100% accurate rental status
    const synchronizedData = data.map(car => {
      const isRented = activeCarIds.has(String(car.id)) || activeCarNos.has(String(car.carNo));
      return {
        ...car,
        status: isRented ? 'Rented' : (car.status === 'Rented' ? 'Available' : (car.status || 'Available'))
      };
    });

    res.json(synchronizedData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cars', async (req: Request, res: Response) => {
  try {
    const { id, carNo, modelId, model, color, status, batteryLevel } = req.body;
    const carId = String(id || `CAR-${Math.floor(100 + Math.random() * 900)}`);
    const [saved] = await db
      .insert(schema.cars)
      .values({
        id: carId,
        carNo: String(carNo),
        modelId,
        model: String(model || 'Single Seater'),
        color: color ? String(color) : null,
        status: status || 'Available',
        batteryLevel: batteryLevel !== undefined ? Number(batteryLevel) : 100,
      })
      .onConflictDoUpdate({
        target: schema.cars.id,
        set: {
          carNo: String(carNo),
          modelId,
          model: String(model || 'Single Seater'),
          color: color ? String(color) : null,
          status: status || 'Available',
          batteryLevel: batteryLevel !== undefined ? Number(batteryLevel) : 100,
          updatedAt: new Date(),
        },
      })
      .returning();
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/cars/:id/status', async (req: Request, res: Response) => {
  try {
    const id = String(req.params['id']);
    const { status } = req.body;
    const [updated] = await db
      .update(schema.cars)
      .set({ status: String(status), updatedAt: new Date() })
      .where(eq(schema.cars.id, id))
      .returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cars/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params['id']);
    await db.delete(schema.cars).where(eq(schema.cars.id, id));
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Rates Endpoints
// ----------------------------------------------------
app.get('/api/rates', async (_req: Request, res: Response) => {
  try {
    // Order by duration DESC (60 mins base rate before 30 mins half-hour rate)
    const data = await db.select().from(schema.rates).orderBy(desc(schema.rates.duration));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rates', async (req: Request, res: Response) => {
  try {
    const { id, modelId, model, duration, amount, status } = req.body;
    const rateId = String(id || `RAT-${Math.floor(100 + Math.random() * 900)}`);
    const [saved] = await db
      .insert(schema.rates)
      .values({
        id: rateId,
        modelId,
        model: String(model || ''),
        duration: Number(duration) || 15,
        amount: String(amount),
        status: status || 'ACTIVE',
      })
      .onConflictDoUpdate({
        target: schema.rates.id,
        set: {
          modelId,
          model: String(model || ''),
          duration: Number(duration),
          amount: String(amount),
          status: status || 'ACTIVE',
          updatedAt: new Date(),
        },
      })
      .returning();
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/rates/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params['id']);
    await db.delete(schema.rates).where(eq(schema.rates.id, id));
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Grace Periods Endpoints
// ----------------------------------------------------
app.get('/api/grace-periods', async (_req: Request, res: Response) => {
  try {
    const data = await db
      .select()
      .from(schema.gracePeriods)
      .orderBy(desc(schema.gracePeriods.updatedAt), desc(schema.gracePeriods.minutes));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/grace-periods', async (req: Request, res: Response) => {
  try {
    const { id, minutes, status } = req.body;
    const gpId = String(id || `GRP-${Math.floor(100 + Math.random() * 900)}`);
    const minsNum = Number(minutes) !== undefined && !isNaN(Number(minutes)) ? Number(minutes) : 10;
    const effStatus = status || 'ACTIVE';
    const [saved] = await db
      .insert(schema.gracePeriods)
      .values({ id: gpId, minutes: minsNum, status: effStatus })
      .onConflictDoUpdate({
        target: schema.gracePeriods.id,
        set: { minutes: minsNum, status: effStatus, updatedAt: new Date() },
      })
      .returning();

    // Keep all ACTIVE grace period rows synchronized so Single & Double always use the same configured grace minutes
    if (String(effStatus).toUpperCase() === 'ACTIVE') {
      await pool.query(
        `UPDATE grace_periods SET minutes = $1, updated_at = NOW() WHERE UPPER(COALESCE(status, 'ACTIVE')) = 'ACTIVE'`,
        [minsNum]
      );
    }

    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/grace-periods/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params['id']);
    await db.delete(schema.gracePeriods).where(eq(schema.gracePeriods.id, id));
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Users Master Endpoints
// ----------------------------------------------------
app.get('/api/users', async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(schema.users).orderBy(schema.users.id);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { id, username, employeeName, password, role, status } = req.body;
    const userId = String(id || `USR-${Math.floor(100 + Math.random() * 900)}`);
    const [saved] = await db
      .insert(schema.users)
      .values({
        id: userId,
        username: String(username),
        employeeName: employeeName ? String(employeeName) : String(username),
        password: password || '123456',
        role: role || 'STAFF',
        status: status || 'ACTIVE',
      })
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          username: String(username),
          employeeName: employeeName ? String(employeeName) : String(username),
          password: password || '123456',
          role: role || 'STAFF',
          status: status || 'ACTIVE',
          updatedAt: new Date(),
        },
      })
      .returning();
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params['id']);
    await db.delete(schema.users).where(eq(schema.users.id, id));
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Shifts Endpoints
// ----------------------------------------------------
// ----------------------------------------------------
// Shifts Endpoints (Dynamic Shift Assignment & Automatic Session Scoping)
// ----------------------------------------------------
async function getOrCreateActiveShift(
  clientOrPool: any,
  params?: {
    userId?: string;
    username?: string;
    cashierName?: string;
    branch?: string;
    location?: string;
    terminal?: string;
    businessDate?: string;
  } | string,
  legacyBranch?: string,
  legacyLocation?: string,
  legacyTerminal?: string
): Promise<any> {
  let userId: string | undefined;
  let username: string | undefined;
  let cashierName: string | undefined;
  let branch: string | undefined;
  let location: string | undefined;
  let terminal: string | undefined;
  let businessDate: string | undefined;

  if (typeof params === 'object' && params !== null) {
    userId = params.userId;
    username = params.username;
    cashierName = params.cashierName;
    branch = params.branch;
    location = params.location;
    terminal = params.terminal;
    businessDate = params.businessDate;
  } else if (typeof params === 'string') {
    cashierName = params;
    username = params;
    branch = legacyBranch;
    location = legacyLocation;
    terminal = legacyTerminal;
  }

  const activeSalesDate = businessDate || (await getActiveSalesDate(clientOrPool));
  const todayStr = activeSalesDate;
  const effectiveBranch = branch || 'Kiddie Kruzzer';
  const effectiveLocation = location || 'Avenues Mall -Phase -4- Gate 25';
  const effectiveTerminal = terminal || 'POS-Terminal-1';

  // 1. Look for existing OPEN shift in PostgreSQL scoped by location / terminal & business date
  let openRes = await clientOrPool.query(
    `SELECT * FROM shifts 
     WHERE status = 'OPEN' 
       AND business_date = $1 
       AND (location_name = $2 OR location_name IS NULL OR $2 = '')
       AND (terminal_info = $3 OR terminal_info IS NULL OR $3 = '')
     ORDER BY start_time DESC LIMIT 1`,
    [todayStr, effectiveLocation, effectiveTerminal]
  );

  // Fallback: Check any OPEN shift for active sales date at this location
  if (openRes.rowCount === 0) {
    openRes = await clientOrPool.query(
      `SELECT * FROM shifts 
       WHERE status = 'OPEN' AND business_date = $1 
       AND (location_name = $2 OR location_name IS NULL OR $2 = '')
       ORDER BY start_time DESC LIMIT 1`,
      [todayStr, effectiveLocation]
    );
  }

  // Fallback: Check any OPEN shift for active sales date across database
  if (openRes.rowCount === 0) {
    openRes = await clientOrPool.query(
      `SELECT * FROM shifts WHERE status = 'OPEN' AND business_date = $1 ORDER BY start_time DESC LIMIT 1`,
      [todayStr]
    );
  }

  if (openRes.rowCount > 0) {
    const shift = openRes.rows[0];
    return shift;
  }

  // 2. No OPEN shift found -> Determine next sequential shift number for today at this location
  const shiftsTodayRes = await clientOrPool.query(
    `SELECT COALESCE(MAX(shift_number), 0) AS max_shift_num 
     FROM shifts 
     WHERE business_date = $1 AND (location_name = $2 OR location_name IS NULL OR $2 = '')`,
    [todayStr, effectiveLocation]
  );

  const currentMax = parseInt(shiftsTodayRes.rows[0]?.max_shift_num || '0', 10);
  const nextShiftNum = currentMax + 1;
  const effectiveCashier = cashierName || username || 'Cashier';
  const newShiftId = `SHIFT-${todayStr}-${nextShiftNum}`;

  // 3. Create the new dynamic Shift
  const insertRes = await clientOrPool.query(
    `INSERT INTO shifts (
      id, shift_number, business_date, cashier_name, username,
      opened_by_user_id, opened_by_username,
      branch_name, location_name, terminal_info,
      status, opening_cash, cash_total, knet_total, total_discount, total_refund, total_rentals,
      overall_total, start_time, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'OPEN', 0.000, 0.000, 0.000, 0.000, 0.000, 0, 0.000, NOW(), NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET status = 'OPEN', updated_at = NOW()
    RETURNING *`,
    [
      newShiftId,
      nextShiftNum,
      todayStr,
      effectiveCashier,
      username || effectiveCashier,
      userId || null,
      username || null,
      effectiveBranch,
      effectiveLocation,
      effectiveTerminal
    ]
  );

  const createdShift = insertRes.rows[0];

  // Record SHIFT_OPEN audit
  await logAudit(clientOrPool, {
    userId: userId || undefined,
    username: username || effectiveCashier,
    shiftId: createdShift.id,
    branch: effectiveBranch,
    location: effectiveLocation,
    terminal: effectiveTerminal,
    action: 'SHIFT_OPEN',
    entityType: 'SHIFT',
    entityId: createdShift.id,
    remarks: `Shift #${nextShiftNum} opened automatically for user ${effectiveCashier}`,
  });

  return createdShift;
}

app.get('/api/shifts', async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(schema.shifts).orderBy(desc(schema.shifts.startTime));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/shifts/history', async (req: Request, res: Response) => {
  try {
    const fromDate = req.query['fromDate'] as string;
    const toDate = req.query['toDate'] as string;
    let queryStr = `SELECT * FROM shifts`;
    const params: any[] = [];

    if (fromDate && toDate) {
      queryStr += ` WHERE business_date >= $1 AND business_date <= $2`;
      params.push(fromDate, toDate);
    }
    queryStr += ` ORDER BY business_date DESC, shift_number DESC`;

    const result = await pool.query(queryStr, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Computes 6 comprehensive shift and closing summaries:
 * 1) Cashier wise summary with Sales Total
 * 2) Bill wise summary with Sales Total
 * 3) CAR wise summary with Sales Total
 * 4) Hourly sales wise summary with Sales Total
 * 5) Cancellation Bills Summary with Sales Total
 * 6) Payment Type wise Summary with Sales Total
 */
export async function getDetailedShiftSummaries(dbConn: any, filter: {
  shiftId?: string;
  businessDate?: string;
  fromDate?: string;
  toDate?: string;
  branch?: string;
  location?: string;
}) {
  let whereCompleted = "WHERE status = 'COMPLETED'";
  let whereCancelled = "WHERE status = 'CANCELLED'";
  const params: any[] = [];

  if (filter.shiftId) {
    params.push(filter.shiftId);
    whereCompleted += ` AND shift_id = $${params.length}`;
    whereCancelled += ` AND shift_id = $${params.length}`;
  } else if (filter.fromDate && filter.toDate) {
    params.push(filter.fromDate);
    const p1 = params.length;
    params.push(filter.toDate);
    const p2 = params.length;
    whereCompleted += ` AND (TO_CHAR(COALESCE(start_time, created_at), 'YYYY-MM-DD') BETWEEN $${p1} AND $${p2})`;
    whereCancelled += ` AND (TO_CHAR(COALESCE(cancelled_at, start_time, created_at), 'YYYY-MM-DD') BETWEEN $${p1} AND $${p2})`;
  } else if (filter.businessDate) {
    params.push(filter.businessDate);
    const p1 = params.length;
    whereCompleted += ` AND (shift_id IN (SELECT id FROM shifts WHERE business_date = $${p1}) OR TO_CHAR(COALESCE(start_time, created_at), 'YYYY-MM-DD') = $${p1})`;
    whereCancelled += ` AND (shift_id IN (SELECT id FROM shifts WHERE business_date = $${p1}) OR TO_CHAR(COALESCE(cancelled_at, start_time, created_at), 'YYYY-MM-DD') = $${p1})`;
  }

  if (filter.branch && filter.branch !== 'ALL') {
    params.push(filter.branch);
    whereCompleted += ` AND branch = $${params.length}`;
    whereCancelled += ` AND branch = $${params.length}`;
  }
  if (filter.location && filter.location !== 'ALL') {
    params.push(filter.location);
    whereCompleted += ` AND location = $${params.length}`;
    whereCancelled += ` AND location = $${params.length}`;
  }

  // 1) Cashier-wise Summary with Sales Total
  const cashierRes = await dbConn.query(`
    SELECT 
      COALESCE(created_by, 'Cashier') AS cashier,
      COUNT(*)::int AS bill_count,
      COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(cash_amount, 0) ELSE 0 END), 0)::numeric(12,3) AS cash_total,
      COALESCE(SUM(CASE WHEN payment_method IN ('KNET', 'CARD') THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(knet_amount, 0) ELSE (CASE WHEN payment_method != 'CASH' THEN total_amount ELSE 0 END) END), 0)::numeric(12,3) AS knet_total,
      COALESCE(SUM(COALESCE(discount, 0)), 0)::numeric(12,3) AS discount_total,
      COALESCE(SUM(total_amount), 0)::numeric(12,3) AS total_sales
    FROM rentals
    ${whereCompleted}
    GROUP BY COALESCE(created_by, 'Cashier')
    ORDER BY total_sales DESC
  `, params);

  let cashierTotalSales = 0;
  let cashierTotalBills = 0;
  for (const c of cashierRes.rows) {
    cashierTotalSales += Number(c.total_sales || 0);
    cashierTotalBills += parseInt(c.bill_count || '0', 10);
  }

  // 2) Bill-wise Summary with Sales Total
  const billRes = await dbConn.query(`
    SELECT 
      id,
      invoice_no,
      car_no,
      model,
      COALESCE(customer_name, 'Walk-in') AS customer_name,
      customer_phone,
      start_time,
      actual_end_time,
      COALESCE(duration_minutes, 0)::int AS duration_minutes,
      payment_method,
      COALESCE(cash_amount, 0)::numeric(12,3) AS cash_amount,
      COALESCE(knet_amount, 0)::numeric(12,3) AS knet_amount,
      COALESCE(discount, 0)::numeric(12,3) AS discount,
      COALESCE(total_amount, 0)::numeric(12,3) AS total_sales,
      COALESCE(created_by, 'Cashier') AS cashier,
      status
    FROM rentals
    ${whereCompleted}
    ORDER BY start_time ASC
  `, params);

  let billTotalSales = 0;
  for (const b of billRes.rows) {
    billTotalSales += Number(b.total_sales || 0);
  }

  // 3) CAR-wise Summary with Sales Total
  const carRes = await dbConn.query(`
    SELECT 
      car_no,
      model,
      COUNT(*)::int AS trip_count,
      COALESCE(SUM(COALESCE(duration_minutes, 0)), 0)::int AS total_minutes,
      COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(cash_amount, 0) ELSE 0 END), 0)::numeric(12,3) AS cash_total,
      COALESCE(SUM(CASE WHEN payment_method IN ('KNET', 'CARD') THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(knet_amount, 0) ELSE (CASE WHEN payment_method != 'CASH' THEN total_amount ELSE 0 END) END), 0)::numeric(12,3) AS knet_total,
      COALESCE(SUM(total_amount), 0)::numeric(12,3) AS total_sales
    FROM rentals
    ${whereCompleted}
    GROUP BY car_no, model
    ORDER BY total_sales DESC, trip_count DESC
  `, params);

  let carTotalSales = 0;
  let carTotalTrips = 0;
  let carTotalMins = 0;
  for (const cr of carRes.rows) {
    carTotalSales += Number(cr.total_sales || 0);
    carTotalTrips += parseInt(cr.trip_count || '0', 10);
    carTotalMins += parseInt(cr.total_minutes || '0', 10);
  }

  // 4) Hourly Sales-wise Summary with Sales Total
  const hourlyRes = await dbConn.query(`
    SELECT 
      TO_CHAR(start_time, 'HH24:00') AS hour_slot,
      TO_CHAR(start_time, 'HH12:00 AM') || ' - ' || TO_CHAR(start_time + interval '1 hour', 'HH12:00 AM') AS hour_label,
      COUNT(*)::int AS bill_count,
      COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(cash_amount, 0) ELSE 0 END), 0)::numeric(12,3) AS cash_total,
      COALESCE(SUM(CASE WHEN payment_method IN ('KNET', 'CARD') THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(knet_amount, 0) ELSE (CASE WHEN payment_method != 'CASH' THEN total_amount ELSE 0 END) END), 0)::numeric(12,3) AS knet_total,
      COALESCE(SUM(total_amount), 0)::numeric(12,3) AS total_sales
    FROM rentals
    ${whereCompleted}
    GROUP BY TO_CHAR(start_time, 'HH24:00'), TO_CHAR(start_time, 'HH12:00 AM') || ' - ' || TO_CHAR(start_time + interval '1 hour', 'HH12:00 AM')
    ORDER BY hour_slot ASC
  `, params);

  let hourlyTotalSales = 0;
  let hourlyTotalBills = 0;
  for (const h of hourlyRes.rows) {
    hourlyTotalSales += Number(h.total_sales || 0);
    hourlyTotalBills += parseInt(h.bill_count || '0', 10);
  }

  // 5) Cancellation Bills Summary with Sales Total
  const cancelRes = await dbConn.query(`
    SELECT 
      id,
      invoice_no,
      car_no,
      model,
      COALESCE(customer_name, 'Walk-in') AS customer_name,
      start_time,
      cancelled_at,
      COALESCE(cancelled_by, 'Supervisor') AS cancelled_by,
      COALESCE(cancellation_reason, cancellation_remarks, 'Customer Void / Cancellation') AS cancellation_reason,
      COALESCE(total_amount, 0)::numeric(12,3) AS cancelled_amount
    FROM rentals
    ${whereCancelled}
    ORDER BY COALESCE(cancelled_at, start_time) DESC
  `, params);

  let cancellationTotalSales = 0;
  for (const cn of cancelRes.rows) {
    cancellationTotalSales += Number(cn.cancelled_amount || 0);
  }

  // 6) Payment Type-wise Summary with Sales Total
  const paymentRes = await dbConn.query(`
    SELECT 
      COALESCE(payment_method, 'CASH') AS payment_method,
      COUNT(*)::int AS transaction_count,
      COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(cash_amount, 0) ELSE 0 END), 0)::numeric(12,3) AS cash_portion,
      COALESCE(SUM(CASE WHEN payment_method IN ('KNET', 'CARD') THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(knet_amount, 0) ELSE (CASE WHEN payment_method != 'CASH' THEN total_amount ELSE 0 END) END), 0)::numeric(12,3) AS knet_portion,
      COALESCE(SUM(total_amount), 0)::numeric(12,3) AS total_sales
    FROM rentals
    ${whereCompleted}
    GROUP BY COALESCE(payment_method, 'CASH')
    ORDER BY total_sales DESC
  `, params);

  let paymentTotalSales = 0;
  let paymentTotalTx = 0;
  for (const p of paymentRes.rows) {
    paymentTotalSales += Number(p.total_sales || 0);
    paymentTotalTx += parseInt(p.transaction_count || '0', 10);
  }

  // 7) Customer-wise Summary with Phone First
  await ensureCustomersTable(dbConn);
  const customerRes = await dbConn.query(`
    SELECT
      COALESCE(NULLIF(TRIM(r.customer_phone), ''), 'No Phone') AS customer_phone,
      COALESCE(
        MAX(c.name),
        MAX(CASE WHEN r.customer_name IS NOT NULL AND TRIM(r.customer_name) != '' AND LOWER(TRIM(r.customer_name)) != 'walk-in customer' THEN TRIM(r.customer_name) END),
        'Walk-in Customer'
      ) AS customer_name,
      COUNT(*)::int AS trip_count,
      COALESCE(SUM(r.duration_minutes), 0)::int AS total_minutes,
      COALESCE(SUM(CASE WHEN r.payment_method = 'CASH' THEN r.total_amount WHEN r.payment_method = 'SPLIT' THEN COALESCE(r.cash_amount, 0) ELSE 0 END), 0)::numeric(12,3) AS cash_total,
      COALESCE(SUM(CASE WHEN r.payment_method IN ('KNET', 'CARD') THEN r.total_amount WHEN r.payment_method = 'SPLIT' THEN COALESCE(r.knet_amount, 0) ELSE (CASE WHEN r.payment_method != 'CASH' THEN r.total_amount ELSE 0 END) END), 0)::numeric(12,3) AS knet_total,
      COALESCE(SUM(COALESCE(r.discount, 0)), 0)::numeric(12,3) AS discount_total,
      COALESCE(SUM(r.total_amount), 0)::numeric(12,3) AS total_sales
    FROM rentals r
    LEFT JOIN customers c ON c.phone = TRIM(r.customer_phone)
    ${whereCompleted.replace(/status/g, 'r.status').replace(/shift_id/g, 'r.shift_id').replace(/created_at/g, 'r.created_at')}
    GROUP BY COALESCE(NULLIF(TRIM(r.customer_phone), ''), 'No Phone')
    ORDER BY total_sales DESC
  `, params);

  let customerTotalSales = 0;
  let customerTotalTrips = 0;
  for (const cu of customerRes.rows) {
    customerTotalSales += Number(cu.total_sales || 0);
    customerTotalTrips += parseInt(cu.trip_count || '0', 10);
  }

  return {
    cashierSummary: {
      items: cashierRes.rows.map(r => ({
        cashier: r.cashier,
        billCount: parseInt(r.bill_count || '0', 10),
        cashTotal: Number(r.cash_total || 0).toFixed(3),
        knetTotal: Number(r.knet_total || 0).toFixed(3),
        discountTotal: Number(r.discount_total || 0).toFixed(3),
        totalSales: Number(r.total_sales || 0).toFixed(3),
      })),
      totalBills: cashierTotalBills,
      salesTotal: cashierTotalSales.toFixed(3)
    },
    billSummary: {
      items: billRes.rows.map(r => ({
        id: r.id,
        invoiceNo: r.invoice_no,
        carNo: r.car_no,
        model: r.model,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        startTime: r.start_time,
        actualEndTime: r.actual_end_time,
        durationMinutes: r.duration_minutes,
        paymentMethod: r.payment_method,
        cashAmount: Number(r.cash_amount || 0).toFixed(3),
        knetAmount: Number(r.knet_amount || 0).toFixed(3),
        discount: Number(r.discount || 0).toFixed(3),
        totalSales: Number(r.total_sales || 0).toFixed(3),
        cashier: r.cashier,
        status: r.status
      })),
      totalBills: billRes.rows.length,
      salesTotal: billTotalSales.toFixed(3)
    },
    carSummary: {
      items: carRes.rows.map(r => ({
        carNo: r.car_no,
        model: r.model,
        tripCount: parseInt(r.trip_count || '0', 10),
        totalMinutes: parseInt(r.total_minutes || '0', 10),
        cashTotal: Number(r.cash_total || 0).toFixed(3),
        knetTotal: Number(r.knet_total || 0).toFixed(3),
        totalSales: Number(r.total_sales || 0).toFixed(3),
      })),
      totalCars: carRes.rows.length,
      totalTrips: carTotalTrips,
      totalMinutes: carTotalMins,
      salesTotal: carTotalSales.toFixed(3)
    },
    hourlySummary: {
      items: hourlyRes.rows.map(r => ({
        hourSlot: r.hour_slot,
        hourLabel: r.hour_label,
        billCount: parseInt(r.bill_count || '0', 10),
        cashTotal: Number(r.cash_total || 0).toFixed(3),
        knetTotal: Number(r.knet_total || 0).toFixed(3),
        totalSales: Number(r.total_sales || 0).toFixed(3),
      })),
      totalBills: hourlyTotalBills,
      salesTotal: hourlyTotalSales.toFixed(3)
    },
    cancellationSummary: {
      items: cancelRes.rows.map(r => ({
        id: r.id,
        invoiceNo: r.invoice_no,
        carNo: r.car_no,
        model: r.model,
        customerName: r.customer_name,
        startTime: r.start_time,
        cancelledAt: r.cancelled_at,
        cancelledBy: r.cancelled_by,
        cancellationReason: r.cancellation_reason,
        cancelledAmount: Number(r.cancelled_amount || 0).toFixed(3),
      })),
      totalCancelledBills: cancelRes.rows.length,
      salesTotal: cancellationTotalSales.toFixed(3)
    },
    paymentTypeSummary: {
      items: paymentRes.rows.map(r => ({
        paymentMethod: r.payment_method,
        transactionCount: parseInt(r.transaction_count || '0', 10),
        cashPortion: Number(r.cash_portion || 0).toFixed(3),
        knetPortion: Number(r.knet_portion || 0).toFixed(3),
        totalSales: Number(r.total_sales || 0).toFixed(3),
        percentage: paymentTotalSales > 0 ? ((Number(r.total_sales || 0) / paymentTotalSales) * 100).toFixed(1) : '0.0'
      })),
      totalTransactions: paymentTotalTx,
      salesTotal: paymentTotalSales.toFixed(3)
    },
    customerSummary: {
      items: customerRes.rows.map(r => ({
        customerPhone: r.customer_phone,
        customerName: r.customer_name,
        tripCount: parseInt(r.trip_count || '0', 10),
        totalMinutes: parseInt(r.total_minutes || '0', 10),
        cashTotal: Number(r.cash_total || 0).toFixed(3),
        knetTotal: Number(r.knet_total || 0).toFixed(3),
        discountTotal: Number(r.discount_total || 0).toFixed(3),
        totalSales: Number(r.total_sales || 0).toFixed(3),
      })),
      totalCustomers: customerRes.rows.length,
      totalTrips: customerTotalTrips,
      salesTotal: customerTotalSales.toFixed(3)
    }
  };
}

app.get('/api/shifts/current', async (req: Request, res: Response) => {
  try {
    const activeSalesDate = await getActiveSalesDate(pool);
    const cashier = (req.query['cashier'] as string) || '';
    const userId = (req.query['userId'] as string) || '';
    const username = (req.query['username'] as string) || '';
    const branch = (req.query['branch'] as string) || 'Kiddie Kruzzer';
    const location = (req.query['location'] as string) || 'Avenues Mall -Phase -4- Gate 25';
    const terminal = (req.query['terminal'] as string) || 'POS-Terminal-1';
    const todayStr = (req.query['businessDate'] as string) || activeSalesDate;

    const shift = await getOrCreateActiveShift(pool, {
      userId,
      username,
      cashierName: cashier,
      branch,
      location,
      terminal,
      businessDate: todayStr,
    });

    // Calculate live totals for this shift from completed rentals in PostgreSQL
    const totalsRes = await pool.query(
      `SELECT 
        COUNT(*) AS total_rentals,
        COUNT(DISTINCT car_no) AS total_cars_used,
        COUNT(DISTINCT CASE WHEN (model LIKE '%Single%' OR car_model LIKE '%Single%') THEN car_no END) AS single_cars_used,
        COUNT(DISTINCT CASE WHEN (model LIKE '%Double%' OR car_model LIKE '%Double%') THEN car_no END) AS double_cars_used,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(cash_amount, 0) ELSE 0 END), 0) AS cash_total,
        COALESCE(SUM(CASE WHEN payment_method IN ('KNET', 'CARD') THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(knet_amount, 0) ELSE (CASE WHEN payment_method != 'CASH' THEN total_amount ELSE 0 END) END), 0) AS knet_total,
        COALESCE(SUM(COALESCE(discount, 0)), 0) AS total_discount,
        COALESCE(SUM(COALESCE(change_returned, 0)), 0) AS total_refund,
        COALESCE(SUM(total_amount), 0) AS overall_total
       FROM rentals
       WHERE shift_id = $1 AND status = 'COMPLETED'`,
      [shift.id]
    );

    const row = totalsRes.rows[0] || {};
    const totalRentals = parseInt(row.total_rentals || '0', 10);
    const totalCarsUsed = parseInt(row.total_cars_used || '0', 10);
    const singleCarsUsed = parseInt(row.single_cars_used || '0', 10);
    const doubleCarsUsed = parseInt(row.double_cars_used || '0', 10);
    const cashTotal = Number(row.cash_total || 0).toFixed(3);
    const knetTotal = Number(row.knet_total || 0).toFixed(3);
    const totalDiscount = Number(row.total_discount || 0).toFixed(3);
    const totalRefund = Number(row.total_refund || 0).toFixed(3);
    const overallTotal = Number(row.overall_total || 0).toFixed(3);

    // Compute the 6 comprehensive summaries for this shift
    const summaries = await getDetailedShiftSummaries(pool, { shiftId: shift.id });

    // Check if day is already closed
    const dayCloseCheck = await pool.query(`SELECT * FROM day_closes WHERE close_date = $1`, [shift.business_date || todayStr]);
    const isDayClosed = dayCloseCheck.rows.length > 0;

    res.json({
      id: shift.id,
      shiftNumber: shift.shift_number || 1,
      businessDate: shift.business_date || todayStr,
      cashierName: shift.cashier_name || cashier || 'Cashier',
      openedByUsername: shift.opened_by_username || shift.username,
      branchName: shift.branch_name || branch,
      locationName: shift.location_name || location,
      terminalInfo: shift.terminal_info || terminal,
      status: shift.status || 'OPEN',
      startTime: shift.start_time,
      totalRentals,
      totalCarsUsed,
      singleCarsUsed,
      doubleCarsUsed,
      cashTotal,
      knetTotal,
      totalDiscount,
      totalRefund,
      overallTotal,
      readyForDayClose: false,
      isDayClosed,
      summaries,
    });
  } catch (err: any) {
    console.error('Error in GET /api/shifts/current:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/shifts/open', async (req: Request, res: Response) => {
  try {
    const activeSalesDate = await getActiveSalesDate(pool);
    const { cashierName, userId, username, branch, location, terminal, openingCash, notes, businessDate } = req.body;
    const shift = await getOrCreateActiveShift(pool, {
      userId,
      username,
      cashierName,
      branch,
      location,
      terminal,
      businessDate: businessDate || activeSalesDate,
    });
    res.json(shift);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/shifts/close', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const activeSalesDate = await getActiveSalesDate(client);
    const { notes, cashierName, userId, username, branch, location, terminal, language, shiftId, businessDate } = req.body;
    const todayStr = businessDate || activeSalesDate;
    const effBranch = branch || 'Kiddie Kruzzer';
    const effLoc = location || 'Avenues Mall -Phase -4- Gate 25';
    const effTerm = terminal || 'POS-Terminal-1';

    // 1. Find the current OPEN shift for this location/terminal & sales date
    let openRes: any = null;
    if (shiftId) {
      openRes = await client.query(
        `SELECT * FROM shifts WHERE id = $1 AND status = 'OPEN'`,
        [shiftId]
      );
    }
    if (!openRes || openRes.rowCount === 0) {
      openRes = await client.query(
        `SELECT * FROM shifts 
         WHERE status = 'OPEN' 
           AND business_date = $1 
           AND (location_name = $2 OR location_name IS NULL OR $2 = '')
         ORDER BY start_time DESC LIMIT 1`,
        [todayStr, effLoc]
      );
    }

    if (openRes.rowCount === 0) {
      openRes = await client.query(
        `SELECT * FROM shifts WHERE status = 'OPEN' ORDER BY start_time DESC LIMIT 1`
      );
    }

    if (openRes.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'No active open shift found to close.' });
      return;
    }

    const activeShift = openRes.rows[0];

    // 2. Compute final financial figures for this shift (completed rentals only)
    const totalsRes = await client.query(
      `SELECT 
        COUNT(*) AS total_rentals,
        COUNT(DISTINCT car_no) AS total_cars_used,
        COUNT(DISTINCT CASE WHEN (model LIKE '%Single%' OR car_model LIKE '%Single%') THEN car_no END) AS single_cars_used,
        COUNT(DISTINCT CASE WHEN (model LIKE '%Double%' OR car_model LIKE '%Double%') THEN car_no END) AS double_cars_used,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(cash_amount, 0) ELSE 0 END), 0) AS cash_total,
        COALESCE(SUM(CASE WHEN payment_method IN ('KNET', 'CARD') THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(knet_amount, 0) ELSE (CASE WHEN payment_method != 'CASH' THEN total_amount ELSE 0 END) END), 0) AS knet_total,
        COALESCE(SUM(COALESCE(discount, 0)), 0) AS total_discount,
        COALESCE(SUM(COALESCE(change_returned, 0)), 0) AS total_refund,
        COALESCE(SUM(total_amount), 0) AS overall_total
       FROM rentals
       WHERE shift_id = $1 AND status = 'COMPLETED'`,
      [activeShift.id]
    );

    const row = totalsRes.rows[0] || {};
    const totalRentals = parseInt(row.total_rentals || '0', 10);
    const totalCarsUsed = parseInt(row.total_cars_used || '0', 10);
    const singleCarsUsed = parseInt(row.single_cars_used || '0', 10);
    const doubleCarsUsed = parseInt(row.double_cars_used || '0', 10);
    const cashTotal = Number(row.cash_total || 0).toFixed(3);
    const knetTotal = Number(row.knet_total || 0).toFixed(3);
    const totalDiscount = Number(row.total_discount || 0).toFixed(3);
    const totalRefund = Number(row.total_refund || 0).toFixed(3);
    const overallTotal = Number(row.overall_total || 0).toFixed(3);

    const closingUserName = username || cashierName || activeShift.cashier_name || 'Cashier';
    const closingDisplayName = cashierName || username || activeShift.cashier_name || 'Cashier';

    // 3. Update the shift record to CLOSED
    const updateRes = await client.query(
      `UPDATE shifts SET 
        status = 'CLOSED',
        end_time = NOW(),
        closed_by_user_id = $2,
        closed_by_username = $3,
        closed_by_name = $4,
        total_rentals = $5,
        cash_total = $6,
        knet_total = $7,
        total_discount = $8,
        total_refund = $9,
        overall_total = $10,
        notes = COALESCE($11, notes),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        activeShift.id,
        userId || null,
        closingUserName,
        closingDisplayName,
        totalRentals,
        cashTotal,
        knetTotal,
        totalDiscount,
        totalRefund,
        overallTotal,
        notes || 'Shift closed successfully'
      ]
    );

    const closedShift = updateRes.rows[0];

    // 4. Log SHIFT_CLOSE in audit_logs
    await logAudit(client, {
      userId: userId || null,
      username: closingUserName,
      shiftId: closedShift.id,
      branch: effBranch,
      location: effLoc,
      terminal: effTerm,
      action: 'SHIFT_CLOSE',
      entityType: 'SHIFT',
      entityId: closedShift.id,
      remarks: `Shift #${closedShift.shift_number} closed by ${closingDisplayName}. Total: ${overallTotal} KD, Rentals: ${totalRentals}, Cars Used: ${totalCarsUsed}`,
    });

    await client.query('COMMIT');

    // 5. Automatically dispatch ESC/POS Thermal Print for the closed shift
    let printResult: any = null;
    let summaries: any = null;
    try {
      summaries = await getDetailedShiftSummaries(pool, { shiftId: closedShift.id });
    } catch (sErr) {
      console.warn('Could not compute summaries on shift close:', sErr);
    }

    try {
      const printerConfig = await resolvePrinterConfig({
        branch: closedShift.branch_name || effBranch,
        location: closedShift.location_name || effLoc,
        terminal: closedShift.terminal_info || effTerm,
        printType: 'SHIFT_CLOSE',
      });

      const rawLang = String(language || req.headers['x-language'] || 'BOTH').toUpperCase();
      const printLang: 'EN' | 'AR' | 'BOTH' = (rawLang === 'EN' || rawLang === 'AR' || rawLang === 'BOTH') ? rawLang : 'BOTH';

      const thermalPayload: ThermalPrintPayload = {
        printType: 'SHIFT_CLOSE',
        language: printLang,
        branchName: closedShift.branch_name || printerConfig.branchName || effBranch,
        locationName: closedShift.location_name || printerConfig.locationName || effLoc,
        terminal: closedShift.terminal_info || effTerm,
        cashierName: closedShift.closed_by_name || closedShift.cashier_name || closingDisplayName,
        companyName: 'Your Events Management Company',
        shiftData: {
          id: closedShift.id,
          shiftNumber: closedShift.shift_number,
          businessDate: closedShift.business_date,
          startTime: closedShift.start_time,
          endTime: closedShift.end_time,
          cashierName: closedShift.closed_by_name || closedShift.cashier_name || closingDisplayName,
          branchName: closedShift.branch_name || effBranch,
          locationName: closedShift.location_name || effLoc,
          terminalInfo: closedShift.terminal_info || effTerm,
          totalRentals: closedShift.total_rentals,
          totalCarsUsed,
          cashTotal: closedShift.cash_total,
          knetTotal: closedShift.knet_total,
          totalDiscount: closedShift.total_discount,
          totalRefund: closedShift.total_refund,
          overallTotal: closedShift.overall_total,
          notes: closedShift.notes,
          summaries,
        }
      };

      printResult = await ThermalPrinterService.sendToPrinter(thermalPayload, printerConfig);
    } catch (printErr: any) {
      console.warn('Shift close thermal print notice:', printErr.message);
      printResult = { success: false, error: printErr.message, message: 'Printer offline or unreachable' };
    }

    try {
      await pool.query(
        `INSERT INTO print_audit_logs (invoice_no, action, username, location_name, terminal_info, printer_name, printer_type, status, error_message, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          closedShift.id,
          'SHIFT_CLOSE_REPORT_PRINT',
          closingUserName,
          effLoc,
          effTerm,
          'Thermal Printer',
          'USB/LAN',
          printResult?.success ? 'SUCCESS' : 'FAILED',
          printResult?.error || null,
          printResult?.message || `Shift #${closedShift.shift_number} closing report print`
        ]
      );
    } catch (auditErr) {
      console.warn('Could not record shift close in print_audit_logs:', auditErr);
    }

    res.json({
      success: true,
      message: 'Shift closed successfully.',
      closedShift,
      totalCarsUsed,
      singleCarsUsed,
      doubleCarsUsed,
      summaries,
      printStatus: printResult,
      requiresLogout: true,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error closing shift:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Shift Report Endpoint for daily operations and historical inquiry
app.get('/api/shifts/report', async (req: Request, res: Response) => {
  try {
    const activeSalesDate = await getActiveSalesDate(pool);
    const shiftId = req.query['shiftId'] as string;
    const date = (req.query['date'] as string) || (req.query['businessDate'] as string) || activeSalesDate;
    const shiftNumber = req.query['shiftNumber'] ? parseInt(req.query['shiftNumber'] as string, 10) : undefined;

    let shiftRow: any = null;
    if (shiftId) {
      const sRes = await pool.query(`SELECT * FROM shifts WHERE id = $1`, [shiftId]);
      shiftRow = sRes.rows[0];
    } else if (shiftNumber) {
      const sRes = await pool.query(
        `SELECT * FROM shifts WHERE business_date = $1 AND shift_number = $2 ORDER BY start_time DESC LIMIT 1`,
        [date, shiftNumber]
      );
      shiftRow = sRes.rows[0];
    } else {
      const sRes = await pool.query(
        `SELECT * FROM shifts WHERE business_date = $1 ORDER BY shift_number DESC LIMIT 1`,
        [date]
      );
      shiftRow = sRes.rows[0];
    }

    if (!shiftRow) {
      res.status(404).json({ error: 'Shift report not found for the requested parameters.' });
      return;
    }

    // Aggregate shift stats
    const statsRes = await pool.query(
      `SELECT 
        COUNT(*) AS total_rentals,
        COUNT(DISTINCT car_no) AS total_cars_used,
        COUNT(DISTINCT CASE WHEN (model LIKE '%Single%' OR car_model LIKE '%Single%') THEN car_no END) AS single_cars_used,
        COUNT(DISTINCT CASE WHEN (model LIKE '%Double%' OR car_model LIKE '%Double%') THEN car_no END) AS double_cars_used,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(cash_amount, 0) ELSE 0 END), 0) AS cash_total,
        COALESCE(SUM(CASE WHEN payment_method IN ('KNET', 'CARD') THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(knet_amount, 0) ELSE (CASE WHEN payment_method != 'CASH' THEN total_amount ELSE 0 END) END), 0) AS knet_total,
        COALESCE(SUM(COALESCE(discount, 0)), 0) AS total_discount,
        COALESCE(SUM(COALESCE(change_returned, 0)), 0) AS total_refund,
        COALESCE(SUM(total_amount), 0) AS overall_total
       FROM rentals
       WHERE shift_id = $1 AND status = 'COMPLETED'`,
      [shiftRow.id]
    );

    const stats = statsRes.rows[0] || {};

    // Get itemized completed rentals for this shift
    const rentalsRes = await pool.query(
      `SELECT id, invoice_no, car_no, model, COALESCE(car_model, model) AS car_model, customer_name, start_time, actual_end_time, 
              COALESCE(elapsed_duration, ROUND(EXTRACT(EPOCH FROM (COALESCE(actual_end_time, NOW()) - start_time))/60), duration_minutes) AS elapsed_duration, 
              duration_minutes, payment_method, cash_amount, knet_amount, deposit_amount, rental_amount, extra_amount, discount, discount_type, discount_reason, total_amount, status
       FROM rentals
       WHERE shift_id = $1
       ORDER BY start_time ASC`,
      [shiftRow.id]
    );

    const summaries = await getDetailedShiftSummaries(pool, { shiftId: shiftRow.id });

    res.json({
      shift: shiftRow,
      financials: {
        totalRentals: parseInt(stats.total_rentals || '0', 10),
        totalCarsUsed: parseInt(stats.total_cars_used || '0', 10),
        singleCarsUsed: parseInt(stats.single_cars_used || '0', 10),
        doubleCarsUsed: parseInt(stats.double_cars_used || '0', 10),
        cashTotal: Number(stats.cash_total || 0).toFixed(3),
        knetTotal: Number(stats.knet_total || 0).toFixed(3),
        totalDiscount: Number(stats.total_discount || 0).toFixed(3),
        totalRefund: Number(stats.total_refund || 0).toFixed(3),
        overallTotal: Number(stats.overall_total || 0).toFixed(3),
      },
      rentals: rentalsRes.rows,
      summaries
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Shift Report Thermal Print On-Demand
app.post('/api/shifts/:id/print-thermal', async (req: Request, res: Response) => {
  try {
    const shiftId = req.params['id'];
    const sRes = await pool.query(`SELECT * FROM shifts WHERE id = $1`, [shiftId]);
    if (sRes.rowCount === 0) {
      res.status(404).json({ error: 'Shift not found.' });
      return;
    }
    const shift = sRes.rows[0];

    const statsRes = await pool.query(
      `SELECT 
        COUNT(*) AS total_rentals,
        COUNT(DISTINCT car_no) AS total_cars_used,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(cash_amount, 0) ELSE 0 END), 0) AS cash_total,
        COALESCE(SUM(CASE WHEN payment_method IN ('KNET', 'CARD') THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(knet_amount, 0) ELSE (CASE WHEN payment_method != 'CASH' THEN total_amount ELSE 0 END) END), 0) AS knet_total,
        COALESCE(SUM(COALESCE(discount, 0)), 0) AS total_discount,
        COALESCE(SUM(COALESCE(change_returned, 0)), 0) AS total_refund,
        COALESCE(SUM(total_amount), 0) AS overall_total
       FROM rentals
       WHERE shift_id = $1 AND status = 'COMPLETED'`,
      [shift.id]
    );
    const stats = statsRes.rows[0] || {};

    const summaries = await getDetailedShiftSummaries(pool, { shiftId: shift.id });

    const printerConfig = await resolvePrinterConfig({
      branch: shift.branch_name,
      location: shift.location_name,
      terminal: shift.terminal_info,
      printType: 'SHIFT_CLOSE',
    });

    const thermalPayload: ThermalPrintPayload = {
      printType: 'SHIFT_CLOSE',
      language: 'BOTH',
      branchName: shift.branch_name || printerConfig.branchName || 'Kiddie Kruzzer',
      locationName: shift.location_name || printerConfig.locationName || 'Avenues Mall -Phase -4- Gate 25',
      terminal: shift.terminal_info || 'POS-Terminal-1',
      cashierName: shift.closed_by_name || shift.cashier_name || 'Cashier',
      companyName: 'Your Events Management Company',
      shiftData: {
        id: shift.id,
        shiftNumber: shift.shift_number,
        businessDate: shift.business_date,
        startTime: shift.start_time,
        endTime: shift.end_time || new Date(),
        cashierName: shift.closed_by_name || shift.cashier_name || 'Cashier',
        branchName: shift.branch_name || 'Kiddie Kruzzer',
        locationName: shift.location_name || 'Avenues Mall -Phase -4- Gate 25',
        terminalInfo: shift.terminal_info || 'POS-Terminal-1',
        totalRentals: parseInt(stats.total_rentals || '0', 10),
        totalCarsUsed: parseInt(stats.total_cars_used || '0', 10),
        cashTotal: Number(stats.cash_total || 0).toFixed(3),
        knetTotal: Number(stats.knet_total || 0).toFixed(3),
        totalDiscount: Number(stats.total_discount || 0).toFixed(3),
        totalRefund: Number(stats.total_refund || 0).toFixed(3),
        overallTotal: Number(stats.overall_total || 0).toFixed(3),
        notes: shift.notes,
        summaries,
      }
    };

    const printResult = await ThermalPrinterService.sendToPrinter(thermalPayload, printerConfig);
    res.json({ success: true, printResult });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Rentals / POS Endpoints
// ----------------------------------------------------
app.get('/api/rentals', async (req: Request, res: Response) => {
  try {
    const { status, date } = req.query;
    let query = `
      SELECT 
        r.*,
        s.business_date,
        s.shift_number
      FROM rentals r
      LEFT JOIN shifts s ON r.shift_id = s.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (status && status !== 'ALL') {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    if (date && date !== 'ALL') {
      params.push(date);
      conditions.push(`(s.business_date = $${params.length} OR TO_CHAR(COALESCE(r.start_time, r.created_at), 'YYYY-MM-DD') = $${params.length})`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY r.start_time DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CUSTOMERS MASTER & PHONE LOOKUP ENDPOINTS
// ==========================================
let customersTableEnsured = false;
async function ensureCustomersTable(dbConn: any = pool): Promise<void> {
  if (customersTableEnsured) return;
  try {
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        phone TEXT NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        total_visits INTEGER NOT NULL DEFAULT 1,
        total_spent NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
        last_visit_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE customers ALTER COLUMN phone TYPE TEXT;
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
      CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(LOWER(name));
    `);
    customersTableEnsured = true;
  } catch (err: any) {
    console.warn('Warning ensuring customers table:', err.message);
  }
}

app.get('/api/customers', async (req: Request, res: Response) => {
  try {
    await ensureCustomersTable(pool);
    const q = String(req.query['search'] || req.query['q'] || req.query['phone'] || '').trim();
    if (!q) {
      const result = await pool.query(`
        SELECT id, phone, name, total_visits, total_spent, last_visit_at, status
        FROM customers
        WHERE status = 'ACTIVE'
        ORDER BY last_visit_at DESC NULLS LAST, total_visits DESC
        LIMIT 200
      `);
      res.json(result.rows);
      return;
    }

    const result = await pool.query(`
      SELECT id, phone, name, total_visits, total_spent, last_visit_at, status
      FROM customers
      WHERE status = 'ACTIVE'
        AND (phone ILIKE $1 OR name ILIKE $1)
      ORDER BY
        CASE
          WHEN phone = $2 THEN 0
          WHEN phone ILIKE $3 THEN 1
          ELSE 2
        END,
        last_visit_at DESC NULLS LAST,
        total_visits DESC
      LIMIT 50
    `, [`%${q}%`, q, `${q}%`]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/search', async (req: Request, res: Response) => {
  try {
    await ensureCustomersTable(pool);
    const q = String(req.query['phone'] || req.query['q'] || req.query['search'] || '').trim();
    if (!q) {
      const result = await pool.query(`
        SELECT id, phone, name, total_visits, total_spent, last_visit_at, status
        FROM customers
        WHERE status = 'ACTIVE'
        ORDER BY last_visit_at DESC NULLS LAST, total_visits DESC
        LIMIT 50
      `);
      res.json(result.rows);
      return;
    }

    const result = await pool.query(`
      SELECT id, phone, name, total_visits, total_spent, last_visit_at, status
      FROM customers
      WHERE status = 'ACTIVE'
        AND (phone ILIKE $1 OR name ILIKE $1)
      ORDER BY
        CASE
          WHEN phone = $2 THEN 0
          WHEN phone ILIKE $3 THEN 1
          ELSE 2
        END,
        last_visit_at DESC NULLS LAST,
        total_visits DESC
      LIMIT 30
    `, [`%${q}%`, q, `${q}%`]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/by-phone/:phone', async (req: Request, res: Response) => {
  try {
    await ensureCustomersTable(pool);
    const phone = String(req.params['phone'] || '').trim();
    if (!phone) {
      res.json({ exactMatch: null, matches: [] });
      return;
    }

    const exactRes = await pool.query(`
      SELECT id, phone, name, total_visits, total_spent, last_visit_at
      FROM customers
      WHERE phone = $1 AND status = 'ACTIVE'
      LIMIT 1
    `, [phone]);

    const matchesRes = await pool.query(`
      SELECT id, phone, name, total_visits, total_spent, last_visit_at
      FROM customers
      WHERE status = 'ACTIVE' AND phone ILIKE $1
      ORDER BY
        CASE WHEN phone = $2 THEN 0 WHEN phone ILIKE $3 THEN 1 ELSE 2 END,
        last_visit_at DESC NULLS LAST
      LIMIT 15
    `, [`%${phone}%`, phone, `${phone}%`]);

    res.json({
      exactMatch: exactRes.rows[0] || null,
      matches: matchesRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rentals', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      carId,
      carNo,
      model,
      rateId,
      customerName,
      customerPhone,
      durationMinutes,
      rentalAmount,
      discount,
      totalAmount,
      paymentMethod,
      cashAmount,
      knetAmount,
      discountReason,
      shiftId,
      createdBy,
      terminal,
      location,
      branch,
      language,
      printBillCopy,
    } = req.body;

    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const startTime = new Date();
    const duration = Number(durationMinutes) || 15;
    const expectedEndTime = new Date(startTime.getTime() + duration * 60000);

    // Ensure active shift exists and is currently OPEN
    let effectiveShiftId = shiftId;
    let effectiveShiftNum = 1;
    if (effectiveShiftId) {
      const checkShift = await client.query('SELECT id, shift_number, status FROM shifts WHERE id = $1', [effectiveShiftId]);
      if (checkShift.rowCount > 0 && checkShift.rows[0].status === 'OPEN') {
        effectiveShiftNum = checkShift.rows[0].shift_number;
      } else {
        effectiveShiftId = null;
      }
    }

    if (!effectiveShiftId) {
      const activeSalesDate = await getActiveSalesDate(client);
      const currentShift = await getOrCreateActiveShift(client, {
        userId: (req.headers['x-user-id'] as string) || undefined,
        username: (req.body.username as string) || createdBy || 'Cashier',
        cashierName: createdBy || 'Cashier',
        branch: branch,
        location: location,
        terminal: terminal,
        businessDate: activeSalesDate
      });
      if (currentShift && currentShift.id) {
        effectiveShiftId = currentShift.id;
        effectiveShiftNum = currentShift.shift_number || 1;
      }
    }

    const upfrontDeposit = rentalAmount || 0;
    const rawMethod = String(paymentMethod || 'CASH').toUpperCase();
    const finalMethod = ['CASH', 'CARD', 'KNET', 'SPLIT'].includes(rawMethod) ? rawMethod : 'CASH';
    const finalCash = finalMethod === 'SPLIT' 
      ? Number(cashAmount || 0) 
      : (finalMethod === 'CASH' ? upfrontDeposit : 0);
    const finalKnet = finalMethod === 'SPLIT'
      ? Number(knetAmount || 0)
      : (finalMethod !== 'CASH' ? upfrontDeposit : 0);

    // Resolve and synchronize canonical customer by phone number to avoid junk entries
    const cleanPhone = String(customerPhone || '').trim();
    const rawName = String(customerName || '').trim();
    let canonicalName = rawName || 'Walk-in Customer';

    if (cleanPhone) {
      await ensureCustomersTable(client);
      const existingCust = await client.query(
        `SELECT id, phone, name FROM customers WHERE phone = $1 LIMIT 1`,
        [cleanPhone]
      );
      if (existingCust.rowCount && existingCust.rowCount > 0) {
        const storedName = String(existingCust.rows[0].name || '').trim();
        const isRawWalkIn = !rawName || rawName.toLowerCase() === 'walk-in customer';
        const isStoredWalkIn = !storedName || storedName.toLowerCase() === 'walk-in customer';

        if (!isStoredWalkIn && isRawWalkIn) {
          // Automatically use existing canonical customer name for this phone
          canonicalName = storedName;
          await client.query(
            `UPDATE customers SET total_visits = COALESCE(total_visits, 0) + 1, last_visit_at = NOW(), updated_at = NOW() WHERE phone = $1`,
            [cleanPhone]
          );
        } else if (!isRawWalkIn && (isStoredWalkIn || req.body.updateCustomerName === true)) {
          // Update customer master if previous name was walk-in or user explicitly edited name
          canonicalName = rawName;
          await client.query(
            `UPDATE customers SET name = $1, total_visits = COALESCE(total_visits, 0) + 1, last_visit_at = NOW(), updated_at = NOW() WHERE phone = $2`,
            [canonicalName, cleanPhone]
          );
          await client.query(
            `UPDATE rentals SET customer_name = $1 WHERE TRIM(customer_phone) = $2`,
            [canonicalName, cleanPhone]
          );
        } else {
          // Keep existing canonical name to prevent duplicate/junk variations for the same phone
          canonicalName = !isStoredWalkIn ? storedName : (rawName || 'Walk-in Customer');
          await client.query(
            `UPDATE customers SET total_visits = COALESCE(total_visits, 0) + 1, last_visit_at = NOW(), updated_at = NOW() WHERE phone = $1`,
            [cleanPhone]
          );
        }
      } else {
        // Customer does not exist yet: insert as a new customer in customers master table
        await client.query(
          `INSERT INTO customers (phone, name, total_visits, total_spent, last_visit_at, status)
           VALUES ($1, $2, 1, $3, NOW(), 'ACTIVE')
           ON CONFLICT (phone) DO UPDATE SET
             total_visits = COALESCE(customers.total_visits, 0) + 1,
             last_visit_at = NOW(),
             updated_at = NOW()`,
          [cleanPhone, canonicalName, upfrontDeposit]
        );
      }
    }

    // Fetch current configured grace period from grace_periods table (default 10 mins for Single & Double)
    const activeGraceRes = await client.query(
      `SELECT minutes FROM grace_periods
       WHERE UPPER(COALESCE(status, 'ACTIVE')) IN ('ACTIVE', 'AVAILABLE')
       ORDER BY updated_at DESC NULLS LAST, minutes DESC
       LIMIT 1`
    );
    const configuredGraceMins = activeGraceRes.rowCount && activeGraceRes.rowCount > 0
      ? Number(activeGraceRes.rows[0].minutes ?? 10)
      : 10;

    const rentalRes = await client.query(
      `INSERT INTO rentals (
        invoice_no, car_id, car_no, model, rate_id, customer_name, customer_phone,
        start_time, duration_minutes, grace_period_minutes, expected_end_time, rental_amount, deposit_amount, discount,
        total_amount, payment_method, status, shift_id, shift_number, created_by,
        cash_amount, knet_amount, discount_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'ACTIVE', $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        invoiceNo,
        carId,
        carNo,
        model,
        rateId,
        canonicalName,
        cleanPhone,
        startTime,
        duration,
        configuredGraceMins,
        expectedEndTime,
        rentalAmount,
        upfrontDeposit,
        discount || 0,
        totalAmount || rentalAmount,
        finalMethod,
        effectiveShiftId || null,
        effectiveShiftNum || 1,
        createdBy || 'Cashier',
        finalCash,
        finalKnet,
        discountReason || null,
      ]
    );

    // Update car status to 'Rented' in PostgreSQL
    await client.query('UPDATE cars SET status = $1, updated_at = NOW() WHERE id = $2', ['Rented', carId]);

    // Insert universal audit log for start rental action
    try {
      await client.query(
        `INSERT INTO audit_logs (action, entity_type, entity_id, old_values, new_values, username, branch, location, terminal, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          'START_RENTAL',
          'RENTAL',
          invoiceNo,
          JSON.stringify({ carId, carNo, status: 'Available' }),
          JSON.stringify({
            carId,
            carNo,
            customerName: customerName || 'Walk-in Customer',
            rentalAmount,
            depositAmount: upfrontDeposit,
            status: 'ACTIVE',
            startTime: startTime.toISOString(),
          }),
          createdBy || 'Cashier',
          branch || 'Kiddie Kruzzer',
          location || 'Avenues Mall -Phase -4- Gate 25',
          terminal || 'POS-Terminal-1',
          `New rental punched for Car #${carNo} (${model}). Upfront deposit: ${upfrontDeposit} KWD.`
        ]
      );
    } catch (auditErr) {
      console.warn('Could not record start rental in audit_logs:', auditErr);
    }

    await client.query('COMMIT');
    const newRental = rentalRes.rows[0];

    // Direct Thermal Printing for Start Rental / Punching (Configuration Based)
    const printerConfig = await resolvePrinterConfig({
      branch: branch || 'Kiddie Kruzzer',
      location: location || 'Avenues Mall -Phase -4- Gate 25',
      terminal: terminal || 'POS-Terminal-1',
      printType: 'RECEIPT',
    });

    const shouldPrint = printBillCopy !== undefined ? Boolean(printBillCopy) : (printerConfig.printOnStart !== false);

    let printResult: any = null;
    if (shouldPrint) {
      const rawLang = String(language || req.headers['x-language'] || 'BOTH').toUpperCase();
      const printLang: 'EN' | 'AR' | 'BOTH' = (rawLang === 'EN' || rawLang === 'AR' || rawLang === 'BOTH') ? rawLang : (rawLang === 'ARABIC' ? 'AR' : 'BOTH');

      const printPayload: ThermalPrintPayload = {
        printType: 'RECEIPT',
        language: printLang,
        invoiceNo: newRental.invoice_no,
        rental: newRental,
        startTime: newRental.start_time || startTime,
        endTime: newRental.expected_end_time || expectedEndTime,
        settledAt: startTime.toLocaleString(),
        cashierName: createdBy || 'Cashier',
        terminal: terminal || 'POS-Terminal-1',
        locationName: location || printerConfig.locationName || 'Avenues Mall -Phase -4- Gate 25',
        branchName: branch || printerConfig.branchName || 'Kiddie Kruzzer',
        companyName: 'Your Events Management Company',
        elapsedDuration: `${duration} Mins`,
        depositAmount: upfrontDeposit,
        finalAmount: upfrontDeposit,
        paymentMethod: paymentMethod || 'CASH',
      };

      try {
        printResult = await ThermalPrinterService.sendToPrinter(printPayload, printerConfig);
      } catch (printErr: any) {
        console.error('Direct thermal print error on start rental:', printErr);
        printResult = { success: false, error: printErr.message || 'Thermal printer error', message: 'Printer offline or unreachable' };
      }

      try {
        await pool.query(
          `INSERT INTO print_audit_logs (invoice_no, action, username, location_name, terminal_info, printer_name, printer_type, status, error_message, remarks)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            newRental.invoice_no,
            'START_RENTAL_RECEIPT_PRINT',
            createdBy || 'Cashier',
            location || printerConfig.locationName || 'Avenues Mall -Phase -4- Gate 25',
            terminal || 'POS-Terminal-1',
            printerConfig.printerName,
            printerConfig.interfaceType,
            printResult.success ? 'SUCCESS' : 'FAILED',
            printResult.error || null,
            `Start rental deposit receipt print on punching (${printResult.latencyMs || 0}ms)`
          ]
        );
      } catch (auditErr) {
        console.warn('Could not record start rental print audit log:', auditErr);
      }
    }

    res.json({
      ...newRental,
      carId: newRental.car_id,
      carNo: newRental.car_no,
      startTime: newRental.start_time,
      rentalAmount: newRental.rental_amount,
      depositAmount: newRental.deposit_amount,
      totalAmount: newRental.total_amount,
      customerName: newRental.customer_name,
      customerPhone: newRental.customer_phone,
      printStatus: printResult,
      billCopyPrinted: shouldPrint && (printResult?.success || false),
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/rentals/:id/settle', async (req: Request, res: Response) => {
  const userRole = ((req.headers['x-user-role'] as string) || (req.query['role'] as string) || 'ADMIN').toUpperCase().trim();
  const userId = (req.headers['x-user-id'] as string) || (req.query['userId'] as string);
  if (userRole !== 'ADMIN' && userRole !== 'CASHIER' && userRole !== 'MANAGER' && userRole !== 'STAFF') {
    const allowed = await checkUserPermission(userId, userRole, 'POS', 'EXECUTE');
    if (!allowed) {
      res.status(403).json({ error: 'Access Denied: You do not have permission to settle rentals.' });
      return;
    }
  }

  const idParam = String(req.params['id'] || '').trim();
  const {
    actualEndTime,
    extraAmount,
    discount,
    discountType,
    discountValue,
    discountReason,
    settlementRemarks,
    remarks,
    totalAmount,
    paymentMethod,
    cashAmount,
    knetAmount,
    username,
    terminal,
    location,
    branch,
    elapsedDuration,
    depositAmount,
    changeReturned,
    language,
    carId: reqCarId,
    carNo: reqCarNo,
    invoiceNo: reqInvoiceNo,
    rentalId: reqRentalId,
  } = req.body;

  const finalRemarks = settlementRemarks || remarks || null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Robust multi-key lookup: matches by rental ID, invoice no, car ID, or car number
    const rentalQuery = await client.query(
      `SELECT * FROM rentals 
       WHERE (
         id::text = $1::text 
         OR invoice_no::text = $1::text 
         OR car_id::text = $1::text 
         OR car_no::text = $1::text
         OR ($2::text IS NOT NULL AND car_id::text = $2::text)
         OR ($3::text IS NOT NULL AND car_no::text = $3::text)
         OR ($4::text IS NOT NULL AND invoice_no::text = $4::text)
         OR ($5::text IS NOT NULL AND id::text = $5::text)
       ) 
       AND status = 'ACTIVE' 
       ORDER BY start_time DESC LIMIT 1`,
      [
        idParam,
        reqCarId ? String(reqCarId).trim() : null,
        reqCarNo ? String(reqCarNo).trim() : null,
        reqInvoiceNo ? String(reqInvoiceNo).trim() : null,
        reqRentalId ? String(reqRentalId).trim() : null
      ]
    );

    if (rentalQuery.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Active rental not found for settlement.' });
      return;
    }

    const rental = rentalQuery.rows[0];
    const userStr = username || rental.created_by || 'Cashier';
    const now = actualEndTime ? new Date(actualEndTime) : new Date();

    // -------------------------------------------------------------------------
    // SERVER-SIDE CONFIGURATION-BASED RATE & GRACE PERIOD CALCULATION
    // Formula: Billable Time = Total Elapsed Minutes - Configured Grace Minutes
    // - Up to Grace Minutes (e.g. <= 10 mins): 0.000 KD
    // - Up to 60 + Grace Minutes (e.g. <= 70 mins / 1 hr 10 mins): 1st Hour Base Rate ONLY
    //   (Single = 1.000 KD, Double = 2.000 KD; e.g. 1 hr 05 mins = 65 mins -> 65 - 10 = 55 <= 60 -> 1.000 KD)
    // - Above 60 + Grace Minutes (e.g. >= 71 mins / 1 hr 11 mins):
    //   Extra Half Hours = ceil((ElapsedMins - 60 - GraceMins) / 30) * HalfHourRate
    // -------------------------------------------------------------------------
    const gpRes = await client.query(
      `SELECT minutes FROM grace_periods
       WHERE UPPER(COALESCE(status, 'ACTIVE')) IN ('ACTIVE', 'AVAILABLE')
       ORDER BY updated_at DESC NULLS LAST, minutes DESC
       LIMIT 1`
    );
    const graceMins = gpRes.rowCount && gpRes.rowCount > 0 && gpRes.rows[0].minutes !== null
      ? Number(gpRes.rows[0].minutes)
      : Number(rental.grace_period_minutes ?? 10);

    const ratesRes = await client.query(
      `SELECT id, model_id, model, duration, amount, status
       FROM rates
       WHERE UPPER(COALESCE(status, 'ACTIVE')) IN ('ACTIVE', 'AVAILABLE')
       ORDER BY duration DESC`
    );
    const activeRates = ratesRes.rows || [];

    // Resolve car model & whether it is Double or Single
    let modelStr = String(rental.model || '').trim().toLowerCase();
    let modelIdStr = '';
    if (!modelStr && (rental.car_id || rental.car_no)) {
      const carLookup = await client.query(
        `SELECT model, model_id FROM cars WHERE id::text = $1::text OR car_no::text = $2::text LIMIT 1`,
        [String(rental.car_id || ''), String(rental.car_no || '')]
      );
      if (carLookup.rowCount && carLookup.rowCount > 0) {
        modelStr = String(carLookup.rows[0].model || '').trim().toLowerCase();
        modelIdStr = String(carLookup.rows[0].model_id || '').trim();
      }
    }
    const isDouble = modelStr.includes('double');

    // Match 60-minute base rate from configuration table
    const baseRateRow =
      activeRates.find(rt => modelIdStr && String(rt.model_id || '') === modelIdStr && Number(rt.duration) === 60) ||
      activeRates.find(rt => modelStr && String(rt.model || '').trim().toLowerCase() === modelStr && Number(rt.duration) === 60) ||
      activeRates.find(rt => {
        const m = String(rt.model || '').toLowerCase();
        return (isDouble ? m.includes('double') : m.includes('single')) && Number(rt.duration) === 60;
      });
    const configuredBaseRate = baseRateRow && Number(baseRateRow.amount) > 0
      ? Number(baseRateRow.amount)
      : (isDouble ? 2.000 : 1.000);

    // Match 30-minute half-hour rate from configuration table
    const halfHourRateRow =
      activeRates.find(rt => modelIdStr && String(rt.model_id || '') === modelIdStr && Number(rt.duration) === 30) ||
      activeRates.find(rt => modelStr && String(rt.model || '').trim().toLowerCase() === modelStr && Number(rt.duration) === 30) ||
      activeRates.find(rt => {
        const m = String(rt.model || '').toLowerCase();
        return (isDouble ? m.includes('double') : m.includes('single')) && Number(rt.duration) === 30;
      });
    const configuredHalfHourRate = halfHourRateRow && Number(halfHourRateRow.amount) > 0
      ? Number(halfHourRateRow.amount)
      : Number((configuredBaseRate * 0.5).toFixed(3));

    // Calculate total elapsed minutes (preferring exact HH:mm:ss timer if within 15m of DB clock to prevent clock skew)
    const startMs = new Date(rental.start_time).getTime();
    const dbElapsedMins = Math.max(0, Math.floor((now.getTime() - startMs) / 60000));
    let parsedTimerMins: number | null = null;
    if (elapsedDuration && typeof elapsedDuration === 'string') {
      const hmsMatch = elapsedDuration.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (hmsMatch) {
        parsedTimerMins = parseInt(hmsMatch[1], 10) * 60 + parseInt(hmsMatch[2], 10);
      }
    }
    const elapsedMins =
      parsedTimerMins !== null && Math.abs(parsedTimerMins - dbElapsedMins) <= 15
        ? parsedTimerMins
        : dbElapsedMins;

    // Apply (Total Time - Grace Minutes) X Charges rule:
    let calculatedGross = 0;
    let calculatedExtra = 0;
    if (elapsedMins <= graceMins) {
      calculatedGross = 0;
      calculatedExtra = 0;
    } else if (elapsedMins <= 60 + graceMins) {
      calculatedGross = configuredBaseRate;
      calculatedExtra = 0;
    } else {
      const extraMins = elapsedMins - 60 - graceMins;
      const extraHalfHours = Math.ceil(extraMins / 30);
      calculatedExtra = Number((extraHalfHours * configuredHalfHourRate).toFixed(3));
      calculatedGross = Number((configuredBaseRate + calculatedExtra).toFixed(3));
    }

    // Apply discount if selected
    let effectiveDiscount = 0;
    const discTypeUpper = String(discountType || 'NONE').toUpperCase();
    if (discTypeUpper === 'DISABILITY_50') {
      effectiveDiscount = Number(((calculatedGross * 50) / 100).toFixed(3));
    } else if (discTypeUpper === 'CUSTOM') {
      const reqDisc = Number(discount ?? 0);
      if (!isNaN(reqDisc) && reqDisc > 0) {
        effectiveDiscount = Math.min(calculatedGross, Number(reqDisc.toFixed(3)));
      }
    } else if (discount !== undefined && Number(discount) > 0) {
      effectiveDiscount = Math.min(calculatedGross, Number(Number(discount).toFixed(3)));
    }

    const finalTotal = Math.max(0, Number((calculatedGross - effectiveDiscount).toFixed(3)));
    const finalExtra = calculatedExtra;
    const finalDiscount = effectiveDiscount;
    const rawMethod = String(paymentMethod || rental.payment_method || 'CASH').toUpperCase();
    const finalMethod = ['CASH', 'CARD', 'KNET', 'SPLIT'].includes(rawMethod) ? rawMethod : 'CASH';

    let finalCash = 0;
    let finalKnet = 0;
    if (finalMethod === 'SPLIT') {
      const reqCash = Math.max(0, Math.min(finalTotal, Number(cashAmount || 0)));
      finalCash = Number(reqCash.toFixed(3));
      finalKnet = Number(Math.max(0, finalTotal - finalCash).toFixed(3));
    } else if (finalMethod === 'CASH') {
      finalCash = finalTotal;
      finalKnet = 0;
    } else {
      finalCash = 0;
      finalKnet = finalTotal;
    }
    const finalDiscReason = discountReason || rental.discount_reason || null;

    // Ensure active open shift is assigned for settlement.
    // In POS operations, completed bills and collections belong to the currently active open shift (e.g. Shift 2).
    const activeSalesDate = await getActiveSalesDate(client);
    const activeShift = await getOrCreateActiveShift(client, {
      userId: userId || undefined,
      username: username || userStr,
      cashierName: username || userStr,
      branch: branch || rental.branch_name,
      location: location || rental.location_name,
      terminal: terminal || rental.terminal_info,
      businessDate: activeSalesDate
    });

    const effShiftId = activeShift?.id || rental.shift_id;
    const effShiftNum = activeShift?.shift_number || rental.shift_number || 1;

    const finalDeposit = Number(
      depositAmount !== undefined ? depositAmount : (rental.deposit_amount ?? rental.rental_amount ?? 0)
    );
    const finalChange = Math.max(0, Number((finalDeposit - finalTotal).toFixed(3)));

    // Update rental record
    const updateRes = await client.query(
      `UPDATE rentals 
       SET actual_end_time = $1,
           extra_amount = $2,
           discount = $3,
           discount_type = $4,
           discount_value = $5,
           settlement_remarks = $6,
           total_amount = $7,
           payment_method = $8,
           status = 'COMPLETED',
           shift_id = COALESCE($9, shift_id),
           shift_number = COALESCE($10, shift_number),
           deposit_amount = $11,
           change_returned = $12,
           cash_amount = $13,
           knet_amount = $14,
           discount_reason = $15,
           grace_period_minutes = $16,
           updated_at = NOW()
       WHERE id = $17
       RETURNING *`,
      [
        now,
        finalExtra,
        finalDiscount,
        discountType || null,
        discountValue !== undefined ? discountValue : null,
        finalRemarks,
        finalTotal,
        finalMethod,
        effShiftId || null,
        effShiftNum || 1,
        finalDeposit,
        finalChange,
        finalCash,
        finalKnet,
        finalDiscReason,
        graceMins,
        rental.id
      ]
    );

    const settledRental = updateRes.rows[0];

    // Refresh customer master totals if phone exists (or insert if missing)
    const settledPhone = String(settledRental.customer_phone || '').trim();
    if (settledPhone) {
      try {
        await client.query('SAVEPOINT sp_customer_sync');
        await ensureCustomersTable(client);
        const settledName = String(settledRental.customer_name || 'Walk-in Customer').trim() || 'Walk-in Customer';
        const statsRes = await client.query(
          `SELECT 
             GREATEST(COUNT(*)::int, 1) AS total_visits,
             COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN total_amount ELSE 0 END), 0)::numeric(12,3) AS total_spent
           FROM rentals
           WHERE TRIM(customer_phone) = $1::text AND status != 'CANCELLED'`,
          [settledPhone]
        );
        const visitsCount = Number(statsRes.rows[0]?.total_visits || 1);
        const spentTotal = statsRes.rows[0]?.total_spent || '0.000';

        await client.query(
          `INSERT INTO customers (phone, name, total_visits, total_spent, last_visit_at, status)
           VALUES ($1, $2, $3, $4, NOW(), 'ACTIVE')
           ON CONFLICT (phone) DO UPDATE SET
             total_visits = $3,
             total_spent = $4,
             last_visit_at = NOW(),
             updated_at = NOW()`,
          [settledPhone, settledName, visitsCount, spentTotal]
        );
        await client.query('RELEASE SAVEPOINT sp_customer_sync');
      } catch (custSyncErr: any) {
        await client.query('ROLLBACK TO SAVEPOINT sp_customer_sync').catch(() => {});
        console.warn('Customer stats sync warning during settlement:', custSyncErr.message);
      }
    }

    // Free car in database by both car_id and car_no
    await client.query(
      `UPDATE cars SET status = 'Available', updated_at = NOW() WHERE id = $1 OR car_no = $2`,
      [settledRental.car_id || '', settledRental.car_no || '']
    );

    // Insert universal audit log
    await client.query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, old_values, new_values, username, branch, location, terminal, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'SETTLEMENT_ORDER',
        'RENTAL',
        settledRental.invoice_no,
        JSON.stringify({ status: 'ACTIVE', rentalAmount: rental.rental_amount }),
        JSON.stringify({
          status: 'COMPLETED',
          totalAmount: settledRental.total_amount,
          extraAmount: settledRental.extra_amount,
          discount: settledRental.discount,
          discountType: settledRental.discount_type,
          discountReason: settledRental.discount_reason,
          paymentMethod: settledRental.payment_method,
          cashAmount: settledRental.cash_amount,
          knetAmount: settledRental.knet_amount,
          settlementRemarks: settledRental.settlement_remarks
        }),
        userStr,
        branch || 'Kiddie Kruzzer',
        location || 'Avenues Mall -Phase -4- Gate 25',
        terminal || 'POS-Terminal-1',
        `Rental ${settledRental.invoice_no} settled. Total: ${settledRental.total_amount} KWD (${settledRental.payment_method}).${finalRemarks ? ' Remarks: ' + finalRemarks : ''}`
      ]
    );

    await client.query('COMMIT');

    // Resolve Language & Print Format
    const rawLang = String(language || req.headers['x-language'] || 'BOTH').toUpperCase();
    const printLang: 'EN' | 'AR' | 'BOTH' = (rawLang === 'EN' || rawLang === 'AR' || rawLang === 'BOTH') ? rawLang : (rawLang === 'ARABIC' ? 'AR' : 'BOTH');

    // DIRECT THERMAL PRINTING (Zero browser dialog)
    const printerConfig = await resolvePrinterConfig({
      branch: branch || 'Kiddie Kruzzer',
      location: location || 'Avenues Mall -Phase -4- Gate 25',
      terminal: terminal || 'POS-Terminal-1',
      printType: 'SETTLEMENT',
    });

    const printPayload: ThermalPrintPayload = {
      printType: 'SETTLEMENT',
      language: printLang,
      invoiceNo: settledRental.invoice_no,
      rental: settledRental,
      settledAt: now.toLocaleString(),
      startTime: rental.start_time,
      endTime: now,
      cashierName: userStr,
      terminal: terminal || 'POS-Terminal-1',
      locationName: location || printerConfig.locationName || 'Avenues Mall -Phase -4- Gate 25',
      branchName: branch || printerConfig.branchName || 'Kiddie Kruzzer',
      companyName: 'Your Events Management Company',
      elapsedDuration: elapsedDuration || `${settledRental.duration_minutes} Mins`,
      depositAmount: finalDeposit,
      extraAmount: finalExtra,
      discountAmount: finalDiscount,
      discountType: discountType || undefined,
      discountReason: finalDiscReason || undefined,
      settlementRemarks: finalRemarks || undefined,
      finalAmount: finalTotal,
      changeReturned: finalChange,
      paymentMethod: finalMethod,
      cashAmount: finalCash,
      knetAmount: finalKnet,
    };

    let printResult: any = null;
    try {
      printResult = await ThermalPrinterService.sendToPrinter(printPayload, printerConfig);
    } catch (printErr: any) {
      console.error('Direct thermal print error on settlement:', printErr);
      printResult = { success: false, error: printErr.message || 'Thermal printer error', message: 'Printer offline or unreachable' };
    }

    // Record print audit log
    await pool.query(
      `INSERT INTO print_audit_logs (invoice_no, action, username, location_name, terminal_info, printer_name, printer_type, status, error_message, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        settledRental.invoice_no,
        'SETTLEMENT_RECEIPT_PRINT',
        userStr,
        location || printerConfig.locationName || 'Main Counter',
        terminal || 'POS-Terminal-1',
        printerConfig.printerName,
        printerConfig.interfaceType,
        printResult.success ? 'SUCCESS' : 'FAILED',
        printResult.error || null,
        printResult.message
      ]
    );

    res.json({
      success: true,
      rental: settledRental,
      printStatus: printResult,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------
// Car Swapping Endpoint: Seamlessly change assigned car without disrupting billing
// ----------------------------------------------------
app.post('/api/rentals/:id/change-car', async (req: Request, res: Response) => {
  const idParam = String(req.params['id'] || '').trim();
  const {
    newCarId,
    newCarNo,
    reason,
    carId,
    carNo,
    invoiceNo,
    username,
    branch,
    location,
    terminal,
  } = req.body;

  if (!newCarId && !newCarNo) {
    res.status(400).json({ error: 'Please specify the new car ID or car number to swap to.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Find the active rental by ID, invoice_no, car_id, or car_no
    const rentalRes = await client.query(
      `SELECT * FROM rentals 
       WHERE (
         id::text = $1::text OR invoice_no::text = $1::text OR car_id::text = $1::text OR car_no::text = $1::text
         OR ($2::text <> '' AND car_id::text = $2::text)
         OR ($3::text <> '' AND car_no::text = $3::text)
         OR ($4::text <> '' AND invoice_no::text = $4::text)
       )
       AND status = 'ACTIVE' 
       ORDER BY start_time DESC LIMIT 1`,
      [idParam, carId || '', carNo || '', invoiceNo || '']
    );

    if (rentalRes.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Active rental not found for car swap.' });
      return;
    }

    const currentRental = rentalRes.rows[0];
    const oldCarId = currentRental.car_id;
    const oldCarNo = currentRental.car_no;

    // 2. Find target new car and ensure it is Available
    const newCarRes = await client.query(
      `SELECT * FROM cars WHERE (id = $1 OR car_no = $2) LIMIT 1`,
      [newCarId || '', newCarNo || newCarId || '']
    );

    if (newCarRes.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Target car not found in fleet.' });
      return;
    }

    const targetCar = newCarRes.rows[0];

    // Verify target car is not the same car currently assigned
    if (String(targetCar.id) === String(oldCarId) || String(targetCar.car_no) === String(oldCarNo)) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: `Car #${targetCar.car_no} is already assigned to this rental. Please choose a different replacement car.` });
      return;
    }

    // Verify vehicle model category: restrict single to double & double to single changing
    let currentModel = String(currentRental.model || '').trim().toLowerCase();
    if (!currentModel && (oldCarId || oldCarNo)) {
      const oldCarRes = await client.query('SELECT model FROM cars WHERE id = $1 OR car_no = $2 LIMIT 1', [oldCarId, oldCarNo]);
      if (oldCarRes.rowCount && oldCarRes.rowCount > 0) {
        currentModel = String(oldCarRes.rows[0].model || '').trim().toLowerCase();
      }
    }
    const targetModel = String(targetCar.model || '').trim().toLowerCase();
    const isCurrentDouble = currentModel.includes('double');
    const isTargetDouble = targetModel.includes('double');

    if (isCurrentDouble !== isTargetDouble) {
      await client.query('ROLLBACK');
      res.status(400).json({
        error: isCurrentDouble
          ? 'Vehicle type mismatch: Changing a Double Seater car to a Single Seater is not permitted. Please select another Double Seater car.'
          : 'Vehicle type mismatch: Changing a Single Seater car to a Double Seater is not permitted. Please select another Single Seater car.'
      });
      return;
    }

    // Verify target car is not assigned to any other active rental in database
    const activeOnNewCar = await client.query(
      `SELECT id, invoice_no, car_no FROM rentals WHERE (car_id = $1 OR car_no = $2) AND status = 'ACTIVE' AND id <> $3 LIMIT 1`,
      [targetCar.id, targetCar.car_no, currentRental.id]
    );
    if (activeOnNewCar.rowCount && activeOnNewCar.rowCount > 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: `Car #${targetCar.car_no} is already assigned to active rental #${activeOnNewCar.rows[0].invoice_no}.` });
      return;
    }

    // Check if target car is explicitly out of service or rented
    const targetStatus = String(targetCar.status || '').trim().toLowerCase();
    if (targetStatus === 'maintenance' || targetStatus === 'inactive' || targetStatus === 'disabled' || targetStatus === 'rented') {
      await client.query('ROLLBACK');
      res.status(400).json({ error: `Car #${targetCar.car_no} is currently ${targetCar.status} and cannot be assigned.` });
      return;
    }

    // Optional: Lookup corresponding active rate matching the rental's duration for target model
    let newRateId: string | null = null;
    const duration = currentRental.duration_minutes || 60;
    if (targetCar.model) {
      const rateMatch = await client.query(
        `SELECT id FROM rates WHERE (LOWER(model) = LOWER($1) OR model_id = $2) AND duration = $3 AND status = 'ACTIVE' LIMIT 1`,
        [targetCar.model, targetCar.model_id || '', duration]
      );
      if (rateMatch.rowCount && rateMatch.rowCount > 0) {
        newRateId = rateMatch.rows[0].id;
      } else {
        const fallbackRate = await client.query(
          `SELECT id FROM rates WHERE (LOWER(model) = LOWER($1) OR model_id = $2) AND status = 'ACTIVE' LIMIT 1`,
          [targetCar.model, targetCar.model_id || '']
        );
        if (fallbackRate.rowCount && fallbackRate.rowCount > 0) {
          newRateId = fallbackRate.rows[0].id;
        }
      }
    }

    // 3. Mark old car as Available
    await client.query(
      `UPDATE cars SET status = 'Available', updated_at = NOW() WHERE id = $1 OR car_no = $2`,
      [oldCarId, oldCarNo]
    );

    // 4. Mark new car as Rented
    await client.query(
      `UPDATE cars SET status = 'Rented', updated_at = NOW() WHERE id = $1`,
      [targetCar.id]
    );

    // 5. Update rental record with new car, recording swapped history (using correct model and remarks columns)
    const swapRemark = reason ? `Swapped from car #${oldCarNo} to #${targetCar.car_no}: ${reason}` : `Swapped from car #${oldCarNo} to #${targetCar.car_no}`;
    const updateRes = await client.query(
      `UPDATE rentals 
       SET car_id = $1,
           car_no = $2,
           model = COALESCE($3, model),
           rate_id = COALESCE($4, rate_id),
           swapped_from_car_no = SUBSTRING(
             CASE 
               WHEN swapped_from_car_no IS NULL OR swapped_from_car_no = '' THEN $5::text
               ELSE swapped_from_car_no || ', ' || $5::text
             END, 1, 50
           ),
           remarks = CASE 
             WHEN remarks IS NULL OR remarks = '' THEN $6::text
             ELSE remarks || ' | ' || $6::text
           END,
           settlement_remarks = CASE 
             WHEN settlement_remarks IS NULL OR settlement_remarks = '' THEN $6::text
             ELSE settlement_remarks || ' | ' || $6::text
           END,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        targetCar.id,
        targetCar.car_no,
        targetCar.model || null,
        newRateId,
        oldCarNo,
        swapRemark,
        currentRental.id
      ]
    );

    const updatedRental = updateRes.rows[0];

    // 6. Audit log
    await client.query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, old_values, new_values, username, branch, location, terminal, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'CAR_CHANGE',
        'RENTAL',
        updatedRental.invoice_no,
        JSON.stringify({ carId: oldCarId, carNo: oldCarNo, model: currentRental.model || currentModel }),
        JSON.stringify({ carId: targetCar.id, carNo: targetCar.car_no, model: targetCar.model, reason }),
        username || 'Cashier',
        branch || 'Kiddie Kruzzer',
        location || 'Avenues Mall -Phase -4- Gate 25',
        terminal || 'POS-Terminal-1',
        swapRemark
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Car successfully swapped from #${oldCarNo} to #${targetCar.car_no}.`,
      rental: updatedRental,
      oldCarNo,
      newCarNo: targetCar.car_no
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});


app.put('/api/rentals/:id', async (req: Request, res: Response) => {
  const id = req.params['id'];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { actualEndTime, extraAmount, discount, totalAmount, paymentMethod, status, username, terminal, location, branch } = req.body;

    const rentalRes = await client.query(
      `UPDATE rentals 
       SET actual_end_time = COALESCE($1, NOW()),
           extra_amount = COALESCE($2, extra_amount),
           discount = COALESCE($3, discount),
           total_amount = COALESCE($4, total_amount),
           payment_method = COALESCE($5, payment_method),
           status = COALESCE($6, 'COMPLETED'),
           updated_at = NOW()
       WHERE (id::text = $7::text OR invoice_no::text = $7::text OR car_id::text = $7::text) AND status = 'ACTIVE'
       RETURNING *`,
      [actualEndTime ? new Date(actualEndTime) : new Date(), extraAmount, discount, totalAmount, paymentMethod, status, id]
    );

    if (rentalRes.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Rental not found' });
      return;
    }

    const rental = rentalRes.rows[0];
    // Free the car in PostgreSQL
    if (rental.car_id) {
      await client.query('UPDATE cars SET status = $1, updated_at = NOW() WHERE id = $2', ['Available', rental.car_id]);
    }

    await client.query('COMMIT');

    // Direct background thermal print if completing
    let printResult: any = null;
    if (status === 'COMPLETED' || !status) {
      try {
        const printerConfig = await resolvePrinterConfig({
          branch: branch || 'Kiddie Kruzzer',
          location: location || 'Avenues Mall -Phase -4- Gate 25',
          terminal: terminal || 'POS-Terminal-1',
          printType: 'SETTLEMENT',
        });

        const printPayload: ThermalPrintPayload = {
          printType: 'SETTLEMENT',
          invoiceNo: rental.invoice_no,
          rental: rental,
          settledAt: new Date().toLocaleString(),
          cashierName: username || rental.created_by || 'Cashier',
          terminal: terminal || 'POS-Terminal-1',
          locationName: location || printerConfig.locationName || 'Avenues Mall -Phase -4- Gate 25',
          branchName: branch || printerConfig.branchName || 'Kiddie Kruzzer',
          companyName: 'Your Events Management Company',
          depositAmount: rental.rental_amount,
          extraAmount: rental.extra_amount || 0,
          discountAmount: rental.discount || 0,
          finalAmount: rental.total_amount,
        };

        printResult = await ThermalPrinterService.sendToPrinter(printPayload, printerConfig);

        await pool.query(
          `INSERT INTO print_audit_logs (invoice_no, action, username, location_name, terminal_info, printer_name, printer_type, status, error_message, remarks)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            rental.invoice_no,
            'SETTLEMENT_RECEIPT_PRINT',
            username || rental.created_by || 'Cashier',
            location || printerConfig.locationName || 'Main Counter',
            terminal || 'POS-Terminal-1',
            printerConfig.printerName,
            printerConfig.interfaceType,
            printResult.success ? 'SUCCESS' : 'FAILED',
            printResult.error || null,
            printResult.message
          ]
        );
      } catch (e) {
        console.warn('Non-blocking printer dispatch notice:', e);
      }
    }

    res.json({
      ...rental,
      printStatus: printResult,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------
// Cancellation Reasons Master Endpoints
// ----------------------------------------------------
app.get('/api/cancellation-reasons', async (_req: Request, res: Response) => {
  try {
    const reasons = await pool.query(
      `SELECT * FROM cancellation_reasons WHERE is_active = 'ACTIVE' ORDER BY sort_order, id`
    );
    res.json(reasons.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Discount Types Master Endpoints
// ----------------------------------------------------
app.get('/api/discount-types', async (_req: Request, res: Response) => {
  try {
    const types = await pool.query(
      `SELECT * FROM discount_types WHERE is_active = 'ACTIVE' ORDER BY sort_order, id`
    );
    if (types.rows.length > 0) {
      res.json(types.rows);
      return;
    }
  } catch (err: any) {
    // Fall through to master list
  }
  
  res.json([
    { id: 'DT-101', code: 'DISABILITY_50', english_name: '50% Discount for Customers with Disabilities', arabic_name: 'خصم 50% لذوي الاحتياجات الخاصة', calculation_type: 'PERCENTAGE', default_value: '50.000', is_manual: false, sort_order: 1 }
  ]);
});


// ----------------------------------------------------
// Day Close Endpoints & Automatic Thermal Print
// ----------------------------------------------------
app.get('/api/day-close/summary', async (req: Request, res: Response) => {
  try {
    const activeSalesDate = await getActiveSalesDate(pool);
    const date = String(req.query['date'] || activeSalesDate);

    // Check if already closed
    const closedRes = await pool.query(`SELECT * FROM day_closes WHERE close_date = $1`, [date]);
    const isClosed = closedRes.rows.length > 0;

    // Get shifts for this date
    const shiftsRes = await pool.query(
      `SELECT * FROM shifts WHERE business_date = $1 ORDER BY shift_number ASC`,
      [date]
    );

    // Aggregate completed rentals for this date (by date timestamp or associated shifts)
    const statsRes = await pool.query(
      `SELECT 
         COUNT(*) as total_rentals,
         COUNT(DISTINCT car_no) as total_cars_used,
         COUNT(DISTINCT CASE WHEN (model LIKE '%Single%' OR car_model LIKE '%Single%') THEN car_no END) as single_cars_used,
         COUNT(DISTINCT CASE WHEN (model LIKE '%Double%' OR car_model LIKE '%Double%') THEN car_no END) as double_cars_used,
         COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(cash_amount, 0) ELSE 0 END), 0) as cash_amount,
         COALESCE(SUM(CASE WHEN payment_method IN ('KNET', 'CARD') THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(knet_amount, 0) ELSE (CASE WHEN payment_method != 'CASH' THEN total_amount ELSE 0 END) END), 0) as card_amount,
         COALESCE(SUM(COALESCE(discount, 0)), 0) as discount_amount,
         COALESCE(SUM(COALESCE(change_returned, 0)), 0) as refund_amount,
         COALESCE(SUM(total_amount), 0) as total_revenue
       FROM rentals
       WHERE (TO_CHAR(start_time, 'YYYY-MM-DD') = $1 OR TO_CHAR(created_at, 'YYYY-MM-DD') = $1 OR shift_id IN (SELECT id FROM shifts WHERE business_date = $1))
         AND status = 'COMPLETED'`,
      [date]
    );

    const stats = statsRes.rows[0];

    const summaries = await getDetailedShiftSummaries(pool, { businessDate: date });

    res.json({
      date,
      isClosed,
      dayCloseRecord: closedRes.rows[0] || null,
      shifts: shiftsRes.rows,
      totalShifts: shiftsRes.rows.length,
      totalRentals: parseInt(stats.total_rentals || '0', 10),
      totalCarsUsed: parseInt(stats.total_cars_used || '0', 10),
      singleCarsUsed: parseInt(stats.single_cars_used || '0', 10),
      doubleCarsUsed: parseInt(stats.double_cars_used || '0', 10),
      cashAmount: Number(stats.cash_amount || 0).toFixed(3),
      cardAmount: Number(stats.card_amount || 0).toFixed(3),
      discountAmount: Number(stats.discount_amount || 0).toFixed(3),
      refundAmount: Number(stats.refund_amount || 0).toFixed(3),
      totalRevenue: Number(stats.total_revenue || 0).toFixed(3),
      summaries,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/day-close', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { closeDate, notes, closedBy, terminal, branch, location, language } = req.body;
    const activeSalesDate = await getActiveSalesDate(client);
    const date = String(closeDate || activeSalesDate);

    // Aggregate completed rentals for this date
    const statsRes = await client.query(
      `SELECT 
         COUNT(*) as total_rentals,
         COUNT(DISTINCT car_no) as total_cars_used,
         COUNT(DISTINCT CASE WHEN (model LIKE '%Single%' OR car_model LIKE '%Single%') THEN car_no END) as single_cars_used,
         COUNT(DISTINCT CASE WHEN (model LIKE '%Double%' OR car_model LIKE '%Double%') THEN car_no END) as double_cars_used,
         COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(cash_amount, 0) ELSE 0 END), 0) as cash_amount,
         COALESCE(SUM(CASE WHEN payment_method IN ('KNET', 'CARD') THEN total_amount WHEN payment_method = 'SPLIT' THEN COALESCE(knet_amount, 0) ELSE (CASE WHEN payment_method != 'CASH' THEN total_amount ELSE 0 END) END), 0) as card_amount,
         COALESCE(SUM(COALESCE(discount, 0)), 0) as discount_amount,
         COALESCE(SUM(COALESCE(change_returned, 0)), 0) as refund_amount,
         COALESCE(SUM(total_amount), 0) as total_revenue
       FROM rentals
       WHERE (TO_CHAR(start_time, 'YYYY-MM-DD') = $1 OR TO_CHAR(created_at, 'YYYY-MM-DD') = $1 OR shift_id IN (SELECT id FROM shifts WHERE business_date = $1))
         AND status = 'COMPLETED'`,
      [date]
    );

    const stats = statsRes.rows[0];

    const shiftsCountRes = await client.query(
      `SELECT COUNT(*) as count FROM shifts WHERE business_date = $1`,
      [date]
    );
    const totalShiftsNum = Math.max(1, parseInt(shiftsCountRes.rows[0]?.count || '1', 10));

    // Auto-close any open shifts remaining for this business date
    await client.query(
      `UPDATE shifts 
       SET status = 'CLOSED', 
           end_time = NOW(), 
           notes = COALESCE(notes, '') || ' [Auto-closed during Day Close]',
           updated_at = NOW() 
       WHERE business_date = $1 AND status = 'OPEN'`,
      [date]
    );

    const insertRes = await client.query(
      `INSERT INTO day_closes (close_date, total_rentals, total_revenue, cash_amount, card_amount, discount_amount, refund_amount, total_shifts, closed_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (close_date) DO UPDATE
       SET total_rentals = EXCLUDED.total_rentals,
           total_revenue = EXCLUDED.total_revenue,
           cash_amount = EXCLUDED.cash_amount,
           card_amount = EXCLUDED.card_amount,
           discount_amount = EXCLUDED.discount_amount,
           refund_amount = EXCLUDED.refund_amount,
           total_shifts = EXCLUDED.total_shifts,
           closed_by = EXCLUDED.closed_by,
           notes = EXCLUDED.notes
       RETURNING *`,
      [
        date,
        parseInt(stats.total_rentals || '0', 10),
        stats.total_revenue,
        stats.cash_amount,
        stats.card_amount,
        stats.discount_amount,
        stats.refund_amount,
        totalShiftsNum,
        closedBy || 'Admin',
        notes || 'End of day closing completed'
      ]
    );

    const dayCloseRecord = insertRes.rows[0];

    // Compute detailed 6 audit summaries for day close
    const summaries = await getDetailedShiftSummaries(client, { businessDate: date });

    // Reset and advance Sales Date to the next business date in system_settings
    const newSalesDate = await resetSalesDateAfterDayClose(client, date);

    // Audit log
    await logAudit(client, {
      username: closedBy || 'Admin',
      branch: branch || 'Kiddie Kruzzer',
      location: location || 'Avenues Mall -Phase -4- Gate 25',
      terminal: terminal || 'POS-Terminal-1',
      action: 'DAY_CLOSE',
      entityType: 'DAY_CLOSE',
      entityId: date,
      remarks: `Day Close executed for ${date}. Sales Date advanced and reset to ${newSalesDate}. Total Rentals: ${stats.total_rentals}, Cars Used: ${stats.total_cars_used}, Total Revenue: ${stats.total_revenue}`,
    });

    await client.query('COMMIT');

    // AUTOMATIC THERMAL PRINTING OF DAY CLOSE REPORT
    let printResult: any = null;
    try {
      const printerConfig = await resolvePrinterConfig({
        branch: branch || 'Kiddie Kruzzer',
        location: location || 'Avenues Mall -Phase -4- Gate 25',
        terminal: terminal || 'POS-Terminal-1',
        printType: 'DAY_CLOSE',
      });

      const rawLang = String(language || req.headers['x-language'] || 'BOTH').toUpperCase();
      const printLang: 'EN' | 'AR' | 'BOTH' = (rawLang === 'EN' || rawLang === 'AR' || rawLang === 'BOTH') ? rawLang : 'BOTH';

      const printPayload: ThermalPrintPayload = {
        printType: 'DAY_CLOSE',
        language: printLang,
        branchName: branch || printerConfig.branchName || 'Kiddie Kruzzer',
        locationName: location || printerConfig.locationName || 'Avenues Mall -Phase -4- Gate 25',
        terminal: terminal || 'POS-Terminal-1',
        cashierName: closedBy || 'Admin',
        companyName: 'Your Events Management Company',
        dayCloseData: {
          closeDate: dayCloseRecord.close_date,
          totalRentals: dayCloseRecord.total_rentals,
          totalCarsUsed: parseInt(stats.total_cars_used || '0', 10),
          totalRevenue: dayCloseRecord.total_revenue,
          cashAmount: dayCloseRecord.cash_amount,
          cardAmount: dayCloseRecord.card_amount,
          discountAmount: dayCloseRecord.discount_amount,
          refundAmount: dayCloseRecord.refund_amount,
          totalShifts: dayCloseRecord.total_shifts,
          closedBy: dayCloseRecord.closed_by,
          notes: dayCloseRecord.notes,
          summaries,
        }
      };

      printResult = await ThermalPrinterService.sendToPrinter(printPayload, printerConfig);
    } catch (e: any) {
      console.warn('Auto day close print error:', e.message);
      printResult = { success: false, error: e.message };
    }

    // AUTOMATIC EMAIL DISPATCH OF DAY CLOSE REPORT
    let emailResult: any = null;
    try {
      emailResult = await EmailService.sendDayCloseEmail({
        closeDate: dayCloseRecord.close_date,
        totalRentals: dayCloseRecord.total_rentals,
        totalRevenue: dayCloseRecord.total_revenue,
        cashAmount: dayCloseRecord.cash_amount,
        cardAmount: dayCloseRecord.card_amount,
        discountAmount: dayCloseRecord.discount_amount,
        refundAmount: dayCloseRecord.refund_amount,
        totalShifts: dayCloseRecord.total_shifts,
        closedBy: dayCloseRecord.closed_by,
        notes: dayCloseRecord.notes,
        branchName: branch || 'Kiddie Kruzzer',
        locationName: location || 'Avenues Mall -Phase -4- Gate 25',
      });
    } catch (emErr: any) {
      console.warn('Auto day close email error:', emErr.message);
      emailResult = { success: false, error: emErr.message };
    }

    res.json({
      success: true,
      dayClose: { ...dayCloseRecord, summaries },
      summaries,
      newSalesDate,
      printStatus: printResult,
      emailStatus: emailResult,
      message: `Day closing completed successfully. Sales date reset to ${newSalesDate}.`
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/day-close/email', async (req: Request, res: Response) => {
  try {
    const { closeDate, recipient, branch, location } = req.body;
    const date = String(closeDate || new Date().toISOString().split('T')[0]);

    const q = await pool.query(`SELECT * FROM day_closes WHERE close_date = $1 LIMIT 1`, [date]);
    if (q.rowCount === 0) {
      res.status(404).json({ success: false, error: `No Day Close record found for date ${date}` });
      return;
    }

    const r = q.rows[0];
    const emailResult = await EmailService.sendDayCloseEmail(
      {
        closeDate: r.close_date,
        totalRentals: r.total_rentals,
        totalRevenue: r.total_revenue,
        cashAmount: r.cash_amount,
        cardAmount: r.card_amount,
        discountAmount: r.discount_amount,
        refundAmount: r.refund_amount,
        totalShifts: r.total_shifts,
        closedBy: r.closed_by,
        notes: r.notes,
        branchName: branch || 'Kiddie Kruzzer',
        locationName: location || 'Avenues Mall -Phase -4- Gate 25',
      },
      { force: true, customRecipients: recipient }
    );

    res.json(emailResult);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/email/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await EmailService.getSettings();
    res.json({
      ...settings,
      smtpPass: settings.smtpPass ? '********' : '',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/email/settings', async (req: Request, res: Response) => {
  try {
    const saved = await EmailService.saveSettings(req.body);
    res.json({
      ...saved,
      smtpPass: saved.smtpPass ? '********' : '',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/email/test', async (req: Request, res: Response) => {
  try {
    const { recipient, to, settings } = req.body;
    const targetRecipient = recipient || to;
    if (settings) {
      const connTest = await EmailService.testConnection(settings);
      if (!connTest.success) {
        return res.json(connTest);
      }
    }
    const result = await EmailService.sendTestEmail(targetRecipient);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/day-close', async (_req: Request, res: Response) => {
  try {
    const data = await pool.query(`SELECT * FROM day_closes ORDER BY close_date DESC LIMIT 100`);
    res.json(data.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Periodic Date-Range Reports & Thermal Printing
// ----------------------------------------------------
app.get('/api/reports/periodic', async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate, branch, location } = req.query;
    const fDate = String(fromDate || new Date().toISOString().split('T')[0]);
    const tDate = String(toDate || new Date().toISOString().split('T')[0]);

    let query = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as date,
        COUNT(*) as rentals,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN payment_method != 'CASH' THEN total_amount ELSE 0 END), 0) as knet,
        COALESCE(SUM(COALESCE(discount, 0)), 0) as discount,
        COALESCE(SUM(COALESCE(change_returned, 0)), 0) as refund,
        COALESCE(SUM(total_amount), 0) as total,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_count
      FROM rentals
      WHERE TO_CHAR(created_at, 'YYYY-MM-DD') BETWEEN $1 AND $2 AND status = 'COMPLETED'
    `;

    const params: any[] = [fDate, tDate];
    if (branch && branch !== 'ALL') {
      params.push(branch);
      query += ` AND branch = $${params.length}`;
    }
    if (location && location !== 'ALL') {
      params.push(location);
      query += ` AND location = $${params.length}`;
    }

    query += ` GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD') ORDER BY date ASC`;

    const result = await pool.query(query, params);
    const days = result.rows;

    // Grand summary
    let grandRentals = 0;
    let grandCash = 0;
    let grandKnet = 0;
    let grandDiscount = 0;
    let grandRefund = 0;
    let grandTotal = 0;
    let grandCancelled = 0;

    for (const d of days) {
      grandRentals += parseInt(d.rentals || '0', 10);
      grandCash += Number(d.cash || 0);
      grandKnet += Number(d.knet || 0);
      grandDiscount += Number(d.discount || 0);
      grandRefund += Number(d.refund || 0);
      grandTotal += Number(d.total || 0);
      grandCancelled += parseInt(d.cancelled_count || '0', 10);
    }

    const summaries = await getDetailedShiftSummaries(pool, { 
      fromDate: fDate, 
      toDate: tDate, 
      branch: (branch as string) || undefined, 
      location: (location as string) || undefined 
    });

    res.json({
      fromDate: fDate,
      toDate: tDate,
      days,
      grandTotal: {
        totalRentals: grandRentals,
        totalCash: grandCash.toFixed(3),
        totalKnet: grandKnet.toFixed(3),
        totalDiscount: grandDiscount.toFixed(3),
        totalRefund: grandRefund.toFixed(3),
        totalRevenue: grandTotal.toFixed(3),
        totalCancelled: grandCancelled,
        averageDailyRevenue: days.length > 0 ? (grandTotal / days.length).toFixed(3) : '0.000',
      },
      summaries
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/periodic/print-thermal', async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate, branch, location, terminal, language } = req.body;
    const fDate = String(fromDate || new Date().toISOString().split('T')[0]);
    const tDate = String(toDate || new Date().toISOString().split('T')[0]);

    // Fetch periodic data (completed rentals only)
    const query = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as date,
        COUNT(*) as rentals,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN payment_method != 'CASH' THEN total_amount ELSE 0 END), 0) as knet,
        COALESCE(SUM(COALESCE(discount, 0)), 0) as discount,
        COALESCE(SUM(total_amount), 0) as total
      FROM rentals
      WHERE TO_CHAR(created_at, 'YYYY-MM-DD') BETWEEN $1 AND $2 AND status = 'COMPLETED'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD') ORDER BY date ASC
    `;
    const result = await pool.query(query, [fDate, tDate]);
    const days = result.rows;

    let grandRentals = 0;
    let grandCash = 0;
    let grandKnet = 0;
    let grandDiscount = 0;
    let grandTotal = 0;

    for (const d of days) {
      grandRentals += parseInt(d.rentals || '0', 10);
      grandCash += Number(d.cash || 0);
      grandKnet += Number(d.knet || 0);
      grandDiscount += Number(d.discount || 0);
      grandTotal += Number(d.total || 0);
    }

    const summaries = await getDetailedShiftSummaries(pool, { 
      fromDate: fDate, 
      toDate: tDate, 
      branch: branch || undefined, 
      location: location || undefined 
    });

    const printerConfig = await resolvePrinterConfig({
      branch: branch || 'Kiddie Kruzzer',
      location: location || 'Avenues Mall -Phase -4- Gate 25',
      terminal: terminal || 'POS-Terminal-1',
      printType: 'PERIODIC_REPORT',
    });

    const rawLang = String(language || req.headers['x-language'] || 'BOTH').toUpperCase();
    const printLang: 'EN' | 'AR' | 'BOTH' = (rawLang === 'EN' || rawLang === 'AR' || rawLang === 'BOTH') ? rawLang : 'BOTH';

    const printPayload: ThermalPrintPayload = {
      printType: 'PERIODIC_REPORT',
      language: printLang,
      branchName: branch || printerConfig.branchName || 'Kiddie Kruzzer',
      locationName: location || printerConfig.locationName || 'Avenues Mall -Phase -4- Gate 25',
      terminal: terminal || 'POS-Terminal-1',
      companyName: 'Your Events Management Company',
      periodicData: {
        fromDate: fDate,
        toDate: tDate,
        days,
        grandTotal: {
          totalRentals: grandRentals,
          totalCash: grandCash.toFixed(3),
          totalKnet: grandKnet.toFixed(3),
          totalDiscount: grandDiscount.toFixed(3),
          totalRevenue: grandTotal.toFixed(3),
        },
        summaries
      }
    };

    const printResult = await ThermalPrinterService.sendToPrinter(printPayload, printerConfig);
    res.json({ success: true, printStatus: printResult });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 9 Comprehensive Reports & Analytics Suite Endpoints
// ----------------------------------------------------

// 1. Management Sales Dashboard
app.get('/api/reports/management-dashboard', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Today revenue
    const todayRes = await pool.query(
      `SELECT 
         COUNT(*) as total_rentals,
         COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total_amount ELSE 0 END), 0) as total_revenue,
         COALESCE(SUM(CASE WHEN payment_method = 'CASH' AND status != 'CANCELLED' THEN total_amount ELSE 0 END), 0) as cash_total,
         COALESCE(SUM(CASE WHEN payment_method != 'CASH' AND status != 'CANCELLED' THEN total_amount ELSE 0 END), 0) as knet_total,
         COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN COALESCE(discount, 0) ELSE 0 END), 0) as discount_total
       FROM rentals WHERE TO_CHAR(created_at, 'YYYY-MM-DD') = $1`,
      [today]
    );

    // Fleet utilization
    const carsRes = await pool.query(`SELECT status, COUNT(*) as count FROM cars GROUP BY status`);
    let totalCars = 0;
    let rentedCars = 0;
    for (const c of carsRes.rows) {
      const cnt = parseInt(c.count, 10);
      totalCars += cnt;
      if (c.status === 'Rented') rentedCars += cnt;
    }

    // Top 5 Vehicles
    const topVehicles = await pool.query(
      `SELECT car_no, model, COUNT(*) as trips, COALESCE(SUM(total_amount), 0) as revenue
       FROM rentals WHERE status != 'CANCELLED'
       GROUP BY car_no, model ORDER BY trips DESC LIMIT 5`
    );

    // Last 7 days trend
    const trendRes = await pool.query(
      `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as rentals, COALESCE(SUM(total_amount), 0) as revenue
       FROM rentals WHERE status != 'CANCELLED' AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD') ORDER BY date ASC`
    );

    const t = todayRes.rows[0];
    const totalRev = Number(t.total_revenue || 0);
    const totalTrips = parseInt(t.total_rentals || '0', 10);

    res.json({
      todaySummary: {
        totalRevenue: totalRev.toFixed(3),
        totalRentals: totalTrips,
        cashTotal: Number(t.cash_total || 0).toFixed(3),
        knetTotal: Number(t.knet_total || 0).toFixed(3),
        discountTotal: Number(t.discount_total || 0).toFixed(3),
        averageTicket: totalTrips > 0 ? (totalRev / totalTrips).toFixed(3) : '0.000',
      },
      fleet: {
        total: totalCars,
        rented: rentedCars,
        available: totalCars - rentedCars,
        utilizationRate: totalCars > 0 ? Math.round((rentedCars / totalCars) * 100) + '%' : '0%',
      },
      topVehicles: topVehicles.rows,
      dailyTrend: trendRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Daily Sales Summary
app.get('/api/reports/daily-summary', async (req: Request, res: Response) => {
  try {
    const date = String(req.query['date'] || new Date().toISOString().split('T')[0]);
    const data = await pool.query(
      `SELECT 
         r.id, r.invoice_no, r.car_no, r.model, r.customer_name, r.customer_phone,
         r.duration_minutes, r.rental_amount, r.extra_amount, r.discount, r.discount_type,
         r.total_amount, r.payment_method, r.status, r.created_by, r.settlement_remarks,
         r.start_time, r.actual_end_time, r.created_at
       FROM rentals r
       WHERE TO_CHAR(r.created_at, 'YYYY-MM-DD') = $1
       ORDER BY r.created_at DESC`,
      [date]
    );
    res.json(data.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Location-wise Sales
app.get('/api/reports/location-sales', async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate } = req.query;
    const fDate = String(fromDate || new Date().toISOString().split('T')[0]);
    const tDate = String(toDate || new Date().toISOString().split('T')[0]);

    const data = await pool.query(
      `SELECT 
         COALESCE(location, 'Zone A - Ground Floor') as location,
         COALESCE(branch, 'Avenues Mall') as branch,
         COUNT(*) as total_trips,
         COALESCE(SUM(duration_minutes), 0) as total_duration_mins,
         COALESCE(SUM(CASE WHEN payment_method = 'CASH' AND status != 'CANCELLED' THEN total_amount ELSE 0 END), 0) as cash_revenue,
         COALESCE(SUM(CASE WHEN payment_method != 'CASH' AND status != 'CANCELLED' THEN total_amount ELSE 0 END), 0) as knet_revenue,
         COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total_amount ELSE 0 END), 0) as total_revenue
       FROM rentals
       WHERE TO_CHAR(created_at, 'YYYY-MM-DD') BETWEEN $1 AND $2
       GROUP BY location, branch
       ORDER BY total_revenue DESC`,
      [fDate, tDate]
    );
    res.json(data.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Item-wise / Model Sales
app.get('/api/reports/item-sales', async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate } = req.query;
    const fDate = String(fromDate || new Date().toISOString().split('T')[0]);
    const tDate = String(toDate || new Date().toISOString().split('T')[0]);

    const data = await pool.query(
      `SELECT 
         model,
         CASE WHEN LOWER(model) LIKE '%single%' THEN 'Single Seater' ELSE 'Double Seater' END as seater_category,
         COUNT(*) as total_rentals,
         COALESCE(SUM(duration_minutes), 0) as total_minutes,
         COALESCE(AVG(duration_minutes), 0) as avg_duration,
         COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total_amount ELSE 0 END), 0) as total_revenue
       FROM rentals
       WHERE TO_CHAR(created_at, 'YYYY-MM-DD') BETWEEN $1 AND $2
       GROUP BY model ORDER BY total_revenue DESC`,
      [fDate, tDate]
    );
    res.json(data.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Payment & Collection Reconciliation
app.get('/api/reports/payment-collection', async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate } = req.query;
    const fDate = String(fromDate || new Date().toISOString().split('T')[0]);
    const tDate = String(toDate || new Date().toISOString().split('T')[0]);

    const data = await pool.query(
      `SELECT 
         payment_method,
         COUNT(*) as transaction_count,
         COALESCE(SUM(rental_amount), 0) as gross_deposit_amount,
         COALESCE(SUM(extra_amount), 0) as overtime_extra_amount,
         COALESCE(SUM(discount), 0) as total_discounts,
         COALESCE(SUM(change_returned), 0) as total_refunds,
         COALESCE(SUM(total_amount), 0) as net_collected_amount
       FROM rentals
       WHERE TO_CHAR(created_at, 'YYYY-MM-DD') BETWEEN $1 AND $2 AND status != 'CANCELLED'
       GROUP BY payment_method ORDER BY net_collected_amount DESC`,
      [fDate, tDate]
    );
    res.json(data.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Aggregator Sales & Reconciliation
app.get('/api/reports/aggregator-sales', async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate } = req.query;
    const fDate = String(fromDate || new Date().toISOString().split('T')[0]);
    const tDate = String(toDate || new Date().toISOString().split('T')[0]);

    const data = await pool.query(
      `SELECT 
         COALESCE(terminal, 'POS-Terminal-1') as channel,
         CASE 
           WHEN terminal ILIKE '%kiosk%' THEN 'Self-Service Kiosk'
           WHEN terminal ILIKE '%online%' OR terminal ILIKE '%web%' THEN 'Online / Partner Aggregator'
           ELSE 'Direct POS Counter'
         END as channel_type,
         COUNT(*) as total_orders,
         COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount ELSE 0 END), 0) as cash_amount,
         COALESCE(SUM(CASE WHEN payment_method != 'CASH' THEN total_amount ELSE 0 END), 0) as digital_amount,
         COALESCE(SUM(total_amount), 0) as total_settlement
       FROM rentals
       WHERE TO_CHAR(created_at, 'YYYY-MM-DD') BETWEEN $1 AND $2 AND status != 'CANCELLED'
       GROUP BY terminal ORDER BY total_settlement DESC`,
      [fDate, tDate]
    );
    res.json(data.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Discount Analysis
app.get('/api/reports/discount-analysis', async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate } = req.query;
    const fDate = String(fromDate || new Date().toISOString().split('T')[0]);
    const tDate = String(toDate || new Date().toISOString().split('T')[0]);

    const byType = await pool.query(
      `SELECT 
         COALESCE(discount_type, 'NONE') as discount_type,
         CASE 
           WHEN discount_type = 'OWNERS' THEN 'Owners discount (100%)'
           WHEN discount_type = 'STAFF' THEN 'Staff Discount (25%)'
           WHEN discount_type = 'OTHER' THEN 'Other Discount (Manual)'
           ELSE 'Standard / Other'
         END as discount_name,
         COUNT(*) as usage_count,
         COALESCE(SUM(rental_amount), 0) as original_value,
         COALESCE(SUM(discount), 0) as total_discount_given,
         COALESCE(SUM(total_amount), 0) as net_collected
       FROM rentals
       WHERE TO_CHAR(created_at, 'YYYY-MM-DD') BETWEEN $1 AND $2 AND COALESCE(discount, 0) > 0 AND status != 'CANCELLED'
       GROUP BY discount_type ORDER BY total_discount_given DESC`,
      [fDate, tDate]
    );

    const detailed = await pool.query(
      `SELECT invoice_no, customer_name, car_no, model, rental_amount, discount, discount_type, total_amount, created_by, created_at
       FROM rentals
       WHERE TO_CHAR(created_at, 'YYYY-MM-DD') BETWEEN $1 AND $2 AND COALESCE(discount, 0) > 0 AND status != 'CANCELLED'
       ORDER BY created_at DESC LIMIT 100`,
      [fDate, tDate]
    );

    res.json({
      summaryByType: byType.rows,
      recentDiscounts: detailed.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Cancellation & Refund Analysis
app.get('/api/reports/cancellation-analysis', async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate } = req.query;
    const fDate = String(fromDate || new Date().toISOString().split('T')[0]);
    const tDate = String(toDate || new Date().toISOString().split('T')[0]);

    const byReason = await pool.query(
      `SELECT 
         COALESCE(cancellation_reason, 'Unspecified') as reason,
         COUNT(*) as count,
         COALESCE(SUM(total_amount), 0) as voided_amount
       FROM rentals
       WHERE TO_CHAR(created_at, 'YYYY-MM-DD') BETWEEN $1 AND $2 AND status = 'CANCELLED'
       GROUP BY cancellation_reason ORDER BY count DESC`,
      [fDate, tDate]
    );

    const list = await pool.query(
      `SELECT invoice_no, customer_name, car_no, model, total_amount, cancellation_reason, cancellation_remarks, cancelled_by, cancelled_at, created_at
       FROM rentals
       WHERE TO_CHAR(created_at, 'YYYY-MM-DD') BETWEEN $1 AND $2 AND status = 'CANCELLED'
       ORDER BY cancelled_at DESC LIMIT 100`,
      [fDate, tDate]
    );

    res.json({
      summaryByReason: byReason.rows,
      cancelledBills: list.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Cashier / Employee Performance
app.get('/api/reports/cashier-performance', async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate } = req.query;
    const fDate = String(fromDate || new Date().toISOString().split('T')[0]);
    const tDate = String(toDate || new Date().toISOString().split('T')[0]);

    const data = await pool.query(
      `SELECT 
         COALESCE(created_by, 'Cashier') as cashier_name,
         COUNT(*) as total_transactions,
         COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_count,
         COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_count,
         COALESCE(SUM(CASE WHEN payment_method = 'CASH' AND status != 'CANCELLED' THEN total_amount ELSE 0 END), 0) as cash_collected,
         COALESCE(SUM(CASE WHEN payment_method != 'CASH' AND status != 'CANCELLED' THEN total_amount ELSE 0 END), 0) as knet_collected,
         COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN COALESCE(discount, 0) ELSE 0 END), 0) as discounts_given,
         COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total_amount ELSE 0 END), 0) as net_sales_total
       FROM rentals
       WHERE TO_CHAR(created_at, 'YYYY-MM-DD') BETWEEN $1 AND $2
       GROUP BY created_by ORDER BY net_sales_total DESC`,
      [fDate, tDate]
    );
    res.json(data.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Customer-wise Sales Report (Customer Phone First + Unified Customer Name)
app.get('/api/reports/customer-sales', async (req: Request, res: Response) => {
  try {
    await ensureCustomersTable(pool);
    const { fromDate, toDate, search } = req.query;
    const fDate = String(fromDate || new Date().toISOString().split('T')[0]);
    const tDate = String(toDate || new Date().toISOString().split('T')[0]);
    const q = String(search || '').trim();

    const params: any[] = [fDate, tDate];
    let searchFilter = '';
    if (q) {
      params.push(`%${q}%`);
      searchFilter = `AND (COALESCE(r.customer_phone, '') ILIKE $3 OR COALESCE(c.name, r.customer_name, '') ILIKE $3)`;
    }

    const rowsRes = await pool.query(
      `SELECT
         COALESCE(NULLIF(TRIM(r.customer_phone), ''), 'No Phone') AS customer_phone,
         COALESCE(
           MAX(c.name),
           MAX(CASE WHEN r.customer_name IS NOT NULL AND TRIM(r.customer_name) != '' AND LOWER(TRIM(r.customer_name)) != 'walk-in customer' THEN TRIM(r.customer_name) END),
           'Walk-in Customer'
         ) AS customer_name,
         COUNT(*)::int AS total_trips,
         COUNT(CASE WHEN r.status = 'COMPLETED' THEN 1 END)::int AS completed_trips,
         COUNT(CASE WHEN r.status = 'ACTIVE' THEN 1 END)::int AS active_trips,
         COUNT(CASE WHEN r.status = 'CANCELLED' THEN 1 END)::int AS cancelled_trips,
         COALESCE(SUM(CASE WHEN r.status != 'CANCELLED' THEN r.duration_minutes ELSE 0 END), 0)::int AS total_minutes,
         COALESCE(SUM(CASE WHEN r.status != 'CANCELLED' AND r.payment_method = 'CASH' THEN r.total_amount WHEN r.status != 'CANCELLED' AND r.payment_method = 'SPLIT' THEN COALESCE(r.cash_amount, 0) ELSE 0 END), 0)::numeric(12,3) AS cash_total,
         COALESCE(SUM(CASE WHEN r.status != 'CANCELLED' AND r.payment_method IN ('KNET', 'CARD') THEN r.total_amount WHEN r.status != 'CANCELLED' AND r.payment_method = 'SPLIT' THEN COALESCE(r.knet_amount, 0) ELSE (CASE WHEN r.status != 'CANCELLED' AND r.payment_method != 'CASH' THEN r.total_amount ELSE 0 END) END), 0)::numeric(12,3) AS knet_total,
         COALESCE(SUM(CASE WHEN r.status != 'CANCELLED' THEN COALESCE(r.discount, 0) ELSE 0 END), 0)::numeric(12,3) AS discount_total,
         COALESCE(SUM(CASE WHEN r.status != 'CANCELLED' THEN r.total_amount ELSE 0 END), 0)::numeric(12,3) AS total_revenue,
         MAX(r.start_time) AS last_visit
       FROM rentals r
       LEFT JOIN customers c ON c.phone = TRIM(r.customer_phone)
       WHERE TO_CHAR(r.created_at, 'YYYY-MM-DD') BETWEEN $1 AND $2
       ${searchFilter}
       GROUP BY
         CASE
           WHEN NULLIF(TRIM(r.customer_phone), '') IS NOT NULL THEN TRIM(r.customer_phone)
           ELSE 'NO_PHONE_' || LOWER(COALESCE(NULLIF(TRIM(r.customer_name), ''), 'walk-in customer'))
         END,
         COALESCE(NULLIF(TRIM(r.customer_phone), ''), 'No Phone')
       ORDER BY total_revenue DESC, total_trips DESC`,
      params
    );

    let totalRevenue = 0;
    let totalTrips = 0;
    let totalCash = 0;
    let totalKnet = 0;
    let totalDiscount = 0;
    for (const r of rowsRes.rows) {
      totalRevenue += Number(r.total_revenue || 0);
      totalTrips += parseInt(r.total_trips || '0', 10);
      totalCash += Number(r.cash_total || 0);
      totalKnet += Number(r.knet_total || 0);
      totalDiscount += Number(r.discount_total || 0);
    }

    res.json({
      items: rowsRes.rows,
      summary: {
        totalCustomers: rowsRes.rows.length,
        totalTrips,
        totalCash: totalCash.toFixed(3),
        totalKnet: totalKnet.toFixed(3),
        totalDiscount: totalDiscount.toFixed(3),
        totalRevenue: totalRevenue.toFixed(3),
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Bill Cancellation Endpoint (Prior Confirmation + Supervisor/Manager Login Authorization + Thermal Print + Audit)
// ----------------------------------------------------
app.post('/api/rentals/:id/cancel', async (req: Request, res: Response) => {
  const id = req.params['id'];
  const { 
    reasonId, 
    reason, 
    remarks, 
    username, 
    terminal, 
    location, 
    branch, 
    language,
    supervisorUsername,
    supervisorPassword 
  } = req.body;

  if (!reason || !String(reason).trim() || !remarks || !String(remarks).trim()) {
    res.status(400).json({ error: 'Cancellation Reason and Remarks are mandatory.' });
    return;
  }

  // Supervisor / Manager Login is strictly required to authorize cancellation
  if (!supervisorUsername || !String(supervisorUsername).trim() || !supervisorPassword || !String(supervisorPassword).trim()) {
    res.status(401).json({ error: 'Supervisor or Manager login credentials are required to authorize bill cancellation.' });
    return;
  }

  const supUserClean = String(supervisorUsername).trim();
  const supPassClean = String(supervisorPassword).trim();

  // Validate supervisor against users table with role IN ('ADMIN', 'MANAGER', 'SUPERVISOR')
  const supervisorCheck = await pool.query(
    `SELECT id, username, employee_name, role, status 
     FROM users 
     WHERE (LOWER(username) = LOWER($1) OR id = $1) 
       AND password = $2 
       AND role IN ('ADMIN', 'MANAGER', 'SUPERVISOR') 
       AND status = 'ACTIVE' LIMIT 1`,
    [supUserClean, supPassClean]
  );

  if (supervisorCheck.rowCount === 0) {
    res.status(401).json({ 
      error: 'Supervisor authorization failed: Invalid username or password, or user lacks Manager/Supervisor privileges.' 
    });
    return;
  }

  const supervisorUser = supervisorCheck.rows[0];
  const supervisorName = supervisorUser.employee_name || supervisorUser.username;
  const supervisorRole = supervisorUser.role;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check rental
    const rentalQuery = await client.query(
      `SELECT * FROM rentals WHERE (id::text = $1::text OR invoice_no::text = $1::text)`,
      [id]
    );

    if (rentalQuery.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Rental / Bill not found.' });
      return;
    }

    const rental = rentalQuery.rows[0];
    if (rental.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'This bill has already been cancelled.' });
      return;
    }

    const userStr = username || 'Cashier';
    const now = new Date();
    const authorizedCancelledBy = `${userStr} (Auth: ${supervisorUser.username})`.substring(0, 100);
    const fullCancellationRemarks = `${String(remarks).trim()} | Auth: ${supervisorName} [${supervisorRole}]`;

    // Update rental to CANCELLED
    const updateRes = await client.query(
      `UPDATE rentals 
       SET status = 'CANCELLED',
           cancelled_at = $1,
           cancelled_by = $2,
           cancellation_reason_id = $3,
           cancellation_reason = $4,
           cancellation_remarks = $5,
           updated_at = $1
       WHERE id = $6
       RETURNING *`,
      [now, authorizedCancelledBy, reasonId || null, String(reason).trim(), fullCancellationRemarks, rental.id]
    );

    const updatedRental = updateRes.rows[0];

    // Free car if it was currently rented
    if (rental.car_id) {
      await client.query(`UPDATE cars SET status = 'Available', updated_at = NOW() WHERE id = $1`, [rental.car_id]);
    }

    // Maintain Audit log for cancellation with supervisor authorization
    await client.query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, old_values, new_values, username, branch, location, terminal, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'BILL_CANCELLATION',
        'RENTAL',
        updatedRental.invoice_no,
        JSON.stringify({ status: rental.status, totalAmount: rental.total_amount, carNo: rental.car_no, customer: rental.customer_name }),
        JSON.stringify({ 
          status: 'CANCELLED', 
          reason: updatedRental.cancellation_reason, 
          remarks: updatedRental.cancellation_remarks,
          authorizedBy: supervisorUser.username,
          authorizedName: supervisorName,
          authorizedRole: supervisorRole,
          cashier: userStr 
        }),
        `${userStr} / ${supervisorUser.username}`,
        branch || 'Kiddie Kruzzer',
        location || 'Main Counter',
        terminal || 'POS-Terminal-1',
        `Bill ${updatedRental.invoice_no} cancelled. Reason: ${updatedRental.cancellation_reason} | Auth: ${supervisorName} (${supervisorRole})`
      ]
    );

    await client.query('COMMIT');

    // Direct Thermal Print of CANCELLED BILL
    const rawLang = String(language || req.headers['x-language'] || 'BOTH').toUpperCase();
    const printLang: 'EN' | 'AR' | 'BOTH' = (rawLang === 'EN' || rawLang === 'AR' || rawLang === 'BOTH') ? rawLang : (rawLang === 'ARABIC' ? 'AR' : 'BOTH');

    const printerConfig = await resolvePrinterConfig({
      branch: branch || 'Avenues Mall',
      location: location || 'Zone A - Ground Floor',
      terminal: terminal || 'POS-Terminal-1',
      printType: 'CANCELLED',
    });

    const printPayload: ThermalPrintPayload = {
      printType: 'CANCELLED',
      language: printLang,
      invoiceNo: updatedRental.invoice_no,
      rental: updatedRental,
      cancelledAt: now.toLocaleString(),
      cancelledBy: userStr,
      cancellationReason: updatedRental.cancellation_reason,
      cancellationRemarks: updatedRental.cancellation_remarks,
      cashierName: userStr,
      terminal: terminal || 'POS-Terminal-1',
      locationName: location || printerConfig.locationName || 'Avenues Branch',
      branchName: branch || printerConfig.branchName || 'Avenues Mall',
    };

    const printResult = await ThermalPrinterService.sendToPrinter(printPayload, printerConfig);

    // Log print audit
    await pool.query(
      `INSERT INTO print_audit_logs (invoice_no, action, username, location_name, terminal_info, printer_name, printer_type, status, error_message, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        updatedRental.invoice_no,
        'CANCEL_BILL_PRINT',
        userStr,
        location || printerConfig.locationName || 'Main Counter',
        terminal || 'POS-Terminal-1',
        printerConfig.printerName,
        printerConfig.interfaceType,
        printResult.success ? 'SUCCESS' : 'FAILED',
        printResult.error || null,
        printResult.message
      ]
    );

    res.json({
      success: true,
      rental: updatedRental,
      printStatus: printResult,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------
// Duplicate Bill Print Endpoint (Direct Thermal Print + Audit + Counter)
// ----------------------------------------------------
app.post('/api/rentals/:id/duplicate-print', requirePermission('BILLS_DUPLICATE', 'PRINT'), async (req: Request, res: Response) => {
  const id = req.params['id'];
  const { username, terminal, location, branch, language } = req.body;
  const userStr = username || 'Cashier';

  try {
    const rentalQuery = await pool.query(
      `SELECT * FROM rentals WHERE (id::text = $1::text OR invoice_no::text = $1::text)`,
      [id]
    );

    if (rentalQuery.rowCount === 0) {
      res.status(404).json({ error: 'Rental / Bill not found.' });
      return;
    }

    const rental = rentalQuery.rows[0];
    const newReprintCount = (rental.reprint_count || 0) + 1;
    const now = new Date();

    // Increment reprint count
    const updateRes = await pool.query(
      `UPDATE rentals SET reprint_count = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [newReprintCount, rental.id]
    );
    const updatedRental = updateRes.rows[0];

    // Direct Thermal Print of DUPLICATE BILL
    const rawLang = String(language || req.headers['x-language'] || 'BOTH').toUpperCase();
    const printLang: 'EN' | 'AR' | 'BOTH' = (rawLang === 'EN' || rawLang === 'AR' || rawLang === 'BOTH') ? rawLang : (rawLang === 'ARABIC' ? 'AR' : 'BOTH');

    const printerConfig = await resolvePrinterConfig({
      branch: branch || 'Kiddie Kruzzer',
      location: location || 'Avenues Mall -Phase -4- Gate 25',
      terminal: terminal || 'POS-Terminal-1',
      printType: 'DUPLICATE',
    });

    const printPayload: ThermalPrintPayload = {
      printType: 'DUPLICATE',
      language: printLang,
      invoiceNo: updatedRental.invoice_no,
      rental: updatedRental,
      startTime: updatedRental.start_time,
      endTime: updatedRental.actual_end_time || updatedRental.expected_end_time,
      reprintCount: newReprintCount,
      reprintedBy: userStr,
      reprintTime: now.toLocaleString(),
      cashierName: updatedRental.created_by,
      terminal: terminal || 'POS-Terminal-1',
      locationName: location || printerConfig.locationName || 'Avenues Mall -Phase -4- Gate 25',
      branchName: branch || printerConfig.branchName || 'Kiddie Kruzzer',
      companyName: 'Your Events Management Company',
    };

    const printResult = await ThermalPrinterService.sendToPrinter(printPayload, printerConfig);

    // Audit Log for duplicate bill reprint
    await pool.query(
      `INSERT INTO print_audit_logs (invoice_no, action, username, location_name, terminal_info, printer_name, printer_type, status, error_message, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        updatedRental.invoice_no,
        'DUPLICATE_BILL_PRINT',
        userStr,
        location || printerConfig.locationName || 'Main Counter',
        terminal || 'POS-Terminal-1',
        printerConfig.printerName,
        printerConfig.interfaceType,
        printResult.success ? 'SUCCESS' : 'FAILED',
        printResult.error || null,
        `Duplicate reprint #${newReprintCount} dispatched directly to ${printerConfig.printerName} (${printLang})`
      ]
    );

    res.json({
      success: true,
      rental: updatedRental,
      reprintCount: newReprintCount,
      printStatus: printResult,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Duplicate Bill View Audit Endpoint
// ----------------------------------------------------
app.post('/api/rentals/:id/view-audit', async (req: Request, res: Response) => {
  const id = req.params['id'];
  const { username, terminal, location } = req.body;
  try {
    await pool.query(
      `INSERT INTO print_audit_logs (invoice_no, action, username, location_name, terminal_info, status, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, 'DUPLICATE_BILL_VIEW', username || 'Cashier', location || 'Main Counter', terminal || 'POS-Terminal-1', 'VIEWED', 'On-screen duplicate bill preview opened']
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Printer Master Endpoints (CRUD, Toggle, Test Connection & Test Print)
// ----------------------------------------------------
app.get('/api/printers', async (req: Request, res: Response) => {
  try {
    const { search, status, branch } = req.query;
    let query = `SELECT * FROM printer_settings WHERE 1=1`;
    const params: any[] = [];

    if (status && status !== 'ALL') {
      params.push(status === 'ACTIVE');
      query += ` AND is_active = $${params.length}`;
    }
    if (branch && branch !== 'ALL') {
      params.push(branch);
      query += ` AND (branch_name = $${params.length} OR branch_id = $${params.length})`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (printer_name ILIKE $${params.length} OR ip_address ILIKE $${params.length} OR id ILIKE $${params.length} OR location_name ILIKE $${params.length} OR terminal ILIKE $${params.length})`;
    }

    query += ` ORDER BY created_at DESC, id ASC`;
    const data = await pool.query(query, params);
    res.json(data.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List detected Windows printers installed on the server/client host
app.get('/api/printers/system-printers', async (_req: Request, res: Response) => {
  try {
    const printers = await ThermalPrinterService.getSystemPrinters();
    res.json({ success: true, printers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/printers', async (req: Request, res: Response) => {
  try {
    const {
      id,
      printerName,
      windowsPrinterName,
      interfaceType,
      ipAddress,
      port,
      branchId,
      branchName,
      locationId,
      locationName,
      terminal,
      printerType,
      printType,
      paperWidth,
      encoding,
      autoCut,
      cashDrawer,
      isActive,
      isDefault,
      printOnStart,
    } = req.body;

    const printerId = String(id || `PRN-${Math.floor(100 + Math.random() * 900)}`);
    const isDef = isDefault === true;

    if (isDef) {
      await pool.query(`UPDATE printer_settings SET is_default = false`);
    }

    const insertRes = await pool.query(
      `INSERT INTO printer_settings (
        id, printer_name, windows_printer_name, interface_type, ip_address, port, branch_id, branch_name,
        location_id, location_name, terminal, printer_type, print_type, paper_width,
        encoding, auto_cut, cash_drawer, is_active, is_default, print_on_start, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE
      SET printer_name = EXCLUDED.printer_name,
          windows_printer_name = EXCLUDED.windows_printer_name,
          interface_type = EXCLUDED.interface_type,
          ip_address = EXCLUDED.ip_address,
          port = EXCLUDED.port,
          branch_id = EXCLUDED.branch_id,
          branch_name = EXCLUDED.branch_name,
          location_id = EXCLUDED.location_id,
          location_name = EXCLUDED.location_name,
          terminal = EXCLUDED.terminal,
          printer_type = EXCLUDED.printer_type,
          print_type = EXCLUDED.print_type,
          paper_width = EXCLUDED.paper_width,
          encoding = EXCLUDED.encoding,
          auto_cut = EXCLUDED.auto_cut,
          cash_drawer = EXCLUDED.cash_drawer,
          is_active = EXCLUDED.is_active,
          is_default = EXCLUDED.is_default,
          print_on_start = EXCLUDED.print_on_start,
          updated_at = NOW()
      RETURNING *`,
      [
        printerId,
        printerName || 'POS Thermal Printer',
        windowsPrinterName || (interfaceType === 'USB' ? 'POS-80' : null),
        interfaceType || 'LAN',
        ipAddress || '192.168.1.200',
        Number(port) || 9100,
        branchId || null,
        branchName || null,
        locationId || null,
        locationName || null,
        terminal || 'ALL',
        printerType || 'ESC/POS',
        printType || 'ALL',
        paperWidth || '80mm',
        encoding || 'CP864',
        autoCut !== false,
        cashDrawer === true,
        isActive !== false,
        isDef,
        printOnStart !== false,
      ]
    );

    res.json(insertRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/printers/:id', async (req: Request, res: Response) => {
  const id = req.params['id'];
  try {
    const {
      printerName,
      windowsPrinterName,
      interfaceType,
      ipAddress,
      port,
      branchId,
      branchName,
      locationId,
      locationName,
      terminal,
      printerType,
      printType,
      paperWidth,
      encoding,
      autoCut,
      cashDrawer,
      isActive,
      isDefault,
      printOnStart,
    } = req.body;

    if (isDefault === true) {
      await pool.query(`UPDATE printer_settings SET is_default = false`);
    }

    const updateRes = await pool.query(
      `UPDATE printer_settings
       SET printer_name = COALESCE($1, printer_name),
           windows_printer_name = COALESCE($2, windows_printer_name),
           interface_type = COALESCE($3, interface_type),
           ip_address = COALESCE($4, ip_address),
           port = COALESCE($5, port),
           branch_id = $6,
           branch_name = $7,
           location_id = $8,
           location_name = $9,
           terminal = COALESCE($10, terminal),
           printer_type = COALESCE($11, printer_type),
           print_type = COALESCE($12, print_type),
           paper_width = COALESCE($13, paper_width),
           encoding = COALESCE($14, encoding),
           auto_cut = COALESCE($15, auto_cut),
           cash_drawer = COALESCE($16, cash_drawer),
           is_active = COALESCE($17, is_active),
           is_default = COALESCE($18, is_default),
           print_on_start = COALESCE($19, print_on_start),
           updated_at = NOW()
       WHERE id = $20
       RETURNING *`,
      [
        printerName,
        windowsPrinterName,
        interfaceType,
        ipAddress,
        port !== undefined ? Number(port) : undefined,
        branchId || null,
        branchName || null,
        locationId || null,
        locationName || null,
        terminal,
        printerType,
        printType,
        paperWidth,
        encoding,
        autoCut,
        cashDrawer,
        isActive,
        isDefault,
        printOnStart,
        id,
      ]
    );

    if (updateRes.rowCount === 0) {
      res.status(404).json({ error: 'Printer not found' });
      return;
    }
    res.json(updateRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/printers/:id/set-default', async (req: Request, res: Response) => {
  const id = req.params['id'];
  try {
    await pool.query(`UPDATE printer_settings SET is_default = false`);
    const updateRes = await pool.query(
      `UPDATE printer_settings SET is_default = true, is_active = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (updateRes.rowCount === 0) {
      res.status(404).json({ error: 'Printer not found' });
      return;
    }
    res.json({ success: true, printer: updateRes.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/printers/:id', async (req: Request, res: Response) => {
  const id = req.params['id'];
  try {
    await pool.query(`DELETE FROM printer_settings WHERE id = $1`, [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/printers/:id/toggle', async (req: Request, res: Response) => {
  const id = req.params['id'];
  try {
    const updateRes = await pool.query(
      `UPDATE printer_settings SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (updateRes.rowCount === 0) {
      res.status(404).json({ error: 'Printer not found' });
      return;
    }
    res.json(updateRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/printers/test-connection', async (req: Request, res: Response) => {
  try {
    const { id, printerConfig } = req.body;
    let cfg = printerConfig;
    if (!cfg && id) {
      const q = await pool.query(`SELECT * FROM printer_settings WHERE id = $1 LIMIT 1`, [id]);
      if (q.rowCount > 0) {
        const r = q.rows[0];
        cfg = {
          id: r.id,
          printerName: r.printer_name,
          windowsPrinterName: r.windows_printer_name,
          interfaceType: r.interface_type,
          ipAddress: r.ip_address,
          port: Number(r.port) || 9100,
          paperWidth: r.paper_width,
          encoding: r.encoding,
          autoCut: r.auto_cut,
          cashDrawer: r.cash_drawer,
          isActive: r.is_active,
          isDefault: r.is_default,
        };
      }
    } else if (!cfg && (req.body.interfaceType || req.body.windowsPrinterName || req.body.ipAddress)) {
      cfg = req.body;
    }
    if (!cfg) cfg = await getActivePrinterConfig();
    const result = await ThermalPrinterService.testSocketConnection(cfg);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/printers/test-print', '/api/printer/test-print'], async (req: Request, res: Response) => {
  try {
    const { id, printerConfig, username } = req.body;
    let cfg = printerConfig;
    if (!cfg && id) {
      const q = await pool.query(`SELECT * FROM printer_settings WHERE id = $1 LIMIT 1`, [id]);
      if (q.rowCount > 0) {
        const r = q.rows[0];
        cfg = {
          id: r.id,
          printerName: r.printer_name,
          windowsPrinterName: r.windows_printer_name,
          interfaceType: r.interface_type,
          ipAddress: r.ip_address,
          port: Number(r.port) || 9100,
          branchName: r.branch_name,
          locationName: r.location_name,
          terminal: r.terminal,
          printerType: r.printer_type,
          printType: r.print_type,
          paperWidth: r.paper_width,
          encoding: r.encoding,
          autoCut: r.auto_cut,
          cashDrawer: r.cash_drawer,
          isActive: r.is_active,
          isDefault: r.is_default,
        };
      }
    }
    if (!cfg) cfg = await getActivePrinterConfig();
    const result = await ThermalPrinterService.sendToPrinter({ printType: 'TEST' }, cfg);

    // Audit test print
    await pool.query(
      `INSERT INTO print_audit_logs (invoice_no, action, username, location_name, terminal_info, printer_name, printer_type, status, error_message, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'TEST-PRINT',
        'HARDWARE_TEST_PRINT',
        username || 'Admin',
        cfg.locationName || 'Main Counter',
        cfg.terminal || 'POS-Terminal-1',
        cfg.printerName,
        cfg.interfaceType,
        result.success ? 'SUCCESS' : 'FAILED',
        result.error || null,
        result.message
      ]
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/printer/settings', async (_req: Request, res: Response) => {
  try {
    const cfg = await getActivePrinterConfig();
    res.json(cfg);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/printer/settings', async (req: Request, res: Response) => {
  try {
    const { printerName, windowsPrinterName, interfaceType, ipAddress, port, paperWidth, encoding, autoCut, cashDrawer, isActive } = req.body;
    const resQuery = await pool.query(
      `INSERT INTO printer_settings (id, printer_name, windows_printer_name, interface_type, ip_address, port, paper_width, encoding, auto_cut, cash_drawer, is_active, updated_at)
       VALUES ('DEFAULT_PRINTER', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (id) DO UPDATE
       SET printer_name = EXCLUDED.printer_name,
           windows_printer_name = COALESCE(EXCLUDED.windows_printer_name, printer_settings.windows_printer_name),
           interface_type = EXCLUDED.interface_type,
           ip_address = EXCLUDED.ip_address,
           port = EXCLUDED.port,
           paper_width = EXCLUDED.paper_width,
           encoding = EXCLUDED.encoding,
           auto_cut = EXCLUDED.auto_cut,
           cash_drawer = EXCLUDED.cash_drawer,
           is_active = EXCLUDED.is_active,
           updated_at = NOW()
       RETURNING *`,
      [
        printerName || 'Counter 1 Thermal Printer',
        windowsPrinterName || null,
        interfaceType || 'LAN',
        ipAddress || '192.168.1.200',
        Number(port) || 9100,
        paperWidth || '80mm',
        encoding || 'CP864',
        autoCut !== false,
        cashDrawer === true,
        isActive !== false
      ]
    );
    res.json(resQuery.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/audit-logs/bills', async (_req: Request, res: Response) => {
  try {
    const logs = await pool.query(
      `SELECT 
         id::text as id,
         created_at,
         entity_id as invoice_no,
         action,
         username,
         terminal as printer_name,
         'SUCCESS' as status,
         remarks
       FROM audit_logs 
       WHERE action IN ('CAR_CHANGE', 'CAR_SWAP', 'BILL_CANCELLATION', 'RENTAL_CANCEL', 'VOID_BILL')
          OR entity_type = 'RENTAL'
       UNION ALL
       SELECT 
         id::text as id,
         created_at,
         invoice_no,
         action,
         username,
         printer_name,
         status,
         remarks
       FROM print_audit_logs
       ORDER BY created_at DESC 
       LIMIT 150`
    );
    res.json(logs.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/audit-logs', async (req: Request, res: Response) => {
  try {
    const { limit, action, search } = req.query;
    let query = `SELECT * FROM audit_logs WHERE 1=1`;
    const params: any[] = [];
    if (action) {
      params.push(action);
      query += ` AND action = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (entity_id ILIKE $${params.length} OR username ILIKE $${params.length} OR remarks ILIKE $${params.length})`;
    }
    query += ` ORDER BY created_at DESC LIMIT ${Number(limit) || 100}`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});



// ----------------------------------------------------
// Multilingual Translations Endpoints
// ----------------------------------------------------

// 1. Get Translation Dictionary for Frontend Runtime (Key -> Text)
app.get('/api/translations', async (req: Request, res: Response) => {
  try {
    const lang = String(req.query['language'] || req.query['lang'] || 'en').toLowerCase();
    const rows = await db
      .select({
        translationKey: schema.translations.translationKey,
        englishText: schema.translations.englishText,
        arabicText: schema.translations.arabicText,
      })
      .from(schema.translations)
      .where(eq(schema.translations.isActive, 'ACTIVE'));

    const dictionary: Record<string, string> = {};
    for (const row of rows) {
      if (lang === 'ar') {
        dictionary[row.translationKey] = row.arabicText || row.englishText;
      } else {
        dictionary[row.translationKey] = row.englishText;
      }
    }

    res.json(dictionary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get All Translation Entities for Admin Management UI
app.get('/api/translations/all', async (req: Request, res: Response) => {
  try {
    const moduleFilter = req.query['module'] ? String(req.query['module']) : undefined;
    const search = req.query['search'] ? String(req.query['search']).toLowerCase().trim() : undefined;

    let query = db.select().from(schema.translations);
    let rows = await query.orderBy(schema.translations.module, schema.translations.translationKey);

    if (moduleFilter && moduleFilter !== 'ALL') {
      rows = rows.filter((r) => r.module.toLowerCase() === moduleFilter.toLowerCase());
    }

    if (search) {
      rows = rows.filter(
        (r) =>
          r.translationKey.toLowerCase().includes(search) ||
          r.englishText.toLowerCase().includes(search) ||
          r.arabicText.toLowerCase().includes(search) ||
          (r.description && r.description.toLowerCase().includes(search))
      );
    }

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Create or Update Translation Key (Admin)
app.post('/api/translations', async (req: Request, res: Response) => {
  try {
    const { id, translationKey, englishText, arabicText, module, description, isActive } = req.body;

    if (!translationKey || !englishText) {
      res.status(400).json({ error: 'Translation Key and English Text are required' });
      return;
    }

    const key = String(translationKey).trim().toUpperCase();
    const trnId = String(id || `TRN-${Math.floor(1000 + Math.random() * 9000)}`);
    const mod = String(module || 'Common').trim();
    const arText = arabicText !== undefined ? String(arabicText).trim() : String(englishText).trim();
    const enText = String(englishText).trim();
    const status = isActive || 'ACTIVE';

    const [saved] = await db
      .insert(schema.translations)
      .values({
        id: trnId,
        translationKey: key,
        englishText: enText,
        arabicText: arText,
        module: mod,
        description: description ? String(description).trim() : null,
        isActive: status,
      })
      .onConflictDoUpdate({
        target: schema.translations.translationKey,
        set: {
          englishText: enText,
          arabicText: arText,
          module: mod,
          description: description ? String(description).trim() : null,
          isActive: status,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Batch Import Translations (Matching Exact Export Format: Excel, CSV, JSON)
app.post(['/api/translations/import', '/api/translations/bulk-import'], async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const rawItems = Array.isArray(req.body) ? req.body : (Array.isArray(req.body?.items) ? req.body.items : []);
    const mode = String(req.body?.mode || 'UPSERT').toUpperCase().trim(); // 'UPSERT' or 'NEW_ONLY'

    if (!rawItems || rawItems.length === 0) {
      res.status(400).json({ error: 'No translation items provided for import.' });
      return;
    }

    // Helper to infer module name from translation key prefix
    const inferModule = (key: string, providedModule?: string): string => {
      if (providedModule && providedModule.trim() && providedModule.trim().toLowerCase() !== 'undefined' && providedModule.trim().toLowerCase() !== 'null') {
        return providedModule.trim();
      }
      const prefix = key.split('.')[0] || '';
      switch (prefix.toUpperCase()) {
        case 'NAV': return 'Navigation';
        case 'POS': return 'POS';
        case 'PRINTER': return 'Printer';
        case 'FORMAT': return 'Format';
        case 'BILLS':
        case 'BILLS_DUPLICATE':
        case 'BILLS_CANCEL': return 'Bills';
        case 'SHIFT':
        case 'SHIFT_CLOSE': return 'ShiftClose';
        case 'DAY':
        case 'DAY_CLOSE': return 'DayClose';
        case 'COMPANY': return 'Company';
        case 'BRANCH': return 'Branch';
        case 'LOCATION': return 'Location';
        case 'USER': return 'User';
        case 'RIGHTS': return 'UserRights';
        case 'CAR_MODEL': return 'CarModel';
        case 'CAR': return 'Fleet';
        case 'RATE': return 'RateSetup';
        case 'GRACE_PERIOD': return 'GracePeriod';
        case 'TRANS': return 'Translations';
        case 'MASTER_EXPORT':
        case 'EXPORT': return 'MasterExport';
        case 'REPORT': return 'Reports';
        case 'COMMON': return 'Common';
        default: return 'Common';
      }
    };

    await client.query('BEGIN');

    // Fetch existing keys for tracking and mode filtering
    const existingRes = await client.query(`SELECT id, translation_key FROM translations`);
    const existingMap = new Map<string, string>();
    for (const r of existingRes.rows) {
      existingMap.set(String(r.translation_key).toUpperCase().trim(), r.id);
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ key: string; error: string }> = [];

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      if (!item) continue;

      const rawKey = item.translationKey || item.translation_key || item.key || item['Translation Key'] || item['مفتاح الترجمة'] || item['مفتاح'];
      const rawEn = item.englishText || item.english_text || item.en || item['English Text'] || item['النص الإنجليزي'] || item['إنجليزي'];
      const rawAr = item.arabicText || item.arabic_text || item.ar || item['Arabic Text'] || item['النص العربي'] || item['عربي'];
      const rawMod = item.module || item['Module'] || item['الوحدة'] || item['الوحدة / الشاشة'] || item['الوحدة / القسم'] || item['القسم'];
      const rawDesc = item.description || item['Description'] || item['الوصف'] || item['الوصف / السياق'] || null;
      const rawStatus = item.isActive || item.is_active || item.status || item['Status'] || item['الحالة'] || 'ACTIVE';
      const rawId = item.id || item.ID || item['الرمز'];

      if (!rawKey || !String(rawKey).trim()) {
        errors.push({ key: `Row #${i + 1}`, error: 'Missing translation key' });
        skippedCount++;
        continue;
      }

      if (!rawEn && rawEn !== '') {
        errors.push({ key: String(rawKey), error: 'Missing English text' });
        skippedCount++;
        continue;
      }

      const key = String(rawKey).trim().toUpperCase();
      const enText = String(rawEn !== undefined && rawEn !== null ? rawEn : '').trim();
      const arText = String(rawAr !== undefined && rawAr !== null && String(rawAr).trim() !== '' ? rawAr : enText).trim();
      const mod = inferModule(key, rawMod);
      const desc = rawDesc ? String(rawDesc).trim() : null;
      const status = String(rawStatus).toUpperCase().trim() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

      const isExisting = existingMap.has(key);

      if (isExisting && mode === 'NEW_ONLY') {
        skippedCount++;
        continue;
      }

      const trnId = isExisting ? existingMap.get(key) : (rawId ? String(rawId).trim() : `TRN-${Math.floor(1000 + Math.random() * 90000)}`);

      await client.query(
        `INSERT INTO translations (id, translation_key, english_text, arabic_text, module, description, is_active, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (translation_key) DO UPDATE
         SET english_text = EXCLUDED.english_text,
             arabic_text = EXCLUDED.arabic_text,
             module = EXCLUDED.module,
             description = EXCLUDED.description,
             is_active = EXCLUDED.is_active,
             updated_at = NOW()`,
        [trnId, key, enText, arText, mod, desc, status]
      );

      if (isExisting) {
        updatedCount++;
      } else {
        createdCount++;
        existingMap.set(key, trnId!);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      total: rawItems.length,
      createdCount,
      updatedCount,
      skippedCount,
      errors,
      message: `Successfully imported translations: ${createdCount} new keys created, ${updatedCount} keys updated${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}.`,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 5. Delete Translation Key (Admin)
app.delete('/api/translations/:id', async (req: Request, res: Response) => {
  try {
    const idOrKey = String(req.params['id'] || '').trim();
    if (!idOrKey) {
      res.status(400).json({ error: 'Translation ID or Key required' });
      return;
    }

    const delRes = await pool.query(
      `DELETE FROM translations WHERE id = $1 OR translation_key = $2 RETURNING *`,
      [idOrKey, idOrKey.toUpperCase()]
    );

    if (delRes.rowCount === 0) {
      res.status(404).json({ error: 'Translation key not found' });
      return;
    }

    res.json({ success: true, deleted: delRes.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Server-Side Master Export Endpoint (Excel, CSV, JSON)
// ----------------------------------------------------
app.get('/api/export/:master', async (req: Request, res: Response) => {
  try {
    const rawMaster = String(req.params['master'] || '').toLowerCase().trim();
    const format = String(req.query['format'] || 'csv').toLowerCase().trim();
    const search = req.query['search'] ? String(req.query['search']).toLowerCase().trim() : '';
    const status = req.query['status'] ? String(req.query['status']).toUpperCase().trim() : 'ALL';
    const moduleFilter = req.query['module'] ? String(req.query['module']).trim() : 'ALL';

    let data: any[] = [];
    let filename = `${rawMaster}_export_${new Date().toISOString().slice(0, 10)}`;

    switch (rawMaster) {
      case 'company':
      case 'companies':
        data = await db.select().from(schema.companies).orderBy(schema.companies.id);
        break;
      case 'branch':
      case 'branches':
        data = await db.select().from(schema.branches).orderBy(schema.branches.id);
        break;
      case 'location':
      case 'locations':
        data = await db.select().from(schema.locations).orderBy(schema.locations.id);
        break;
      case 'user':
      case 'users':
        data = await db.select({
          id: schema.users.id,
          username: schema.users.username,
          employeeName: schema.users.employeeName,
          role: schema.users.role,
          status: schema.users.status,
          createdAt: schema.users.createdAt,
        }).from(schema.users).orderBy(schema.users.id);
        break;
      case 'car-model':
      case 'car-models':
      case 'categories':
        data = await db.select().from(schema.carModels).orderBy(schema.carModels.id);
        break;
      case 'car':
      case 'cars':
        data = await db.select().from(schema.cars).orderBy(schema.cars.carNo);
        break;
      case 'rate':
      case 'rates':
        data = await db.select().from(schema.rates).orderBy(schema.rates.duration);
        break;
      case 'grace-period':
      case 'grace-periods':
        data = await db.select().from(schema.gracePeriods);
        break;
      case 'translations':
        data = await db.select().from(schema.translations).orderBy(schema.translations.module, schema.translations.translationKey);
        if (moduleFilter && moduleFilter !== 'ALL') {
          data = data.filter(d => String(d.module).toLowerCase() === moduleFilter.toLowerCase());
        }
        break;
      case 'rentals':
        data = await db.select().from(schema.rentals).orderBy(desc(schema.rentals.startTime));
        break;
      case 'shifts':
        data = await db.select().from(schema.shifts).orderBy(desc(schema.shifts.startTime));
        break;
      case 'day-closes':
      case 'day-close':
        data = await db.select().from(schema.dayCloses).orderBy(desc(schema.dayCloses.createdAt));
        break;
      case 'printers':
      case 'printer':
      case 'printer-settings':
        data = await db.select().from(schema.printerSettings).orderBy(schema.printerSettings.id);
        break;
      case 'print-formats':
      case 'print-format':
      case 'format':
      case 'formats':
        data = await db.select().from(schema.printFormats).orderBy(schema.printFormats.id);
        break;
      case 'user-rights':
      case 'role-permissions':
      case 'permissions':
        data = await db.select().from(schema.rolePermissions).orderBy(schema.rolePermissions.role, schema.rolePermissions.id);
        break;
      default:
        res.status(400).json({ error: `Unknown master: ${rawMaster}. Available: company, branch, location, user, car-model, car, rate, grace-period, translations, printers, print-formats, user-rights` });
        return;
    }

    // Apply Status Filter
    if (status && status !== 'ALL') {
      data = data.filter(item => {
        const itemStatus = item.status || item.isActive || item.is_active;
        return itemStatus && String(itemStatus).toUpperCase() === status;
      });
    }

    // Apply Search Filter
    if (search) {
      data = data.filter(item => {
        return Object.values(item).some(val => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(search);
        });
      });
    }

    // Handle Formats
    if (format === 'json') {
      res.json(data);
      return;
    }

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Master Data');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.send(buffer);
      return;
    }

    // Default: CSV format with UTF-8 BOM
    if (data.length === 0) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send('\uFEFF');
      return;
    }

    const headers = Object.keys(data[0]);
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    };

    const csvLines = [
      headers.map(h => escapeCsv(h)).join(','),
      ...data.map(row => headers.map(h => escapeCsv(row[h])).join(','))
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send('\uFEFF' + csvLines.join('\r\n'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});



// Serve Angular SPA in Production if static files exist
const distPath = path.resolve(process.cwd(), 'dist/applet/browser');
const altDistPath = path.resolve(process.cwd(), '../wwwroot');
const staticPath = fs.existsSync(distPath) ? distPath : (fs.existsSync(altDistPath) ? altDistPath : null);

if (staticPath) {
  console.log(`📁 Serving static Angular frontend from: ${staticPath}`);
  app.use(express.static(staticPath));
  app.use((req: Request, res: Response, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Kiddie Kruzzer POS PostgreSQL Server is running on http://127.0.0.1:${PORT}`);
});
