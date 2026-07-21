import fs from 'fs';
import path from 'path';
import mysql, { Pool } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Define Paths
const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'db-config.json');
const JSON_DB_FILE = path.join(DATA_DIR, 'local_server_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface MySQLConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

// Global state
let mysqlPool: Pool | null = null;
let isUsingMySQL = false;
let dbStatusMessage = 'ระบบเริ่มต้นทำงาน: คลังข้อมูลทำงานบน JSON Server DB ในตัว';

// Load Database Config (combining ENV and UI-configured JSON settings)
export function getDBConfig(): MySQLConfig {
  let config: MySQLConfig = {
    host: process.env.DB_HOST || '',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'school_portfolio'
  };

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      config = { ...config, ...saved };
    } catch (e) {
      console.error('Error reading db-config.json:', e);
    }
  }

  return config;
}

// Save dynamic DB config from UI
export function saveDBConfig(config: MySQLConfig) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// Get Database connection status
export function getDBStatus() {
  return {
    isUsingMySQL,
    message: dbStatusMessage,
    config: {
      host: getDBConfig().host || 'ไม่มี (ใช้ Offline DB ในเครื่อง)',
      database: getDBConfig().database || 'school_portfolio',
      user: getDBConfig().user || 'root'
    }
  };
}

// Helper to check if MySQL is configured and available
export async function initDatabase() {
  const config = getDBConfig();
  
  if (!config.host) {
    isUsingMySQL = false;
    dbStatusMessage = 'คลังข้อมูลทำงานบน Offline JSON Server DB (ยังไม่ได้กรอก Host ตั้งค่า MySQL)';
    console.log('No DB_HOST provided. Using Local Server JSON database fallback.');
    initJSONDatabase();
    return;
  }

  try {
    console.log(`Attempting to connect to MySQL database at ${config.host}:${config.port}...`);
    
    // First, connect without a database to create it if it does not exist
    const setupConn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    });

    await setupConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await setupConn.end();

    // Now connect to the database
    mysqlPool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test connection
    const conn = await mysqlPool.getConnection();
    conn.release();

    isUsingMySQL = true;
    dbStatusMessage = `เชื่อมต่อฐานข้อมูล MySQL (${config.database}) บน phpMyAdmin สำเร็จ!`;
    console.log(`Successfully connected to MySQL database: ${config.database}`);

    // Automatically install/update tables
    await autoInstallMySQLTables();

  } catch (error: any) {
    isUsingMySQL = false;
    dbStatusMessage = `เกิดข้อผิดพลาดในการเชื่อมต่อ MySQL: ${error.message} (กำลังสลับมาทำงานบน JSON Server DB อัตโนมัติ)`;
    console.error('MySQL Connection failed. Falling back to Local Server JSON database.', error.message);
    initJSONDatabase();
  }
}

// Automatic Table Creation and Schema Updates
async function autoInstallMySQLTables() {
  if (!mysqlPool) return;

  try {
    // 1. Create Users Table
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        role VARCHAR(20) NOT NULL,
        avatarUrl VARCHAR(255)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Create Portfolios Table
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS portfolios (
        id VARCHAR(50) PRIMARY KEY,
        category VARCHAR(20) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        academicYear VARCHAR(10) NOT NULL,
        awardDate VARCHAR(20) NOT NULL,
        giver VARCHAR(255) NOT NULL,
        rewardLevel VARCHAR(50) NOT NULL,
        ownerName VARCHAR(100) NOT NULL,
        position VARCHAR(100),
        department VARCHAR(100),
        studentClass VARCHAR(100),
        responsiblePerson VARCHAR(100),
        attachments TEXT,
        approved TINYINT(1) DEFAULT 0,
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Dynamic Schema Update (Checks if any column is missing and appends it automatically)
    // For example, checking if 'approved' is in portfolios
    const [columns]: any = await mysqlPool.query('SHOW COLUMNS FROM portfolios');
    const colNames = columns.map((c: any) => c.Field);
    
    if (!colNames.includes('approved')) {
      await mysqlPool.query('ALTER TABLE portfolios ADD COLUMN approved TINYINT(1) DEFAULT 0');
      console.log('Auto-Update: Added "approved" column to portfolios table.');
    }
    if (!colNames.includes('academicYear')) {
      await mysqlPool.query('ALTER TABLE portfolios ADD COLUMN academicYear VARCHAR(10) NOT NULL DEFAULT "2568"');
      console.log('Auto-Update: Added "academicYear" column to portfolios table.');
    }

    // Seed default administrator if users table is empty
    const [rows]: any = await mysqlPool.query('SELECT COUNT(*) as count FROM users');
    if (rows[0].count === 0) {
      const adminUser = process.env.ADMIN_USERNAME || 'admin';
      const adminPass = process.env.ADMIN_PASSWORD || 'admin1234';
      
      await mysqlPool.query(`
        INSERT INTO users (id, username, password, name, email, role, avatarUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'user-admin',
        adminUser,
        adminPass, // In production, we'd hash this, but we keep it plain/simple for local school servers to simplify administration/lost passwords
        'ผู้อำนวยการสมชาย (Admin)',
        'director.somchai@nhw.ac.th',
        'admin',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'
      ]);

      // Seed a default teacher too
      await mysqlPool.query(`
        INSERT INTO users (id, username, password, name, email, role, avatarUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'user-teacher',
        'teacher1',
        'teacher1234',
        'คุณครูเพียรพรรณ (Teacher)',
        'peyarmteacher@gmail.com',
        'teacher',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
      ]);

      console.log('Auto-Seed: Seeded default Admin and Teacher credentials into MySQL users table.');
    }

    // 3. Create Settings Table
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed default settings if empty
    const [settingCountRows]: any = await mysqlPool.query('SELECT COUNT(*) as count FROM settings');
    if (settingCountRows[0].count === 0) {
      await mysqlPool.query(`
        INSERT INTO settings (setting_key, setting_value) VALUES 
        ('school_name', 'โรงเรียนบ้านหนองหว้า'),
        ('school_logo', '')
      `);
      console.log('Auto-Seed: Seeded default school settings into MySQL settings table.');
    }

    console.log('MySQL Database Auto-Installation and Updates checked and applied successfully.');
  } catch (err) {
    console.error('Error during MySQL tables installation:', err);
  }
}

// --- JSON Fallback Database ---
interface DatabaseSchema {
  users: any[];
  portfolios: any[];
  settings?: { setting_key: string; setting_value: string }[];
}

function initJSONDatabase() {
  if (!fs.existsSync(JSON_DB_FILE)) {
    const defaultData: DatabaseSchema = {
      users: [
        {
          id: 'user-admin',
          username: process.env.ADMIN_USERNAME || 'admin',
          password: process.env.ADMIN_PASSWORD || 'admin1234',
          name: 'ผู้อำนวยการสมชาย (Admin)',
          email: 'director.somchai@nhw.ac.th',
          role: 'admin',
          avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'
        },
        {
          id: 'user-teacher',
          username: 'teacher1',
          password: 'teacher1234',
          name: 'คุณครูเพียรพรรณ (Teacher)',
          email: 'peyarmteacher@gmail.com',
          role: 'teacher',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
        }
      ],
      portfolios: [
        {
          id: 'school-1',
          category: 'school',
          type: 'Best Practice',
          title: 'นวัตกรรมการอ่านออกเขียนได้ 100% ด้วยคลังสื่อ "หนองหว้าโมเดล"',
          description: 'พัฒนาระบบคลังสื่อการสอนอิเล็กทรอนิกส์และแผนการจัดการเรียนรู้แบบ Active Learning เพื่อแก้ไขปัญหาภาวะถดถอยทางการเรียนรู้ด้านภาษาไทยของนักเรียนชั้นประถมศึกษาปีที่ 1-3 ส่งผลให้นักเรียนทุกคนอ่านออกเขียนได้ครบ 100%',
          academicYear: '2568',
          awardDate: '2026-03-15',
          giver: 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาประจวบคีรีขันธ์ เขต 1',
          rewardLevel: 'เขตพื้นที่',
          ownerName: 'โรงเรียนบ้านหนองหว้า',
          position: 'สถานศึกษา',
          department: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
          studentClass: 'ประถมศึกษาปีที่ 1 - 3',
          responsiblePerson: 'นางวิมล แสงสุวรรณ และคณะครูประถมศึกษา',
          attachments: [
            {
              id: 'mock-doc-1',
              name: 'คู่มือการดำเนินงานหนองหว้าโมเดล.pdf',
              type: 'application/pdf',
              url: '#'
            },
            {
              id: 'mock-img-1',
              name: 'กิจกรรมการสอนด้วยคลังสื่อ.jpg',
              type: 'image/jpeg',
              url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=600'
            }
          ],
          approved: true,
          createdAt: '2026-03-15T10:00:00Z'
        },
        {
          id: 'school-2',
          category: 'school',
          type: 'รางวัลสถานศึกษา',
          title: 'รางวัลโรงเรียนพระราชทาน ประเภทสถานศึกษาขนาดเล็ก ระดับเขตพื้นที่ฯ',
          description: 'ผลการประเมินสถานศึกษาดีเด่นเพื่อรับรางวัลพระราชทาน ประจำปีการศึกษา 2568 ประเมินครอบคลุม 5 ด้าน ได้แก่ คุณภาพผู้เรียน การบริหารงานวิชาการ การบริหารจัดการศึกษา การดำเนินงานตามนโยบาย และผลงานดีเด่น',
          academicYear: '2568',
          awardDate: '2026-06-20',
          giver: 'กระทรวงศึกษาธิการ',
          rewardLevel: 'เขตพื้นที่',
          ownerName: 'โรงเรียนบ้านหนองหว้า',
          position: 'สถานศึกษา',
          department: 'ฝ่ายบริหารงานทั่วไป',
          studentClass: 'อนุบาล - ประถมศึกษาปีที่ 6',
          responsiblePerson: 'นายสมชาย พลดี (ผู้อำนวยการโรงเรียน)',
          attachments: [
            {
              id: 'mock-img-2',
              name: 'ภาพบรรจุรับการประเมินโรงเรียนพระราชทาน.jpg',
              type: 'image/jpeg',
              url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=600'
            }
          ],
          approved: true,
          createdAt: '2026-06-20T14:30:00Z'
        },
        {
          id: 'teacher-1',
          category: 'teacher',
          type: 'รางวัลครูดีเด่น',
          title: 'เกียรติบัตรรางวัลครูผู้สอนดีเด่น (กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี)',
          description: 'ได้รับรางวัลยกย่องเชิดชูเกียรติเป็นครูผู้สอนดีเด่น เนื่องในวันครู ประจำปี 2569 จากผู้สร้างสรรค์นวัตกรรมการสอนแบบ STEM ร่วมกับภูมิปัญญาท้องถิ่น "เครื่องกรองน้ำชีวภาพหนองหว้า"',
          academicYear: '2569',
          awardDate: '2026-01-16',
          giver: 'สำนักงานเลขาธิการคุรุสภา',
          rewardLevel: 'จังหวัด',
          ownerName: 'นายณัฐพล สมบูรณ์',
          position: 'ครู คศ.2',
          department: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
          studentClass: 'ประถมศึกษาปีที่ 4 - 6',
          responsiblePerson: 'นายณัฐพล สมบูรณ์',
          attachments: [
            {
              id: 'mock-doc-2',
              name: 'แผนการจัดการเรียนรู้สะเต็มศึกษา_ภูมิปัญญาท้องถิ่น.pdf',
              type: 'application/pdf',
              url: '#'
            },
            {
              id: 'mock-img-3',
              name: 'รับมอบเกียรติบัตรวันครู.jpg',
              type: 'image/jpeg',
              url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=600'
            }
          ],
          approved: true,
          createdAt: '2026-01-16T09:15:00Z'
        },
        {
          id: 'teacher-2',
          category: 'teacher',
          type: 'วิจัยในชั้นเรียน',
          title: 'การพัฒนาผลสัมฤทธิ์ทางการเรียนวิชาคณิตศาสตร์ เรื่องเศษส่วน โดยใช้เกมบอร์ดเชิงโต้ตอบสำหรับนักเรียนชั้น ป.5',
          description: 'งานวิจัยเพื่อการแก้ปัญหาการเรียนเรื่องเศษส่วนด้วยนวัตกรรมสื่อบอร์ดเกม "Fraction Kingdom" ช่วยกระตุ้นความสนใจและทำให้ผู้เรียนเข้าใจความสัมพันธ์ของเศษส่วนผ่านการจำลองสถานการณ์ ส่งผลให้ผลการทดสอบหลังเรียนเพิ่มขึ้นเฉลี่ยร้อยละ 35',
          academicYear: '2568',
          awardDate: '2026-02-25',
          giver: 'โรงเรียนบ้านหนองหว้า',
          rewardLevel: 'โรงเรียน',
          ownerName: 'นางสาวสิรินทรา แก้วตา',
          position: 'ครูผู้ช่วย',
          department: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
          studentClass: 'ประถมศึกษาปีที่ 5',
          responsiblePerson: 'นางสาวสิรินทรา แก้วตา',
          attachments: [
            {
              id: 'mock-doc-3',
              name: 'รูปเล่มรายงานการวิจัยในชั้นเรียนคณิตศาสตร์ ป.5.pdf',
              type: 'application/pdf',
              url: '#'
            }
          ],
          approved: true,
          createdAt: '2026-02-25T11:20:00Z'
        }
      ],
      settings: [
        { setting_key: 'school_name', setting_value: 'โรงเรียนบ้านหนองหว้า' },
        { setting_key: 'school_logo', setting_value: '' }
      ]
    };
    fs.writeFileSync(JSON_DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

function readJSONDB(): DatabaseSchema {
  initJSONDatabase();
  try {
    return JSON.parse(fs.readFileSync(JSON_DB_FILE, 'utf-8'));
  } catch (e) {
    console.error('Error reading json db file:', e);
    return { users: [], portfolios: [] };
  }
}

function writeJSONDB(data: DatabaseSchema) {
  fs.writeFileSync(JSON_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// --- Query Functions with MySQL + JSON Fallback ---

export async function queryUsers(): Promise<any[]> {
  if (isUsingMySQL && mysqlPool) {
    const [rows] = await mysqlPool.query('SELECT id, username, name, email, role, avatarUrl FROM users ORDER BY name ASC');
    return rows as any[];
  } else {
    const db = readJSONDB();
    return db.users.map(({ password, ...u }) => u);
  }
}

export async function authenticateUser(username: string, password: string): Promise<any | null> {
  if (isUsingMySQL && mysqlPool) {
    const [rows]: any = await mysqlPool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
    if (rows.length > 0) {
      const { password: _, ...user } = rows[0];
      return user;
    }
    return null;
  } else {
    const db = readJSONDB();
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) {
      const { password: _, ...u } = user;
      return u;
    }
    return null;
  }
}

export async function addUser(user: any): Promise<any> {
  if (isUsingMySQL && mysqlPool) {
    await mysqlPool.query(`
      INSERT INTO users (id, username, password, name, email, role, avatarUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [user.id, user.username, user.password, user.name, user.email || '', user.role, user.avatarUrl || '']);
    const { password, ...safeUser } = user;
    return safeUser;
  } else {
    const db = readJSONDB();
    // Check duplicate username
    if (db.users.some(u => u.username.toLowerCase() === user.username.toLowerCase())) {
      throw new Error('ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว');
    }
    db.users.push(user);
    writeJSONDB(db);
    const { password, ...safeUser } = user;
    return safeUser;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  if (isUsingMySQL && mysqlPool) {
    await mysqlPool.query('DELETE FROM users WHERE id = ?', [id]);
    return true;
  } else {
    const db = readJSONDB();
    db.users = db.users.filter(u => u.id !== id);
    writeJSONDB(db);
    return true;
  }
}

export async function queryPortfolios(filters?: { category?: string; academicYear?: string }): Promise<any[]> {
  if (isUsingMySQL && mysqlPool) {
    let sql = 'SELECT * FROM portfolios';
    const params: any[] = [];
    
    if (filters) {
      const clauses: string[] = [];
      if (filters.category) {
        clauses.push('category = ?');
        params.push(filters.category);
      }
      if (filters.academicYear) {
        clauses.push('academicYear = ?');
        params.push(filters.academicYear);
      }
      if (clauses.length > 0) {
        sql += ' WHERE ' + clauses.join(' AND ');
      }
    }
    
    sql += ' ORDER BY createdAt DESC';
    const [rows]: any = await mysqlPool.query(sql, params);
    
    return rows.map((r: any) => ({
      ...r,
      approved: !!r.approved,
      attachments: r.attachments ? JSON.parse(r.attachments) : []
    }));
  } else {
    const db = readJSONDB();
    let result = db.portfolios;
    if (filters) {
      if (filters.category) {
        result = result.filter(p => p.category === filters.category);
      }
      if (filters.academicYear) {
        result = result.filter(p => p.academicYear === filters.academicYear);
      }
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function savePortfolio(portfolio: any): Promise<any> {
  const attachmentsJson = JSON.stringify(portfolio.attachments || []);
  const isNew = !portfolio.id;
  const portfolioId = portfolio.id || 'item-' + Date.now().toString() + '-' + Math.random().toString(36).substr(2, 5);

  const portfolioData = {
    ...portfolio,
    id: portfolioId,
    approved: portfolio.approved ? 1 : 0,
    createdAt: portfolio.createdAt || new Date().toISOString()
  };

  if (isUsingMySQL && mysqlPool) {
    if (isNew) {
      await mysqlPool.query(`
        INSERT INTO portfolios (
          id, category, type, title, description, academicYear, awardDate, 
          giver, rewardLevel, ownerName, position, department, studentClass, 
          responsiblePerson, attachments, approved, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        portfolioData.id, portfolioData.category, portfolioData.type, portfolioData.title,
        portfolioData.description || '', portfolioData.academicYear, portfolioData.awardDate,
        portfolioData.giver, portfolioData.rewardLevel, portfolioData.ownerName,
        portfolioData.position || '', portfolioData.department || '', portfolioData.studentClass || '',
        portfolioData.responsiblePerson || '', attachmentsJson, portfolioData.approved, portfolioData.createdAt
      ]);
    } else {
      await mysqlPool.query(`
        UPDATE portfolios SET 
          category = ?, type = ?, title = ?, description = ?, academicYear = ?, awardDate = ?, 
          giver = ?, rewardLevel = ?, ownerName = ?, position = ?, department = ?, studentClass = ?, 
          responsiblePerson = ?, attachments = ?, approved = ?
        WHERE id = ?
      `, [
        portfolioData.category, portfolioData.type, portfolioData.title, portfolioData.description || '',
        portfolioData.academicYear, portfolioData.awardDate, portfolioData.giver, portfolioData.rewardLevel,
        portfolioData.ownerName, portfolioData.position || '', portfolioData.department || '', portfolioData.studentClass || '',
        portfolioData.responsiblePerson || '', attachmentsJson, portfolioData.approved, portfolioData.id
      ]);
    }
    
    return {
      ...portfolioData,
      approved: !!portfolioData.approved,
      attachments: portfolio.attachments || []
    };
  } else {
    const db = readJSONDB();
    const index = db.portfolios.findIndex(p => p.id === portfolioData.id);
    
    const dbPortfolio = {
      ...portfolioData,
      approved: !!portfolioData.approved
    };

    if (index >= 0) {
      db.portfolios[index] = dbPortfolio;
    } else {
      db.portfolios.unshift(dbPortfolio);
    }
    writeJSONDB(db);
    return dbPortfolio;
  }
}

export async function deletePortfolio(id: string): Promise<boolean> {
  if (isUsingMySQL && mysqlPool) {
    await mysqlPool.query('DELETE FROM portfolios WHERE id = ?', [id]);
    return true;
  } else {
    const db = readJSONDB();
    db.portfolios = db.portfolios.filter(p => p.id !== id);
    writeJSONDB(db);
    return true;
  }
}

export async function setApprovalPortfolio(id: string, approved: boolean): Promise<boolean> {
  const approvedVal = approved ? 1 : 0;
  if (isUsingMySQL && mysqlPool) {
    await mysqlPool.query('UPDATE portfolios SET approved = ? WHERE id = ?', [approvedVal, id]);
    return true;
  } else {
    const db = readJSONDB();
    const index = db.portfolios.findIndex(p => p.id === id);
    if (index >= 0) {
      db.portfolios[index].approved = approved;
      writeJSONDB(db);
      return true;
    }
    return false;
  }
}

export async function querySettings(): Promise<Record<string, string>> {
  if (isUsingMySQL && mysqlPool) {
    const [rows]: any = await mysqlPool.query('SELECT * FROM settings');
    const result: Record<string, string> = {
      school_name: 'โรงเรียนบ้านหนองหว้า',
      school_logo: ''
    };
    rows.forEach((r: any) => {
      result[r.setting_key] = r.setting_value;
    });
    return result;
  } else {
    const db = readJSONDB();
    const result: Record<string, string> = {
      school_name: 'โรงเรียนบ้านหนองหว้า',
      school_logo: ''
    };
    if (db.settings) {
      db.settings.forEach((s: any) => {
        result[s.setting_key] = s.setting_value;
      });
    }
    return result;
  }
}

export async function saveSetting(key: string, value: string): Promise<boolean> {
  if (isUsingMySQL && mysqlPool) {
    await mysqlPool.query(`
      INSERT INTO settings (setting_key, setting_value) 
      VALUES (?, ?) 
      ON DUPLICATE KEY UPDATE setting_value = ?
    `, [key, value, value]);
    return true;
  } else {
    const db = readJSONDB();
    if (!db.settings) {
      db.settings = [];
    }
    const idx = db.settings.findIndex((s: any) => s.setting_key === key);
    if (idx >= 0) {
      db.settings[idx].setting_value = value;
    } else {
      db.settings.push({ setting_key: key, setting_value: value });
    }
    writeJSONDB(db);
    return true;
  }
}
