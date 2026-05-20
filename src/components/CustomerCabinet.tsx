/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Wrench, 
  MapPin, 
  Car, 
  Printer, 
  CheckCircle, 
  AlertCircle,
  XOctagon,
  Loader2,
  Lock,
  Mail,
  User,
  Phone,
  LogOut,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface CustomerCabinetProps {
  onClose: () => void;
}

interface CustomerProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  createdAt: string;
}

export default function CustomerCabinet({ onClose }: CustomerCabinetProps) {
  // Authentication states
  const [token, setToken] = useState<string | null>(localStorage.getItem('customer_jwt'));
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  
  // Tabs for non-authenticated view: 'login' | 'register'
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Input fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  
  // Status and data loads
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);

  // Check token and fetch user details on load
  useEffect(() => {
    if (token) {
      fetchCustomerDetails(token);
    }
  }, [token]);

  const fetchCustomerDetails = async (jwtToken: string) => {
    setLoading(true);
    setError('');
    try {
      const profileRes = await fetch('/api/customer/me', {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      
      if (!profileRes.ok) {
        throw new Error('Не удалось загрузить сессию. Пожалуйста, войдите заново.');
      }
      
      const profileData = await profileRes.json();
      setProfile(profileData);

      // Successfully authenticated profile, now load their associated auto service bookings
      const bookingsRes = await fetch('/api/customer/bookings', {
        headers: { 'Authorization': `Bearer ${jwtToken}` }
      });
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData || []);
      }
    } catch (err: any) {
      handleLogout();
      setError(err.message || 'Ошибка авторизации.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Пожалуйста, введите ваш Email и пароль.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/auth/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка входа. Проверьте правильность введенных данных.');
      }
      
      localStorage.setItem('customer_jwt', data.token);
      setToken(data.token);
      setSuccessMsg('Вы успешно авторизовались!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !phoneInput) {
      setError('Пожалуйста, заполните все обязательные поля формы.');
      return;
    }
    if (password.length < 5) {
      setError('Пароль должен состоять минимум из 5 символов.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/auth/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phone: phoneInput
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось завершить регистрацию.');
      }

      localStorage.setItem('customer_jwt', data.token);
      setToken(data.token);
      setSuccessMsg('Регистрация прошла успешно!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_jwt');
    setToken(null);
    setProfile(null);
    setBookings([]);
    setError('');
    setSuccessMsg('');
    setEmail('');
    setPassword('');
    setFullName('');
    setPhoneInput('');
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Вы действительно хотите отменить вашу запись?')) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || 'Не удалось отменить запись.');
      } else {
        alert('Запись успешно отменена!');
        // Update local status representation inside views
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
      }
    } catch (err) {
      alert('Ошибка при выполнении операции.');
    }
  };

  const getStatusLabelAndStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Ожидает одобрения', style: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'confirmed':
        return { label: 'Запись подтверждена', style: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'in_progress':
        return { label: 'В работе у мастера', style: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'completed':
        return { label: 'Работы завершены', style: 'bg-slate-100 text-slate-800 border-slate-200' };
      case 'cancelled':
        return { label: 'Заявка отменена', style: 'bg-rose-100 text-rose-800 border-rose-200' };
      default:
        return { label: 'В обработке', style: 'bg-slate-100 text-slate-600' };
    }
  };

  const isCancelable = (dateStr: string, timeStr: string) => {
    try {
      const bookingTime = new Date(`${dateStr}T${timeStr}:00`);
      const now = new Date();
      const diffHrs = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffHrs >= 24;
    } catch (e) {
      return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 z-50 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-4 border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Banner header */}
        <div className="bg-slate-950 p-6 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
          <div>
            <h3 className="font-extrabold text-xl tracking-tight flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-orange-500" />
              Личный кабинет клиента
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {profile ? `Добро пожаловать в СТО, ${profile.fullName}` : 'Авторизация для просмотра записей, акций и контроля за ремонтом'}
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-200 text-sm font-bold w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Container Content */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs flex items-start gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-semibold">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-start gap-2.5 shadow-sm">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-semibold">{successMsg}</div>
            </div>
          )}

          {/* 1. NOT AUTHENTICATED: Show login/register tabs */}
          {!profile && !loading && (
            <div className="space-y-6">
              {/* Form switch tabs switcher */}
              <div className="flex border-b border-slate-100 p-0.5 bg-slate-50 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); setError(''); }}
                  className={`flex-1 py-3 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'login' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Вход в профиль
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('register'); setError(''); }}
                  className={`flex-1 py-3 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'register' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Регистрация (Новый клиент)
                </button>
              </div>

              {/* Login Form content */}
              {activeTab === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Ваша Почта (Email) *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input 
                        type="email" 
                        required
                        placeholder="client@example.com" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full p-3.5 pl-10 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none hover:border-slate-300 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Пароль *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input 
                        type="password" 
                        required
                        placeholder="••••••••" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full p-3.5 pl-10 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none hover:border-slate-300 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full p-3.5 mt-3 rounded-xl bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.99] transition-all"
                  >
                    Войти в кабинет <ChevronRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* Registration Form content */
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Ваше ФИО *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                        <User className="w-4 h-4" />
                      </span>
                      <input 
                        type="text" 
                        required
                        placeholder="Иванов Иван Иванович" 
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        className="w-full p-3.5 pl-10 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none hover:border-slate-300 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Номер телефона *</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                          <Phone className="w-4 h-4" />
                        </span>
                        <input 
                          type="tel" 
                          required
                          placeholder="+7 (999) 000-00-00" 
                          value={phoneInput}
                          onChange={e => setPhoneInput(e.target.value)}
                          className="w-full p-3.5 pl-10 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none hover:border-slate-300 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Почта (Email) *</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                          <Mail className="w-4 h-4" />
                        </span>
                        <input 
                          type="email" 
                          required
                          placeholder="client@mail.ru" 
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full p-3.5 pl-10 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none hover:border-slate-300 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Пароль (мин. 5 символов) *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input 
                        type="password" 
                        required
                        placeholder="••••••••" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full p-3.5 pl-10 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none hover:border-slate-300 transition-colors"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Нажимая кнопку регистрации, вы соглашаетесь с условиями хранения и обработки ваших персональных данных в соответствии с ФЗ №152-ФЗ РФ.
                  </p>

                  <button
                    type="submit"
                    className="w-full p-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.99] transition-all"
                  >
                    Зарегистрироваться профиль <ChevronRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="py-20 text-center flex flex-col justify-center items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Безопасная обработка данных...</p>
            </div>
          )}

          {/* 2. AUTHENTICATED: Show custom dashboard list */}
          {profile && !loading && (
            <div className="space-y-6">
              
              {/* Profile details banner header */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 block sm:flex sm:justify-between sm:items-center gap-4 shadow-sm">
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-500" /> {profile.fullName}
                  </h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> {profile.email} • <Phone className="w-3.5 h-3.5" /> {profile.phone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-3 sm:mt-0 p-2 px-3.5 bg-white border border-rose-200 hover:bg-rose-50 hover:text-rose-700 text-rose-600 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Выйти
                </button>
              </div>

              {/* Bookings table */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center justify-between">
                  <span>История визитов и записи СТО ({bookings.length})</span>
                  <span className="text-[10px] text-slate-300 font-normal normal-case">Записи синхронизируются автоматически</span>
                </h4>

                {bookings.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <span className="text-3xl block mb-2">🚗</span>
                    <p className="text-xs text-slate-500 font-bold">Вы пока не совершали записей через сайт СТО.</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                      Вы можете записаться на техническое обслуживание онлайн — запись сразу отобразится в вашем личном кабинете.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4.5 max-h-[350px] overflow-y-auto pr-1">
                    {bookings.map(book => {
                      const statusMeta = getStatusLabelAndStyle(book.status);
                      const canCancel = book.status !== 'cancelled' && book.status !== 'completed' && isCancelable(book.date, book.time);

                      return (
                        <div key={book.id} className="p-4.5 rounded-2xl border border-slate-150 bg-white grid grid-cols-1 md:grid-cols-4 gap-4 items-center hover:border-slate-300 transition-all shadow-sm">
                          {/* Booking Summary parameters */}
                          <div className="md:col-span-3 space-y-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 p-0.5 px-2 rounded">{book.id}</span>
                              <span className={`text-[10px] font-bold p-0.5 px-2.5 rounded-full border ${statusMeta.style}`}>
                                {statusMeta.label}
                              </span>
                              {book.paymentStatus === 'paid' ? (
                                <span className="text-[10px] font-bold p-0.5 px-2 rounded-full bg-emerald-50 text-emerald-800 border-emerald-100 border flex items-center gap-0.5">
                                  ✓ Оплачено
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold p-0.5 px-2 rounded-full bg-slate-100 text-slate-600 border-slate-200 border flex items-center gap-0.5">
                                  Оплата при визите
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600 leading-tight">
                              <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {new Date(book.date).toLocaleDateString('ru-RU')} в {book.time}</p>
                              <p className="flex items-center gap-2"><Wrench className="w-3.5 h-3.5 text-slate-400 font-bold" /> {book.serviceName}</p>
                              <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {book.branchName}</p>
                              <p className="flex items-center gap-2"><Car className="w-3.5 h-3.5 text-slate-400" /> {book.carMake} {book.carModel} ({book.carYear} г.)</p>
                            </div>
                            
                            {book.notes && (
                              <p className="text-[11px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <strong className="text-slate-600">Ваше примечание:</strong> {book.notes}
                              </p>
                            )}
                          </div>

                          {/* Control interactions column */}
                          <div className="md:col-span-1 flex flex-row md:flex-col gap-2 justify-end w-full">
                            <button
                              type="button"
                              onClick={() => {
                                // Dynamic simple receipt structure printable nicely
                                const win = window.open('', '_blank');
                                if (win) {
                                  win.document.write(`
                                    <html>
                                      <head>
                                        <title>Квитанция - ${book.id}</title>
                                        <style>
                                          body { font-family: sans-serif; padding: 40px; color: #333; }
                                          .receipt { max-width: 500px; margin: auto; border: 2px solid #ddd; padding: 30px; border-radius: 10px; }
                                          h2 { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 0; }
                                          .field { display: flex; justify-content: space-between; margin: 15px 0; font-size: 14px; }
                                          .footer { text-align: center; font-size: 12px; color: #777; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; }
                                        </style>
                                      </head>
                                      <body onload="window.print()">
                                        <div class="receipt">
                                          <h2>АС-Авто КВИТАНЦИЯ</h2>
                                          <div class="field"><strong>Код записи:</strong> <span>${book.id}</span></div>
                                          <div class="field"><strong>Клиент:</strong> <span>${book.clientName}</span></div>
                                          <div class="field"><strong>Контакты:</strong> <span>${book.clientPhone}</span></div>
                                          <div class="field"><strong>Автомобиль:</strong> <span>${book.carMake} ${book.carModel} (${book.carYear})</span></div>
                                          <div class="field"><strong>Услуга:</strong> <span>${book.serviceName}</span></div>
                                          <div class="field"><strong>Филиал:</strong> <span>${book.branchName}</span></div>
                                          <div class="field"><strong>Время записи:</strong> <span>${new Date(book.date).toLocaleDateString('ru-RU')} в ${book.time}</span></div>
                                          <div class="field"><strong>К оплате:</strong> <span>${book.amount} руб.</span></div>
                                          <div class="field"><strong>Предоплата:</strong> <span>${book.paymentStatus === 'paid' ? 'Внесено' : 'Не внесено'} (${book.prepaidAmount} руб.)</span></div>
                                          <div class="footer">Спасибо, что выбираете АС-Авто! Пожалуйста, приезжайте за 10 минут до начала работ.</div>
                                        </div>
                                      </body>
                                    </html>
                                  `);
                                  win.document.close();
                                }
                              }}
                              className="p-2 flex-1 md:flex-none border border-slate-200 hover:bg-slate-50 rounded-lg text-[11px] font-semibold text-slate-700 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" /> Чек-Квитанция
                            </button>
                            
                            {canCancel && (
                              <button
                                type="button"
                                onClick={() => handleCancelBooking(book.id)}
                                className="p-2 flex-1 md:flex-none border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                <XOctagon className="w-3.5 h-3.5 text-rose-500" /> Отменить СТО
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer info lock indicator banner help */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-center gap-2 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Безопасное HTTPS шифрование данных SSL 256-бит подтверждено
          </span>
        </div>
      </div>
    </div>
  );
}
