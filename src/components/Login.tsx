import React, { useState } from 'react';
import { LogIn, Shield, User as UserIcon, Lock, Key, AlertCircle, HelpCircle, ArrowRight, Sparkles } from 'lucide-react';
import { loginUser } from '../services/portfolioService';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  onFailure: (msg: string) => void;
}

export default function Login({ onLoginSuccess, onFailure }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน');
      return;
    }

    setIsLoggingIn(true);
    setErrorMsg('');
    try {
      const user = await loginUser(username.trim(), password);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err.message || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
      onFailure(err.message || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 max-w-md w-full overflow-hidden flex flex-col animate-fade-in">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 p-8 text-white text-center space-y-3 relative">
          <div className="absolute top-4 right-4 bg-amber-500 rounded-full p-1 text-blue-950 border border-white animate-pulse">
            <Sparkles size={14} className="fill-current" />
          </div>
          
          {/* Logo */}
          <div className="w-16 h-16 bg-white rounded-full p-1.5 shadow-md mx-auto flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full text-blue-900">
              <circle cx="50" cy="50" r="46" fill="none" stroke="#F59E0B" strokeWidth="4" />
              <circle cx="50" cy="50" r="41" fill="#1E3A8A" />
              <path d="M25 65 L50 78 L75 65 L75 35 L50 48 L25 35 Z" fill="#F59E0B" opacity="0.9" />
              <path d="M50 20 C45 30 55 35 50 45 C48 35 46 30 50 20 Z" fill="#EF4444" />
            </svg>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-amber-400">เข้าสู่ระบบสารสนเทศประกันคุณภาพ</h2>
            <p className="text-xs text-blue-200">โรงเรียนบ้านหนองหว้า (Baan Nong Wa School)</p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 md:p-8 space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs flex items-start gap-2 animate-fade-in text-left leading-normal">
                <AlertCircle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            {/* Username Input */}
            <div className="space-y-1 text-left">
              <label className="block text-xs font-bold text-gray-700">ชื่อผู้ใช้งาน (Username)</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <UserIcon size={16} />
                </div>
                <input
                  type="text"
                  placeholder="เช่น admin หรือ teacher1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1 text-left">
              <label className="block text-xs font-bold text-gray-700">รหัสผ่าน (Password)</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  placeholder="ป้อนรหัสผ่านของคุณ"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-amber-400 rounded-full animate-spin"></div>
                  <span>กำลังตรวจสอบสิทธิ์...</span>
                </>
              ) : (
                <>
                  <LogIn size={15} />
                  <span>ตรวจสอบสิทธิ์และเข้าใช้งาน</span>
                </>
              )}
            </button>
          </form>

          {/* Quick simulation helper credentials */}
          <div className="border-t border-gray-150 pt-5 text-left space-y-3">
            <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Key size={14} className="text-amber-500" />
              <span>บัญชีทดลองระบบสำหรับโรงเรียนบ้านหนองหว้า</span>
            </h4>
            
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              
              {/* Teacher presets */}
              <button
                onClick={() => handleQuickLogin('teacher1', 'teacher1234')}
                className="p-2.5 bg-amber-50/60 hover:bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-left transition-all group"
              >
                <span className="font-bold block flex items-center gap-1">
                  <UserIcon size={11} />
                  <span>ผู้ใช้ทั่วไป (คุณครู)</span>
                </span>
                <span className="text-gray-500 mt-1 block">User: <code className="font-bold text-amber-800">teacher1</code></span>
                <span className="text-gray-500 block">Pass: <code className="font-bold text-amber-800">teacher1234</code></span>
                <span className="text-blue-900 font-semibold mt-1.5 flex items-center gap-0.5 justify-end">
                  <span>กดป้อนด่วน</span>
                  <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>

              {/* Admin presets */}
              <button
                onClick={() => handleQuickLogin('admin', 'admin1234')}
                className="p-2.5 bg-rose-50/60 hover:bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-left transition-all group"
              >
                <span className="font-bold block flex items-center gap-1">
                  <Shield size={11} />
                  <span>ผู้ดูแลระบบ (Admin)</span>
                </span>
                <span className="text-gray-500 mt-1 block">User: <code className="font-bold text-rose-800">admin</code></span>
                <span className="text-gray-500 block">Pass: <code className="font-bold text-rose-800">admin1234</code></span>
                <span className="text-blue-900 font-semibold mt-1.5 flex items-center gap-0.5 justify-end">
                  <span>กดป้อนด่วน</span>
                  <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>

            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-150 text-[10px] text-gray-500 leading-relaxed flex items-start gap-1.5">
              <HelpCircle size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <p>
                <strong>คุณครูไอทีสามารถเพิ่มผู้ใช้งาน (คุณครู)</strong> และตั้งค่าเชื่อมต่อฐานข้อมูล MySQL ในหน้าตั้งค่าแอดมิน เพื่อความเสถียรและความปลอดภัยสูงสุดในการจัดเก็บสารสนเทศ
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
