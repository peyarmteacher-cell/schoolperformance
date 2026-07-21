import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { 
  initDatabase, 
  getDBStatus, 
  saveDBConfig, 
  authenticateUser, 
  addUser, 
  queryUsers, 
  deleteUser, 
  queryPortfolios, 
  savePortfolio, 
  deletePortfolio, 
  setApprovalPortfolio,
  MySQLConfig,
  querySettings,
  saveSetting
} from './server/db';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and URL parsing middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Initialize Database on boot
  await initDatabase();

  // --- API ROUTES ---

  // 1. Database status & setup
  app.get('/api/db/status', (req, res) => {
    res.json(getDBStatus());
  });

  app.post('/api/db/setup', async (req, res) => {
    try {
      const config: MySQLConfig = req.body;
      saveDBConfig(config);
      // Re-initialize connection
      await initDatabase();
      res.json({ status: 'success', ...getDBStatus() });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // 1b. School Settings Management
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await querySettings();
      res.json({ status: 'success', settings });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const { school_name, school_logo } = req.body;
      if (school_name !== undefined) {
        await saveSetting('school_name', school_name);
      }
      if (school_logo !== undefined) {
        await saveSetting('school_logo', school_logo);
      }
      res.json({ status: 'success', message: 'บันทึกการตั้งค่าสำเร็จ' });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // 2. Authentication
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ status: 'error', message: 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน' });
      }

      const user = await authenticateUser(username, password);
      if (user) {
        res.json({ status: 'success', user });
      } else {
        res.status(401).json({ status: 'error', message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
      }
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // 3. User Management
  app.get('/api/auth/users', async (req, res) => {
    try {
      const users = await queryUsers();
      res.json({ status: 'success', users });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  app.post('/api/auth/add-user', async (req, res) => {
    try {
      const { username, password, name, email, role, avatarUrl } = req.body;
      if (!username || !password || !name || !role) {
        return res.status(400).json({ status: 'error', message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
      }

      const newUser = {
        id: 'user-' + Date.now().toString(),
        username,
        password,
        name,
        email,
        role,
        avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
      };

      const safeUser = await addUser(newUser);
      res.json({ status: 'success', user: safeUser });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  });

  app.delete('/api/auth/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const ok = await deleteUser(id);
      res.json({ status: 'success', ok });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // 4. Portfolio Management
  app.get('/api/portfolios', async (req, res) => {
    try {
      const { category, academicYear } = req.query;
      const items = await queryPortfolios({
        category: category as string,
        academicYear: academicYear as string
      });
      res.json({ status: 'success', data: items });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  app.post('/api/portfolios', async (req, res) => {
    try {
      const portfolio = req.body;
      const saved = await savePortfolio(portfolio);
      res.json({ status: 'success', data: saved });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  app.delete('/api/portfolios/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const ok = await deletePortfolio(id);
      res.json({ status: 'success', ok });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  app.post('/api/portfolios/:id/approve', async (req, res) => {
    try {
      const { id } = req.params;
      const { approved } = req.body;
      const ok = await setApprovalPortfolio(id, approved);
      res.json({ status: 'success', ok });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // --- VITE INTERFACING ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FULL-STACK PORTFOLIO ENGINE] running at http://localhost:${PORT}`);
  });
}

startServer();
