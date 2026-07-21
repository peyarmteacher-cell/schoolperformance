import React, { useState } from 'react';
import { Shield, User as UserIcon, Link2, Link2Off, Sparkles, LogOut, LogIn, Menu, X, CheckCircle2 } from 'lucide-react';
import { User, AppsScriptConfig } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  config: AppsScriptConfig;
  onOpenConfig: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  config,
  onOpenConfig
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = currentUser
    ? [
        { id: 'dashboard', label: 'แดชบอร์ด' },
        { id: 'list', label: 'คลังผลงาน' },
        { id: 'form', label: 'บันทึกผลงานใหม่' },
        { id: 'reports', label: 'รายงาน' },
        ...(currentUser.role === 'admin' ? [{ id: 'setup', label: 'จัดการระบบหลังบ้าน & MySQL' }] : [])
      ]
    : [
        { id: 'dashboard', label: 'แดชบอร์ด' },
        { id: 'list', label: 'คลังผลงาน' },
        { id: 'reports', label: 'รายงาน' },
        { id: 'login', label: 'เข้าสู่ระบบ (Login)' }
      ];

  return (
    <header id="app-header" className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-xl sticky top-0 z-50 transition-all duration-300">
      {/* Upper bar: Logo & Title */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-4 text-center md:text-left">
            {/* Elegant SVG School Crest */}
            <div className="relative w-16 h-16 bg-white rounded-full p-1.5 shadow-md flex-shrink-0 animate-pulse-slow">
              <svg viewBox="0 0 100 100" className="w-full h-full text-blue-900">
                {/* Gold Outer Ring */}
                <circle cx="50" cy="50" r="46" fill="none" stroke="#F59E0B" strokeWidth="4" />
                {/* Blue Inner Ring */}
                <circle cx="50" cy="50" r="41" fill="#1E3A8A" />
                {/* Book / Knowledge Icon */}
                <path d="M25 65 L50 78 L75 65 L75 35 L50 48 L25 35 Z" fill="#F59E0B" opacity="0.9" />
                {/* Torch / Flame */}
                <path d="M50 20 C45 30 55 35 50 45 C48 35 46 30 50 20 Z" fill="#EF4444" />
                <path d="M50 25 C48 30 52 32 50 38 C49 32 48 30 50 25 Z" fill="#F59E0B" />
                {/* Star Accent */}
                <polygon points="50,11 53,16 58,16 54,19 56,24 50,21 44,24 46,19 42,16 47,16" fill="#F59E0B" />
              </svg>
              <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-0.5 text-blue-950 border border-white">
                <Sparkles size={12} className="fill-current" />
              </div>
            </div>

            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-white">
                ระบบคลังผลงานและหลักฐานเชิงประจักษ์
              </h1>
              <div className="flex items-center gap-2 mt-0.5 justify-center md:justify-start">
                <span className="text-xs font-semibold bg-amber-500 text-blue-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  โรงเรียนบ้านหนองหว้า
                </span>
                <span className="text-xs text-blue-200 hidden sm:inline">
                  | เพื่อการประกันคุณภาพและการประเมินสถานศึกษา
                </span>
              </div>
            </div>
          </div>

          {/* User Profile & Database Connection status */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* GAS Connection Status Button */}
            <button
              onClick={onOpenConfig}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                config.isConnected
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
              }`}
              title={config.isConnected ? 'เชื่อมต่อ Google Sheets แล้ว' : 'ทำงานในโหมดออฟไลน์ (Local)'}
            >
              {config.isConnected ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald-400 animate-bounce" />
                  <span>Google Sheets Link</span>
                </>
              ) : (
                <>
                  <Link2Off size={13} className="text-amber-400" />
                  <span>MySQL / Local DB Active</span>
                </>
              )}
            </button>

            {/* User Profile Switcher */}
            {currentUser ? (
              <div className="flex items-center bg-blue-950/60 border border-blue-700/50 rounded-xl p-1.5 pl-3 gap-3 shadow-inner">
                <div className="text-right">
                  <p className="text-xs font-semibold text-white truncate max-w-[130px]">{currentUser.name}</p>
                  <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    currentUser.role === 'admin' 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {currentUser.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'คุณครู (Teacher)'}
                  </span>
                </div>
                <button 
                  onClick={onLogout}
                  className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                  title="ออกจากระบบ"
                >
                  <LogOut size={14} />
                </button>
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover border border-amber-400" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center border border-amber-400 text-xs font-bold">
                    {currentUser.name.charAt(0)}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('login')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-blue-950 font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.98]"
              >
                <LogIn size={14} />
                <span>เข้าสู่ระบบครู / แอดมิน</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-blue-950/40 border-t border-blue-800/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            {/* Desktop Menu */}
            <nav className="hidden md:flex space-x-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === item.id
                      ? 'bg-amber-500 text-blue-950 shadow-md font-semibold'
                      : 'text-blue-100 hover:text-white hover:bg-blue-800/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden w-full justify-between items-center py-2">
              <span className="text-xs font-semibold text-blue-200">เมนูการใช้งาน:</span>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg bg-blue-900 text-blue-200 hover:text-white hover:bg-blue-800 transition-colors"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-blue-950 border-t border-blue-800 px-4 py-2 space-y-1 shadow-inner animate-fade-in">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-amber-500 text-blue-950 font-semibold'
                  : 'text-blue-100 hover:bg-blue-900/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
