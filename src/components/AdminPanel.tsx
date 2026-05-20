/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Branch, 
  Service, 
  Booking, 
  Promotion, 
  Review, 
  AppConfig 
} from '../types';
import { 
  LayoutDashboard, 
  Calendar, 
  Wrench, 
  MapPin, 
  Tag, 
  MessageSquare, 
  Settings as SettingsIcon, 
  Download, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  LogOut, 
  Lock, 
  CircleDot, 
  ChevronRight,
  TrendingUp,
  Inbox,
  Clock,
  CheckCircle,
  XSquare,
  AlertCircle,
  Phone
} from 'lucide-react';

interface AdminPanelProps {
  config: AppConfig;
  onConfigChange: () => void;
  onClose: () => void;
}

export default function AdminPanel({ config, onConfigChange, onClose }: AdminPanelProps) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'services' | 'branches' | 'promotions' | 'reviews' | 'settings'>('dashboard');

  // Admin database data
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Booking filtering & pagination states
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingLimit] = useState(50);
  const [bookingStatus, setBookingStatus] = useState('');
  const [bookingBranchId, setBookingBranchId] = useState('');
  const [bookingDateFrom, setBookingDateFrom] = useState('');
  const [bookingDateTo, setBookingDateTo] = useState('');
  const [bookingTotalPages, setBookingTotalPages] = useState(1);
  const [bookingTotal, setBookingTotal] = useState(0);

  // Editing structures
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [editingPromotion, setEditingPromotion] = useState<any | null>(null);
  const [editingReviewReply, setEditingReviewReply] = useState<{ id: string; text: string } | null>(null);

  // Success notifications
  const [notif, setNotif] = useState('');

  // Fetch all initial data
  useEffect(() => {
    if (token) {
      loadAdminData();
    }
  }, [token]);

  // Load Bookings with pagination and filters dynamically
  const loadFilteredBookings = async () => {
    if (!token) return;
    try {
      const authHeader = `Bearer ${token}`;
      const url = new URL('/api/admin/bookings', window.location.origin);
      url.searchParams.append('page', String(bookingPage));
      url.searchParams.append('limit', String(bookingLimit));
      if (bookingStatus) url.searchParams.append('status', bookingStatus);
      if (bookingBranchId) url.searchParams.append('branchId', bookingBranchId);
      if (bookingDateFrom) url.searchParams.append('dateFrom', bookingDateFrom);
      if (bookingDateTo) url.searchParams.append('dateTo', bookingDateTo);

      const bookRes = await fetch(url.toString(), { headers: { 'Authorization': authHeader } });
      if (bookRes.ok) {
        const d = await bookRes.json();
        if (d && typeof d === 'object' && 'data' in d) {
          setBookings(d.data || []);
          setBookingTotal(d.total || 0);
          setBookingTotalPages(d.totalPages || 1);
        } else if (Array.isArray(d)) {
          setBookings(d);
          setBookingTotal(d.length);
          setBookingTotalPages(1);
        }
      }
    } catch (err) {
      console.error('Error fetching filtered bookings:', err);
    }
  };

  // Trigger bookings reload whenever a filter or page updates
  useEffect(() => {
    if (token && activeTab === 'bookings') {
      loadFilteredBookings();
    }
  }, [bookingPage, bookingStatus, bookingBranchId, bookingDateFrom, bookingDateTo, token, activeTab]);

  const loadAdminData = async () => {
    try {
      const authHeader = `Bearer ${token}`;
      
      // Load Dashboard
      const dashRes = await fetch('/api/admin/dashboard', { headers: { 'Authorization': authHeader } });
      if (dashRes.ok) {
        const d = await dashRes.json();
        setDashboardMetrics(d);
      } else if (dashRes.status === 401) {
        handleLogout();
        return;
      }

      // Load Bookings (uses the unified loader)
      await loadFilteredBookings();

      // Load Configs from public
      const branchRes = await fetch('/api/branches');
      if (branchRes.ok) setBranches(await branchRes.json());

      const srvRes = await fetch('/api/services');
      if (srvRes.ok) setServices(await srvRes.json());

      const promoRes = await fetch('/api/promotions');
      if (promoRes.ok) setPromotions(await promoRes.json());

      // Load all reviews (unmoderated included)
      const revRes = await fetch('/api/reviews'); 
      if (revRes.ok) setReviews(await revRes.json());

    } catch (e) {
      console.error('Error fetching admin data', e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Неверный логин или пароль.');
      }
      localStorage.setItem('admin_token', data.token);
      setToken(data.token);
    } catch (err: any) {
      setLoginError(err.message || 'Ошибка подключения к серверу.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  const triggerNotification = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(''), 3000);
  };

  // CSV Bookings export trigger
  const handleExportBookings = async () => {
    try {
      const res = await fetch('/api/admin/export/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'as_auto_bookings.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        triggerNotification('Отчет о записях успешно загружен!');
      }
    } catch (e) {
      alert('Ошибка при выгрузке.');
    }
  };

  // BOOKING MODIFIERS
  const handleUpdateBooking = async (id: string, updatedFields: any) => {
    try {
      const res = await fetch(`/api/admin/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        triggerNotification('Статус записи обновлен!');
        setEditingBooking(null);
        loadAdminData();
      }
    } catch (err) {
      alert('Ошибка при изменении статуса.');
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!window.confirm('Удалить эту запись из БД?')) return;
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        triggerNotification('Запись удалена.');
        loadAdminData();
      }
    } catch (err) {
      alert('Ошибка удаления.');
    }
  };

  // SERVICES CRUD
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isNew = !editingService?.id;
      const url = isNew ? '/api/admin/services' : `/api/admin/services/${editingService.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingService)
      });

      if (res.ok) {
        triggerNotification(isNew ? 'Услуга добавлена в каталог!' : 'Услуга отредактирована.');
        setEditingService(null);
        loadAdminData();
      }
    } catch (err) {
      alert('Ошибка сохранения услуги.');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Вы действительно хотите удалить эту услугу из прайс-листа?')) return;
    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        triggerNotification('Услуга удалена.');
        loadAdminData();
      }
    } catch (err) {
      alert('Ошибка удаления услуги.');
    }
  };

  // BRANCHES CRUD
  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isNew = !editingBranch?.id;
      const url = isNew ? '/api/admin/branches' : `/api/admin/branches/${editingBranch.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingBranch)
      });

      if (res.ok) {
        triggerNotification(isNew ? 'Филиал сохранен!' : 'Филиал обновлен.');
        setEditingBranch(null);
        loadAdminData();
      }
    } catch (err) {
      alert('Не удалось сохранить филиал.');
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!window.confirm('Вы действительно хотите прекратить обслуживание на этом филиале?')) return;
    try {
      const res = await fetch(`/api/admin/branches/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        triggerNotification('Филиал удален.');
        loadAdminData();
      }
    } catch (err) {
      alert('Ошибка закрытия филиала.');
    }
  };

  // PROMOTIONS CRUD
  const handleSavePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isNew = !editingPromotion?.id;
      const url = isNew ? '/api/admin/promotions' : `/api/admin/promotions/${editingPromotion.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingPromotion)
      });

      if (res.ok) {
        triggerNotification('Акция сохранена!');
        setEditingPromotion(null);
        loadAdminData();
      }
    } catch (err) {
      alert('Сбой добавления промокода.');
    }
  };

  const handleDeletePromotion = async (id: string) => {
    if (!window.confirm('Остановить эту акцию?')) return;
    try {
      const res = await fetch(`/api/admin/promotions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        triggerNotification('Акция удалена.');
        loadAdminData();
      }
    } catch (err) {
      alert('Ошибка.');
    }
  };

  // ADMIN SYSTEM GENERAL BRANDING SETTINGS
  const [settingsName, setSettingsName] = useState(config.companyName);
  const [settingsPhone, setSettingsPhone] = useState(config.phone);
  const [settingsEmail, setSettingsEmail] = useState(config.email);
  const [settingsColors, setSettingsColors] = useState({
    primary: config.primaryColor,
    accent: config.accentColor,
    bg: config.bgColor
  });
  const [settingsBilling, setSettingsBilling] = useState(config.billingProvider);

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyName: settingsName,
          phone: settingsPhone,
          email: settingsEmail,
          primaryColor: settingsColors.primary,
          accentColor: settingsColors.accent,
          bgColor: settingsColors.bg,
          billingProvider: settingsBilling
        })
      });

      if (res.ok) {
        triggerNotification('Глобальные настройки обновлены! Цвета применены к сайту.');
        onConfigChange();
      }
    } catch (err) {
      alert('Сбой сохранения глобальных настроек.');
    }
  };

  const getStatusCardStyle = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'confirmed': return 'bg-emerald-55/10 border-emerald-200 text-emerald-800';
      case 'in_progress': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'completed': return 'bg-slate-50 border-slate-200 text-slate-800';
      case 'cancelled': return 'bg-rose-50 border-rose-250 text-rose-800';
      default: return 'bg-slate-50 border-slate-100 text-slate-600';
    }
  };

  // Render Admin Login Screen if not authenticated
  if (!token) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 z-50">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-950 p-6 text-white text-center">
            <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">Авторизация Администратора</h3>
            <p className="text-xs text-slate-400 mt-1">Центральный пульт управления АС-Авто</p>
          </div>

          <form onSubmit={handleLogin} className="p-6 md:p-8 space-y-4">
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" /> {loginError}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Имя пользователя (Логин)</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Пароль суперадминистратора</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 flex-1 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 text-xs font-bold"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="p-2.5 flex-1 bg-slate-950 hover:bg-slate-850 text-orange-400 font-bold text-xs rounded-xl transition-all shadow-md"
              >
                Войти в панель
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-100 flex flex-col z-50">
      
      {/* Top action header info */}
      <header className="bg-slate-950 text-white p-4.5 px-6 flex justify-between items-center border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-lg text-sm text-white font-bold leading-none">АС</div>
          <div>
            <h2 className="font-extrabold text-base leading-none text-slate-100">{config.companyName || 'АС-Авто'}</h2>
            <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mt-0.5 block">ПУЛЬТ АДМИНИСТРАТОРОВ</span>
          </div>
        </div>

        {notif && (
          <div className="bg-emerald-600 text-white p-1.5 px-4 text-xs font-bold rounded-full animate-bounce">
            {notif}
          </div>
        )}

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-xs text-slate-400">Владелец: <strong>{username || 'Суперадмин'}</strong> (Роль: admin)</span>
          <button 
            type="button" 
            onClick={handleLogout}
            className="p-1 px-3 bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-705 rounded text-xs font-bold text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Выйти
          </button>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold text-lg p-1 px-2.5"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Grid workspace panel area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 overflow-hidden">
        
        {/* Navigation Sidebar controller */}
        <aside className="bg-slate-900 border-r border-slate-805 text-slate-300 md:col-span-1 p-4 flex flex-col justify-between">
          <nav className="space-y-1.5">
            {[
              { id: 'dashboard', label: 'Дашборд систем', icon: LayoutDashboard },
              { id: 'bookings', label: 'Очередь Записей', icon: Calendar },
              { id: 'services', label: 'Прейскурант услуг', icon: Wrench },
              { id: 'branches', label: 'Филиалы сети', icon: MapPin },
              { id: 'promotions', label: 'Акции и коды', icon: Tag },
              { id: 'reviews', label: 'Отзывы клиентов', icon: MessageSquare },
              { id: 'settings', label: 'Брендинг / Оплаты', icon: SettingsIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full p-2.5 px-3.5 rounded-lg text-xs font-bold text-left flex items-center gap-3 transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-orange-600 text-white shadow-md' 
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" /> {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="p-2 border-t border-slate-800 pt-4 text-[10px] text-slate-500 font-mono space-y-1">
            <p>Бэкенд: Node Express</p>
            <p>База: Local DB JSON</p>
            <p>Таймштамп: 2026-05</p>
          </div>
        </aside>

        {/* View content pane */}
        <main className="md:col-span-4 p-6 overflow-y-auto bg-slate-50 flex flex-col justify-between">
          
          {/* TAB 1: DASHBOARD DETAILED VIEWS */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in text-slate-800">
              
              {/* Stat figures metric widgets */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Общая Выручка (оплаты)', val: `${dashboardMetrics?.metrics?.totalRevenue || 0} ₽`, desc: 'Оплаченные заказы', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-100' },
                  { label: 'Всего Записей', val: dashboardMetrics?.metrics?.totalBookingsCount || 0, desc: 'За всю историю', icon: Calendar, color: 'text-blue-600 bg-blue-100' },
                  { label: 'Ожидает одобрения', val: dashboardMetrics?.metrics?.pendingCount || 0, desc: 'Статус pending', icon: Clock, color: 'text-amber-600 bg-amber-100' },
                  { label: 'Конверсия воронок', val: `${dashboardMetrics?.metrics?.conversionRate || 85}%`, desc: 'Успешные визиты', icon: CheckCircle, color: 'text-purple-650 bg-purple-100 animate-pulse' }
                ].map((m, idx) => {
                  const Icon = m.icon;
                  return (
                    <div key={idx} className="bg-white p-4.5 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">{m.label}</span>
                        <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{m.val}</h3>
                        <span className="text-[10px] text-slate-400 font-medium block">{m.desc}</span>
                      </div>
                      <div className={`p-3 rounded-xl ${m.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic SVG Revenue Graph & analytics data columns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* SVG Revenue Charts Vector drawing */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 lg:col-span-2 shadow-sm">
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 font-mono">Тренд выручки по дням (SVG Векторный график)</h4>
                  
                  <div className="h-[200px] w-full border-b border-l border-slate-100 relative pt-4 pr-4">
                    {/* Graph Vector renders dynamically */}
                    {dashboardMetrics?.charts?.revenue && dashboardMetrics.charts.revenue.length > 0 ? (
                      <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {/* Area shading */}
                        <path
                          d={`M 0,200 ${dashboardMetrics.charts.revenue.map((r: any, i: number) => {
                            const x = (i / (dashboardMetrics.charts.revenue.length - 1)) * 500;
                            const maxVal = Math.max(...dashboardMetrics.charts.revenue.map((rv: any) => rv.amount), 5000);
                            const y = 200 - (r.amount / maxVal) * 160 - 20;
                            return `L ${x},${y}`;
                          }).join(' ')} L 500,200 Z`}
                          fill="url(#chartGrad)"
                        />
                        {/* Stroke line vector */}
                        <path
                          d={dashboardMetrics.charts.revenue.map((r: any, i: number) => {
                            const x = (i / (dashboardMetrics.charts.revenue.length - 1)) * 500;
                            const maxVal = Math.max(...dashboardMetrics.charts.revenue.map((rv: any) => rv.amount), 5000);
                            const y = 200 - (r.amount / maxVal) * 160 - 20;
                            return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke="#f97316"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">Сводные данные о выручке отсутствуют</div>
                    )}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono">
                    <span>Последние 14 суток деятельности сети</span>
                    <span>Максимум отчетов</span>
                  </div>
                </div>

                {/* Popular service tables */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 lg:col-span-1 shadow-sm">
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 block">Топ востребованных услуг прайса</h4>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {dashboardMetrics?.charts?.topServices?.map((item: any, idx: number) => (
                      <div key={idx} className="space-y-1 text-xs">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-slate-700 truncate max-w-[150px]">{item.name}</span>
                          <span className="font-mono text-slate-500 shrink-0">{item.count} заказов ({item.totalRev} ₽)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-orange-500 h-full rounded-full" style={{ width: `${Math.min(item.count * 15, 100)}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: BOOKINGS LIST QUEUE AND CRUD */}
          {activeTab === 'bookings' && (
            <div className="space-y-5 animate-fade-in text-slate-800">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-slate-800">Список броней обслуживания ({bookingTotal || bookings.length} ед.)</h3>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleExportBookings}
                    className="p-2 border border-slate-250 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Выгрузить реестр (CSV-Excel)
                  </button>
                </div>
              </div>

              {/* FILTERS TOOLBAR */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Статус записи</label>
                  <select
                    value={bookingStatus}
                    onChange={(e) => { setBookingStatus(e.target.value); setBookingPage(1); }}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                  >
                    <option value="">Все статусы</option>
                    <option value="pending">В обработке</option>
                    <option value="confirmed">Подтвержден</option>
                    <option value="in_progress">В работе</option>
                    <option value="completed">Завершен</option>
                    <option value="cancelled">Отменен</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Филиал</label>
                  <select
                    value={bookingBranchId}
                    onChange={(e) => { setBookingBranchId(e.target.value); setBookingPage(1); }}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                  >
                    <option value="">Все филиалы</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Дата с</label>
                  <input
                    type="date"
                    value={bookingDateFrom}
                    onChange={(e) => { setBookingDateFrom(e.target.value); setBookingPage(1); }}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Дата по</label>
                  <input
                    type="date"
                    value={bookingDateTo}
                    onChange={(e) => { setBookingDateTo(e.target.value); setBookingPage(1); }}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setBookingStatus('');
                      setBookingBranchId('');
                      setBookingDateFrom('');
                      setBookingDateTo('');
                      setBookingPage(1);
                    }}
                    className="w-full p-2 border border-slate-250 text-slate-500 rounded-lg text-xs hover:bg-slate-50 font-bold cursor-pointer transition-all"
                  >
                    Сбросить фильтры
                  </button>
                </div>
              </div>

              {bookings.length === 0 ? (
                <div className="p-16 text-center border border-dashed border-slate-200 rounded-2xl bg-white shadow-sm">
                  <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Очередь записей пуста.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] text-slate-400 font-extrabold tracking-wider">
                        <tr>
                          <th className="p-3">Шифр записи</th>
                          <th className="p-3">Филиал / Услуга</th>
                          <th className="p-3">Слот</th>
                          <th className="p-3">Клиент</th>
                          <th className="p-3">Автомобиль</th>
                          <th className="p-3">Расчет</th>
                          <th className="p-3">Статусы</th>
                          <th className="p-3 text-right">Действие</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bookings.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono font-bold text-slate-700">{b.id}</td>
                            <td className="p-3">
                              <p className="font-bold text-slate-850 text-wrap max-w-[150px]">{b.serviceName}</p>
                              <p className="text-[10px] text-slate-500">{b.branchName}</p>
                            </td>
                            <td className="p-3">
                              <p className="font-bold text-slate-700 leading-none">{b.date}</p>
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5 inline-block">{b.time}</span>
                            </td>
                            <td className="p-3">
                              <p className="font-semibold text-slate-800 leading-none">{b.clientName}</p>
                              <span className="text-[10px] text-slate-400 font-semibold mt-0.5 inline-block">{b.clientPhone}</span>
                            </td>
                            <td className="p-3 text-slate-550 italic font-medium">{b.carMake} {b.carModel}</td>
                            <td className="p-3 font-mono font-bold">
                              <p>{b.amount} ₽</p>
                              {b.prepaidAmount > 0 && <span className="text-[9px] text-emerald-600 block leading-tight font-sans">Внесено {b.prepaidAmount} ₽</span>}
                            </td>
                            <td className="p-3 space-y-1">
                              <span className={`p-0.5 px-2 rounded-full text-[9px] font-bold block w-fit border ${getStatusCardStyle(b.status)}`}>
                                {b.status === 'pending' ? 'В обработке' : b.status === 'confirmed' ? 'Подтвержден' : b.status === 'in_progress' ? 'В работе' : b.status === 'completed' ? 'Завершен' : 'Отменен'}
                              </span>
                              <span className={`p-0.5 px-2 rounded-full text-[9px] font-bold block w-fit border ${b.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                {b.paymentStatus === 'paid' ? 'Оплачено ✓' : 'Не оплачен'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button 
                                  type="button" 
                                  onClick={() => setEditingBooking(b)} 
                                  className="p-1 px-2 border border-slate-200 hover:bg-slate-50 text-[10px] font-bold rounded"
                                >
                                  Статус
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => handleDeleteBooking(b.id)} 
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* PAGINATION CONTROLS */}
                  <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium font-semibold">
                      Показано {bookingTotal > 0 ? (bookingPage - 1) * bookingLimit + 1 : 0} - {Math.min(bookingPage * bookingLimit, bookingTotal)} из {bookingTotal} записей
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={bookingPage <= 1}
                        onClick={() => setBookingPage(p => Math.max(1, p - 1))}
                        className={`p-1.5 px-3 rounded-lg border text-xs font-bold transition-all ${bookingPage <= 1 ? 'border-slate-200 text-slate-300 bg-white cursor-not-allowed' : 'border-slate-250 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-xs'}`}
                      >
                        Назад
                      </button>
                      <button
                        type="button"
                        disabled={bookingPage >= bookingTotalPages}
                        onClick={() => setBookingPage(p => Math.min(bookingTotalPages, p + 1))}
                        className={`p-1.5 px-3 rounded-lg border text-xs font-bold transition-all ${bookingPage >= bookingTotalPages ? 'border-slate-200 text-slate-300 bg-white cursor-not-allowed' : 'border-slate-250 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-xs'}`}
                      >
                        Вперед
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SERVICES AND PRICING DATABASE CRUD */}
          {activeTab === 'services' && (
            <div className="space-y-5 animate-fade-in text-slate-800">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-slate-800">Каталог предоставляемых услуг и прейскурантов ({services.length})</h3>
                <button
                  type="button"
                  onClick={() => setEditingService({ category: 'Диагностика', name: '', price: 1000, duration: 30, description: '', isActive: true })}
                  className="p-2 px-4.5 bg-slate-950 hover:bg-slate-850 text-orange-400 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" /> Добавить новую услугу
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((s) => (
                  <div key={s.id} className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="bg-slate-100 text-slate-600 p-0.5 px-2 rounded text-[9px] uppercase font-bold">{s.category}</span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setEditingService(s)} className="p-1 text-slate-500 hover:bg-slate-50 rounded"><Edit className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleDeleteService(s.id)} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <h4 className="font-bold text-sm text-slate-800 leading-tight">{s.name}</h4>
                      <p className="text-xs text-slate-500 mt-1.5 leading-tight">{s.description || 'Описание услуги отсутствует.'}</p>
                    </div>

                    <div className="border-t border-slate-100 pt-3.5 mt-4 flex justify-between items-center text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">Длительность</span>
                        <strong className="text-slate-700">{s.duration} мин</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">Стоимость</span>
                        <strong className="text-orange-500 text-sm">{s.price} ₽</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: BRANCHES CRUD OPERATIONS */}
          {activeTab === 'branches' && (
            <div className="space-y-5 animate-fade-in text-slate-800">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-slate-800">Список СТО и автосервисов в сети ({branches.length})</h3>
                <button
                  type="button"
                  onClick={() => setEditingBranch({ name: '', address: '', phone: '', email: '', hours: 'Пн-Вс: 09:00 - 20:00' })}
                  className="p-2 px-4 bg-slate-950 hover:bg-slate-850 text-orange-400 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Добавить филиал
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {branches.map(b => (
                  <div key={b.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                        <h4 className="font-bold text-sm text-slate-800">{b.name}</h4>
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => setEditingBranch(b)} className="p-1 text-slate-500 hover:bg-slate-50 rounded"><Edit className="w-4 h-4" /></button>
                          <button type="button" onClick={() => handleDeleteBranch(b.id)} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-550 pt-3">
                        <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400 shrink-0" /> {b.address}</p>
                        <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400 shrink-0" /> {b.phone}</p>
                        <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400 shrink-0" /> {b.hours}</p>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 font-mono mt-4">ИД гео-слоя: br_geo_vlg_1</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: ACTIVE PROMOTIONS AND DISCOUNT SCHEDULERS */}
          {activeTab === 'promotions' && (
            <div className="space-y-5 animate-fade-in text-slate-800">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-slate-800">Менеджер акций, скидок и промокодов ({promotions.length})</h3>
                <button
                  type="button"
                  onClick={() => setEditingPromotion({ title: '', description: '', discountType: 'percent', discountValue: 10, isActive: true })}
                  className="p-2 px-4 bg-slate-950 hover:bg-slate-850 text-orange-400 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Добавить акцию
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {promotions.map(p => (
                  <div key={p.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                        <h4 className="font-semibold text-sm text-slate-800 leading-tight">{p.title}</h4>
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => setEditingPromotion(p)} className="p-1 text-slate-500 hover:bg-slate-50 rounded"><Edit className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleDeletePromotion(p.id)} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed mt-3">{p.description}</p>
                    </div>

                    <div className="border-t border-slate-100 pt-3.5 mt-5 flex justify-between items-center">
                      <div className="p-1 px-3 bg-orange-100 text-orange-850 rounded text-[10px] font-mono font-bold tracking-wider">
                        КОД: {p.promoCode || 'БЕЗ КОДА'}
                      </div>
                      <span className="text-xs font-bold text-slate-700 font-mono">
                        Скидка: {p.discountType === 'percent' ? `${p.discountValue}%` : `${p.discountValue} ₽`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: CUSTOMER REVIEWS MANAGEMENT AND MODERATION */}
          {activeTab === 'reviews' && (
            <div className="space-y-5 animate-fade-in text-slate-800">
              <h3 className="font-bold text-base text-slate-800">Модерация входящих отзывов пользователей сети</h3>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-150 shadow-sm">
                {reviews.length === 0 ? (
                  <p className="p-10 text-xs italic text-slate-400 text-center">Отсутствуют опубликованные отзывы клиентов.</p>
                ) : (
                  reviews.map(r => (
                    <div key={r.id} className="p-5 space-y-3.5 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-800">{r.clientName} <span className="font-mono text-[10px] text-slate-400 font-normal ml-3">{r.date}</span></p>
                          <div className="flex gap-0.5 mt-1 text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className="text-lg leading-none">{i < r.rating ? '★' : '☆'}</span>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {!r.isApproved && (
                            <button
                              type="button"
                              onClick={async () => {
                                const auth = `Bearer ${token}`;
                                await fetch(`/api/admin/reviews/${r.id}/approve`, { method: 'PUT', headers: { 'Authorization': auth } });
                                triggerNotification('Отзыв одобрен и будет опубликован!');
                                loadAdminData();
                              }}
                              className="p-1 px-3.5 bg-emerald-600 hover:bg-emerald-700 rounded text-stone-100 font-bold text-[10px]"
                            >
                              Одобрить
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingReviewReply({ id: r.id, text: r.replyText || '' })}
                            className="p-1 px-3 border border-slate-250 rounded text-slate-600 font-semibold text-[10px] bg-white hover:bg-slate-50"
                          >
                            Ответить
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm('Принять отзыв к окончательному удалению?')) return;
                              const auth = `Bearer ${token}`;
                              await fetch(`/api/admin/reviews/${r.id}`, { method: 'DELETE', headers: { 'Authorization': auth } });
                              triggerNotification('Отзыв удален.');
                              loadAdminData();
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-slate-600 leading-relaxed font-serif text-[13px]">{r.text}</p>

                      {r.replyText && (
                        <div className="p-3 bg-slate-50 border-l-2 border-orange-500 text-slate-700 rounded-r-lg">
                          <strong className="text-slate-800 font-bold block mb-1">Ответ руководства сервиса:</strong>
                          <p className="italic">{r.replyText}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 7: ADMINISTRATIVE SYSTEM CONFIG SETTINGS AND INTERACTIVE CONTROL */}
          {activeTab === 'settings' && (
            <div className="space-y-5 animate-fade-in text-slate-800 max-w-2xl">
              <h3 className="font-bold text-base text-slate-800">Брендирование, конфигурация СТО, шлюзов и платежей</h3>

              <form onSubmit={handleSaveSystemSettings} className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Глобальная марка сети</label>
                    <input 
                      type="text" 
                      value={settingsName}
                      onChange={e => setSettingsName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Контактный телефон</label>
                    <input 
                      type="text" 
                      value={settingsPhone}
                      onChange={e => setSettingsPhone(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Email управления</label>
                    <input 
                      type="email" 
                      value={settingsEmail}
                      onChange={e => setSettingsEmail(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Выбор биллинга интернет эквайрингов</label>
                    <select
                      value={settingsBilling}
                      onChange={e => setSettingsBilling(e.target.value as any)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white cursor-pointer"
                    >
                      <option value="yookassa">ЮKassa (Интегрировано)</option>
                      <option value="tinkoff">Т-Касса (Tinkoff Acquiring)</option>
                      <option value="stripe">Stripe Checkout Gateway</option>
                      <option value="none">Касса автосервиса на месте</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Настройка цветовой гаммы дизайна</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase block mb-1">Первичный</label>
                      <input 
                        type="color" 
                        value={settingsColors.primary}
                        onChange={e => setSettingsColors({ ...settingsColors, primary: e.target.value })}
                        className="w-full h-8 cursor-pointer rounded border p-0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase block mb-1">Акцентный</label>
                      <input 
                        type="color" 
                        value={settingsColors.accent}
                        onChange={e => setSettingsColors({ ...settingsColors, accent: e.target.value })}
                        className="w-full h-8 cursor-pointer rounded border p-0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase block mb-1">Фоновый</label>
                      <input 
                        type="color" 
                        value={settingsColors.bg}
                        onChange={e => setSettingsColors({ ...settingsColors, bg: e.target.value })}
                        className="w-full h-8 cursor-pointer rounded border p-0"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5 flex justify-end">
                  <button
                    type="submit"
                    className="p-2.5 px-6 bg-slate-950 hover:bg-slate-850 text-orange-400 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-md"
                  >
                    <Save className="w-4 h-4" /> Сохранить глобально настройки сайта
                  </button>
                </div>
              </form>
            </div>
          )}

        </main>
      </div>

      {/* MODALS OVERLAYS */}

      {/* Editing Booking Modal Status details details */}
      {editingBooking && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 z-55">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden text-slate-800">
            <div className="bg-slate-950 text-white p-4.5 px-6 flex justify-between items-center border-b border-slate-800">
              <h4 className="font-bold text-sm">Панель изменения статуса {editingBooking.id}</h4>
              <button type="button" onClick={() => setEditingBooking(null)} className="text-slate-400 hover:text-white font-bold text-base leading-none">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Статус брони обслуживания</label>
                <select
                  value={editingBooking.status}
                  onChange={e => handleUpdateBooking(editingBooking.id, { status: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white cursor-pointer"
                >
                  <option value="pending">Ожидает подтверждения (pending)</option>
                  <option value="confirmed">Запись подтверждена (confirmed)</option>
                  <option value="in_progress">Автомобиль в работе у мастера (in_progress)</option>
                  <option value="completed">Услуга оказана, работы завершены (completed)</option>
                  <option value="cancelled">Заявка аннулирована (cancelled)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Статус оплаты заказа</label>
                <select
                  value={editingBooking.paymentStatus}
                  onChange={e => handleUpdateBooking(editingBooking.id, { paymentStatus: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white cursor-pointer"
                >
                  <option value="unpaid">Не оплачено наличный расчет</option>
                  <option value="paid">Оплачено по эквайрингу ЮKassa ✓</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editing Services Details CRUD Modal */}
      {editingService && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 z-55">
          <form onSubmit={handleSaveService} className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden text-slate-800">
            <div className="bg-slate-950 text-white p-4.5 px-6 flex justify-between items-center">
              <h4 className="font-bold text-sm">{editingService.id ? 'Редактировать услугу' : 'Добавить услугу в прайс'}</h4>
              <button type="button" onClick={() => setEditingService(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Категория прейскуранта</label>
                <select
                  value={editingService.category}
                  onChange={e => setEditingService({ ...editingService, category: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded text-xs bg-white"
                >
                  <option value="Диагностика">Диагностика</option>
                  <option value="ТО и замена масел">ТО и замена масел</option>
                  <option value="Ремонт ходовой">Ремонт ходовой</option>
                  <option value="Шиномонтаж">Шиномонтаж</option>
                  <option value="Двигатель">Двигатель</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Название услуги</label>
                <input 
                  type="text" 
                  value={editingService.name} 
                  onChange={e => setEditingService({ ...editingService, name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded text-xs" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Цена, Руб</label>
                  <input 
                    type="number" 
                    value={editingService.price} 
                    onChange={e => setEditingService({ ...editingService, price: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded text-xs" 
                    required 
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Длительность, мин</label>
                  <input 
                    type="number" 
                    value={editingService.duration} 
                    onChange={e => setEditingService({ ...editingService, duration: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded text-xs" 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Краткое описание работы (для клиента)</label>
                <textarea 
                  value={editingService.description || ''} 
                  onChange={e => setEditingService({ ...editingService, description: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded text-xs h-20 outline-none" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-150">
                <button type="button" onClick={() => setEditingService(null)} className="p-2 border rounded font-semibold text-slate-500">Отмена</button>
                <button type="submit" className="p-2 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">Сохранить</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Editing Branch Details CRUD Modal */}
      {editingBranch && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 z-55">
          <form onSubmit={handleSaveBranch} className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden text-slate-800 font-sans">
            <div className="bg-slate-950 text-white p-4.5 px-6 flex justify-between items-center border-b">
              <h4 className="font-bold text-sm">{editingBranch.id ? 'Редактировать точку' : 'Зарегистрировать филиал'}</h4>
              <button type="button" onClick={() => setEditingBranch(null)} className="text-slate-400 hover:text-white font-bold leading-none">✕</button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Название точки филиала</label>
                <input 
                  type="text" 
                  value={editingBranch.name} 
                  onChange={e => setEditingBranch({ ...editingBranch, name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded text-xs" 
                  required 
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Адрес физической дислокации</label>
                <input 
                  type="text" 
                  value={editingBranch.address} 
                  onChange={e => setEditingBranch({ ...editingBranch, address: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded text-xs" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Телефон автосервиса</label>
                  <input 
                    type="text" 
                    value={editingBranch.phone} 
                    onChange={e => setEditingBranch({ ...editingBranch, phone: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded text-xs" 
                    required 
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">График работы (рабочие часы)</label>
                  <input 
                    type="text" 
                    value={editingBranch.hours} 
                    onChange={e => setEditingBranch({ ...editingBranch, hours: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded text-xs" 
                    required 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setEditingBranch(null)} className="p-2 border rounded font-semibold text-slate-500">Отмена</button>
                <button type="submit" className="p-2 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">Сохранить</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Add / Edit Promotion discount codes */}
      {editingPromotion && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 z-55">
          <form onSubmit={handleSavePromotion} className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden text-slate-800">
            <div className="bg-slate-950 text-white p-4.5 px-6 flex justify-between items-center">
              <h4 className="font-bold text-sm">Спецификация Акции / Промокода</h4>
              <button type="button" onClick={() => setEditingPromotion(null)} className="text-slate-400 hover:text-white font-bold leading-none">✕</button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Заголовок промо-кампании</label>
                <input 
                  type="text" 
                  value={editingPromotion.title} 
                  onChange={e => setEditingPromotion({ ...editingPromotion, title: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded text-xs" 
                  required 
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Краткие регламенты предоставления скидки</label>
                <textarea 
                  value={editingPromotion.description} 
                  onChange={e => setEditingPromotion({ ...editingPromotion, description: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded text-xs h-16 outline-none" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Уникальный Промокод</label>
                  <input 
                    type="text" 
                    value={editingPromotion.promoCode || ''} 
                    onChange={e => setEditingPromotion({ ...editingPromotion, promoCode: e.target.value.toUpperCase() })}
                    placeholder="FIRST15"
                    className="w-full p-2 border border-slate-200 rounded text-xs font-mono" 
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Величина скидки</label>
                  <input 
                    type="number" 
                    value={editingPromotion.discountValue} 
                    onChange={e => setEditingPromotion({ ...editingPromotion, discountValue: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded text-xs" 
                    required 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setEditingPromotion(null)} className="p-2 border rounded font-semibold text-slate-500">Отмена</button>
                <button type="submit" className="p-2 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">Сохранить</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Reply to review dialog screen */}
      {editingReviewReply && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 z-55">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden text-stone-800">
            <div className="bg-slate-950 text-white p-4.5 px-6 flex justify-between items-center">
              <h4 className="font-bold text-sm">Ответ руководства СТО на отзыв</h4>
              <button type="button" onClick={() => setEditingReviewReply(null)} className="text-slate-400 hover:text-white font-bold leading-none">✕</button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Ответное сообщение руководства автосервиса</label>
                <textarea 
                  value={editingReviewReply.text}
                  onChange={e => setEditingReviewReply({ ...editingReviewReply, text: e.target.value })}
                  placeholder="Благодарим Вас за позитивный отклик, приятно слышать!"
                  className="w-full p-2.5 border border-slate-200 rounded text-xs h-28 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingReviewReply(null)} className="p-2 border rounded">Отмена</button>
                <button 
                  type="button" 
                  onClick={async () => {
                    const res = await fetch(`/api/admin/reviews/${editingReviewReply.id}/reply`, {
                      method: 'PUT',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ replyText: editingReviewReply.text })
                    });
                    if (res.ok) {
                      triggerNotification('Ответ добавлен, отзыв промодерирован!');
                      setEditingReviewReply(null);
                      loadAdminData();
                    }
                  }}
                  className="p-2 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold"
                >
                  Опубликовать ответ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
