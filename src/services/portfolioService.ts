import { PortfolioItem, AppsScriptConfig, PortfolioCategory, User } from '../types';

const STORAGE_KEY = 'school_portfolio_items';
const CONFIG_KEY = 'apps_script_config';
const USER_SESSION_KEY = 'school_portfolio_user_session';

// --- AUTHENTICATION & SESSIONS ---

export const getSessionUser = (): User | null => {
  const stored = localStorage.getItem(USER_SESSION_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      // Ignored
    }
  }
  return null;
};

export const saveSessionUser = (user: User) => {
  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
};

export const clearSessionUser = () => {
  localStorage.removeItem(USER_SESSION_KEY);
};

// Log in via API (falls back to local auth check if API is unavailable)
export const loginUser = async (username: string, password: string): Promise<User> => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (response.ok) {
      const result = await response.json();
      if (result.status === 'success') {
        saveSessionUser(result.user);
        return result.user;
      }
    }
    
    const errResult = await response.json().catch(() => ({ message: 'การเชื่อมต่อขัดข้อง' }));
    throw new Error(errResult.message || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
  } catch (error: any) {
    console.warn('API login failed, checking local storage users fallback...', error.message);
    
    // Fallback: local auth simulation
    const localUsers = getLocalUsers();
    const matched = localUsers.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (matched) {
      const { password: _, ...user } = matched;
      saveSessionUser(user);
      return user;
    }

    throw new Error(error.message || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
  }
};

// --- USER MANAGEMENT (ADMIN ONLY) ---

export const apiGetUsers = async (): Promise<any[]> => {
  try {
    const res = await fetch('/api/auth/users');
    if (res.ok) {
      const result = await res.json();
      if (result.status === 'success') {
        return result.users;
      }
    }
    throw new Error('เรียกรายชื่อไม่สำเร็จ');
  } catch (err) {
    console.warn('API getUsers failed, loading from local instead.', err);
    return getLocalUsers().map(({ password, ...u }) => u);
  }
};

export const apiAddUser = async (userData: any): Promise<any> => {
  try {
    const res = await fetch('/api/auth/add-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    if (res.ok) {
      const result = await res.json();
      if (result.status === 'success') {
        return result.user;
      }
    }
    const errRes = await res.json().catch(() => ({ message: 'ลงทะเบียนผู้ใช้งานล้มเหลว' }));
    throw new Error(errRes.message || 'ลงทะเบียนไม่สำเร็จ');
  } catch (err: any) {
    console.warn('API addUser failed, saving to local instead.', err);
    const local = getLocalUsers();
    if (local.some(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
      throw new Error('ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว');
    }

    const newUser = {
      id: 'local-user-' + Date.now(),
      ...userData
    };
    local.push(newUser);
    saveLocalUsers(local);
    const { password, ...safe } = newUser;
    return safe;
  }
};

export const apiDeleteUser = async (id: string): Promise<boolean> => {
  try {
    const res = await fetch(`/api/auth/users/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const result = await res.json();
      return result.status === 'success';
    }
    return false;
  } catch (err) {
    console.warn('API deleteUser failed, removing from local.', err);
    const local = getLocalUsers();
    const filtered = local.filter(u => u.id !== id);
    saveLocalUsers(filtered);
    return true;
  }
};

// --- DATABASE STATUS & SETUP CONFIGURATION ---

export const apiGetDBStatus = async () => {
  try {
    const res = await fetch('/api/db/status');
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Unable to connect to database status api');
  } catch (err: any) {
    return {
      isUsingMySQL: false,
      message: 'ทำงานในโหมด Client LocalStorage (เนื่องจากเชื่อมต่อเซิร์ฟเวอร์ไม่ได้)',
      config: { host: 'localhost (จำลอง)', database: 'school_portfolio', user: 'root' }
    };
  }
};

export const apiSetupDB = async (config: any) => {
  try {
    const res = await fetch('/api/db/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error('ตั้งค่าไม่สำเร็จ');
  } catch (err: any) {
    throw new Error(err.message || 'ตั้งค่าไม่สำเร็จ');
  }
};

// --- SCHOOL BRANDING SETTINGS ---

export const apiGetSettings = async (): Promise<{ school_name: string; school_logo: string }> => {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const result = await res.json();
      if (result.status === 'success') {
        return result.settings;
      }
    }
    throw new Error('โหลดการตั้งค่าไม่สำเร็จ');
  } catch (err) {
    console.warn('API apiGetSettings failed, loading from local instead.', err);
    const name = localStorage.getItem('school_name') || 'โรงเรียนบ้านหนองหว้า';
    const logo = localStorage.getItem('school_logo') || '';
    return { school_name: name, school_logo: logo };
  }
};

export const apiSaveSettings = async (settings: { school_name?: string; school_logo?: string }): Promise<boolean> => {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (res.ok) {
      const result = await res.json();
      if (settings.school_name !== undefined) {
        localStorage.setItem('school_name', settings.school_name);
      }
      if (settings.school_logo !== undefined) {
        localStorage.setItem('school_logo', settings.school_logo);
      }
      return result.status === 'success';
    }
    throw new Error('บันทึกการตั้งค่าล้มเหลว');
  } catch (err) {
    console.warn('API apiSaveSettings failed, saving locally instead.', err);
    if (settings.school_name !== undefined) {
      localStorage.setItem('school_name', settings.school_name);
    }
    if (settings.school_logo !== undefined) {
      localStorage.setItem('school_logo', settings.school_logo);
    }
    return true;
  }
};

// --- CORE PORTFOLIO API METHODS ---

export const getItems = async (): Promise<PortfolioItem[]> => {
  try {
    const response = await fetch('/api/portfolios');
    if (response.ok) {
      const result = await response.json();
      if (result.status === 'success') {
        return result.data as PortfolioItem[];
      }
    }
  } catch (error) {
    console.warn('API fetch error, falling back to local storage:', error);
  }

  // Local Storage Fallback
  const localItems = localStorage.getItem(STORAGE_KEY);
  if (localItems) {
    try {
      return JSON.parse(localItems);
    } catch (e) {
      // Ignored
    }
  }
  
  // Save initial if empty
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PORTFOLIOS));
  return INITIAL_PORTFOLIOS;
};

export const saveItem = async (item: Partial<PortfolioItem> & { category: PortfolioCategory }): Promise<PortfolioItem> => {
  try {
    const response = await fetch('/api/portfolios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.status === 'success') {
        return result.data as PortfolioItem;
      }
    }
  } catch (error) {
    console.warn('API save error, falling back to local storage saving:', error);
  }

  // Local Storage Implementation
  const items = await getItems();
  const index = items.findIndex(i => i.id === item.id);
  
  const savedItem: PortfolioItem = {
    id: item.id || 'local-' + Date.now().toString(),
    category: item.category,
    type: item.type || '',
    title: item.title || '',
    description: item.description || '',
    academicYear: item.academicYear || '2568',
    awardDate: item.awardDate || new Date().toISOString().split('T')[0],
    giver: item.giver || '',
    rewardLevel: item.rewardLevel || 'โรงเรียน',
    ownerName: item.ownerName || '',
    position: item.position || '',
    department: item.department || '',
    studentClass: item.studentClass || '',
    responsiblePerson: item.responsiblePerson || '',
    attachments: item.attachments || [],
    approved: item.approved ?? false,
    createdAt: item.createdAt || new Date().toISOString()
  };

  if (index >= 0) {
    items[index] = savedItem;
  } else {
    items.unshift(savedItem);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return savedItem;
};

export const deleteItem = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/portfolios/${id}`, { method: 'DELETE' });
    if (response.ok) {
      const result = await response.json();
      return result.status === 'success';
    }
  } catch (error) {
    console.warn('API delete error, deleting locally:', error);
  }

  // Local Storage Implementation
  const items = await getItems();
  const filtered = items.filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
};

export const approveItem = async (id: string, approved: boolean): Promise<boolean> => {
  try {
    const response = await fetch(`/api/portfolios/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved })
    });
    if (response.ok) {
      const result = await response.json();
      return result.status === 'success';
    }
  } catch (error) {
    console.warn('API approve error, setting locally:', error);
  }

  // Local Storage Implementation
  const items = await getItems();
  const index = items.findIndex(i => i.id === id);
  if (index >= 0) {
    items[index].approved = approved;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  }
  return false;
};

// File Upload Proxy (converts file to Base64 data URLs)
export const uploadFile = async (
  category: PortfolioCategory,
  file: File
): Promise<{ id: string; name: string; type: string; url: string }> => {
  const toBase64 = (f: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(f);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const base64Data = await toBase64(file);

  return {
    id: 'file-' + Date.now().toString() + '-' + Math.random().toString(36).substr(2, 5),
    name: file.name,
    type: file.type,
    url: base64Data
  };
};

// --- DEPRECATED/UNUSED COMPATIBILITY FOR APPS SCRIPT ---
export const getAppsScriptConfig = (): AppsScriptConfig => {
  const stored = localStorage.getItem(CONFIG_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      // Ignored
    }
  }
  return { webAppUrl: '', isConnected: false };
};

export const saveAppsScriptConfig = (config: AppsScriptConfig) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

export const backupLocalData = (): string => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data || JSON.stringify(INITIAL_PORTFOLIOS);
};

export const restoreLocalData = (jsonStr: string): boolean => {
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      localStorage.setItem(STORAGE_KEY, jsonStr);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

// --- INTERNAL HELPERS ---
const USER_LIST_KEY = 'school_portfolio_local_users';
const getLocalUsers = (): any[] => {
  const stored = localStorage.getItem(USER_LIST_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }
  return [
    {
      id: 'user-admin',
      username: 'admin',
      password: 'admin1234',
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
  ];
};

const saveLocalUsers = (users: any[]) => {
  localStorage.setItem(USER_LIST_KEY, JSON.stringify(users));
};

const INITIAL_PORTFOLIOS: PortfolioItem[] = [
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
  }
];
