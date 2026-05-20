/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppConfig, Branch, Service } from '../types';
import { 
  Building2, 
  MapPin, 
  Wrench, 
  CreditCard, 
  Bell, 
  UserCheck, 
  CheckCircle, 
  Plus, 
  Trash2, 
  Sparkles,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

interface InstallerProps {
  onSuccess: () => void;
}

export default function Installer({ onSuccess }: InstallerProps) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Installer state
  const [companyName, setCompanyName] = useState('АС-Авто');
  const [phone, setPhone] = useState('+7 (817) 200-00-00');
  const [email, setEmail] = useState('info@as-auto.ru');
  const [workHours, setWorkHours] = useState('Пн-Вс: 09:00 - 20:00');
  
  // Custom Color presets
  const colorPresets = [
    { name: 'Синий Сапфир', primary: '#2563eb', accent: '#f97316', bg: '#ffffff' },
    { name: 'Изумрудный', primary: '#059669', accent: '#fbbf24', bg: '#ffffff' },
    { name: 'Рубиновый', primary: '#dc2626', accent: '#ec4899', bg: '#ffffff' },
    { name: 'Антрацит', primary: '#1e293b', accent: '#06b6d4', bg: '#ffffff' }
  ];
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [accentColor, setAccentColor] = useState('#f97316');
  const [bgColor, setBgColor] = useState('#ffffff');

  // Step 2: Branches
  const [branches, setBranches] = useState<Branch[]>([
    {
      id: 'br_1',
      name: 'Центральный филиал',
      address: 'г. Вологда, ул. Чернышевского, д. 120',
      phone: '+7 (817) 211-11-11',
      email: 'branch1@as-auto.ru',
      hours: 'Пн-Вс: 09:00 - 20:00',
      lat: 59.2312,
      lng: 39.8812,
      isActive: true
    }
  ]);
  const [newBranch, setNewBranch] = useState({ name: '', address: '', phone: '', email: '', hours: 'Пн-Вс: 09:00 - 20:00' });

  // Step 3: Services
  const defaultServices: Service[] = [
    { id: 'srv_1', category: 'Диагностика', name: 'Компьютерная диагностика', price: 1200, duration: 30, description: 'Полное сканирование узлов', icon: 'Cpu', isActive: true, sortOrder: 1 },
    { id: 'srv_2', category: 'Диагностика', name: 'Диагностика подвески', price: 600, duration: 20, description: 'Контроль люфтов и износа', icon: 'Gauge', isActive: true, sortOrder: 2 },
    { id: 'srv_3', category: 'ТО', name: 'Замена масла и фильтров', price: 2500, duration: 40, description: 'Регламентная замена моторного масла', icon: 'Droplet', isActive: true, sortOrder: 3 },
    { id: 'srv_4', category: 'Ремонт', name: 'Замена тормозных колодок', price: 1000, duration: 40, description: 'Замена колодок передней оси', icon: 'Wrench', isActive: true, sortOrder: 4 }
  ];
  const [services, setServices] = useState<Service[]>(defaultServices);
  const [newSrv, setNewSrv] = useState({ category: 'Диагностика', name: '', price: '', duration: '30', description: '', icon: 'Settings' });

  // Step 4: Billing
  const [billingProvider, setBillingProvider] = useState<'yookassa' | 'tinkoff' | 'stripe' | 'none'>('yookassa');
  const [billingShopId, setBillingShopId] = useState('10034509');
  const [billingSecretKey, setBillingSecretKey] = useState('test_secret_key_abcdef123456');

  // Step 5: Notifications
  const [smtpHost, setSmtpHost] = useState('smtp.yandex.ru');
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpUser, setSmtpUser] = useState('notification@as-auto.ru');
  const [smtpPass, setSmtpPass] = useState('password123');
  const [smsProvider, setSmsProvider] = useState<'smsc' | 'twilio' | 'none'>('smsc');
  const [smsLogin, setSmsLogin] = useState('as_auto_sms');
  const [smsPassword, setSmsPassword] = useState('smspass123');

  // Step 6: Admin Profile
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminEmail, setAdminEmail] = useState('skilrainkk@gmail.com');
  const [adminPassword, setAdminPassword] = useState('AdminPass2026!');

  // Helper additions
  const handleAddBranch = () => {
    if (!newBranch.name || !newBranch.address) {
      setError('Заполните название и адрес филиала.');
      return;
    }
    const clean: Branch = {
      id: 'br_' + Math.random().toString(36).substring(2, 9),
      name: newBranch.name,
      address: newBranch.address,
      phone: newBranch.phone || phone,
      email: newBranch.email || email,
      hours: newBranch.hours,
      lat: 59.2 + Math.random() * 0.05,
      lng: 39.8 + Math.random() * 0.05,
      isActive: true
    };
    setBranches([...branches, clean]);
    setNewBranch({ name: '', address: '', phone: '', email: '', hours: 'Пн-Вс: 09:00 - 20:00' });
    setError('');
  };

  const handleRemoveBranch = (id: string) => {
    setBranches(branches.filter(b => b.id !== id));
  };

  const handleAddSrv = () => {
    if (!newSrv.name || !newSrv.price) {
      setError('Заполните название услуги и цену.');
      return;
    }
    const clean: Service = {
      id: 'srv_' + Math.random().toString(36).substring(2, 9),
      category: newSrv.category,
      name: newSrv.name,
      price: Number(newSrv.price),
      duration: Number(newSrv.duration),
      description: newSrv.description,
      icon: newSrv.icon,
      isActive: true,
      sortOrder: services.length + 1
    };
    setServices([...services, clean]);
    setNewSrv({ category: 'Диагностика', name: '', price: '', duration: '30', description: '', icon: 'Settings' });
    setError('');
  };

  const handleRemoveSrv = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  const handleSelectPreset = (idx: number) => {
    setSelectedTheme(idx);
    setPrimaryColor(colorPresets[idx].primary);
    setAccentColor(colorPresets[idx].accent);
    setBgColor(colorPresets[idx].bg);
  };

  // Step navigations
  const nextStep = () => {
    if (step === 1 && !companyName) {
      setError('Укажите название автосервиса.');
      return;
    }
    if (step === 2 && branches.length === 0) {
      setError('Добавьте как минимум один филиал.');
      return;
    }
    if (step === 3 && services.length === 0) {
      setError('Добавьте как минимум одну услугу.');
      return;
    }
    if (step === 6) {
      if (!adminUsername || adminPassword.length < 6) {
        setError('Укажите имя администратора и надежный пароль (минимум 6 символов).');
        return;
      }
    }
    setError('');
    setStep(step + 1);
  };

  const prevStep = () => {
    setError('');
    setStep(step - 1);
  };

  // Submit and write configuration
  const handleFinishSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        companyName,
        primaryColor,
        accentColor,
        bgColor,
        phone,
        email,
        workHours,
        branches,
        services,
        billingProvider,
        billingKeys: {
          shopId: billingShopId,
          secretKey: billingSecretKey
        },
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smsProvider,
        smsLogin,
        smsPassword,
        adminUser: {
          username: adminUsername,
          email: adminEmail,
          password: adminPassword
        }
      };

      const res = await fetch('/api/installer/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Произошла ошибка при установке.');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения к серверу.');
    } finally {
      setLoading(false);
    }
  };

  const stepsList = [
    { title: 'Компания', desc: 'Профиль бренда', icon: Building2 },
    { title: 'Филиалы', desc: 'Гео-точки', icon: MapPin },
    { title: 'Услуги', desc: 'Прейскурант', icon: Wrench },
    { title: 'Оплата', desc: 'Биллинг ключи', icon: CreditCard },
    { title: 'Оповещения', desc: 'Связь с клиентом', icon: Bell },
    { title: 'Доступы', desc: 'Администрация', icon: UserCheck },
    { title: 'Финиш', desc: 'Проверка параметров', icon: CheckCircle }
  ];

  const CurrentStepIcon = stepsList[step - 1].icon;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-4 min-h-[600px]">
        
        {/* Step List Left Panel */}
        <div className="bg-slate-950 p-6 md:p-8 text-white flex flex-col justify-between border-r border-slate-805">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 rounded-xl bg-orange-500 text-white shadow-lg">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="font-mono text-xs text-orange-400 tracking-wider uppercase font-bold">Инсталлятор</span>
                <h2 className="font-bold text-lg text-slate-100">АС-Авто Система</h2>
              </div>
            </div>

            <nav className="space-y-4">
              {stepsList.map((s, idx) => {
                const stepNum = idx + 1;
                const Icon = s.icon;
                const isCompleted = stepNum < step;
                const isActive = stepNum === step;

                return (
                  <div 
                    key={idx} 
                    className={`flex items-center gap-3.5 p-2 px-3 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-slate-800 text-white font-medium border-l border-orange-500' 
                        : isCompleted 
                        ? 'text-slate-400 opacity-80' 
                        : 'text-slate-500'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border ${
                      isActive 
                        ? 'bg-orange-500 border-orange-500 text-white font-bold' 
                        : isCompleted 
                        ? 'bg-slate-800 border-slate-700 text-emerald-400' 
                        : 'border-slate-800 text-slate-500'
                    }`}>
                      {isCompleted ? '✓' : stepNum}
                    </div>
                    <div className="hidden md:block">
                      <p className="text-sm font-semibold leading-none">{s.title}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="text-[11px] text-slate-500 font-mono mt-8 md:mt-0">
            Версия ядра: 2026.1.5<br />
            Инициализация: API Express
          </div>
        </div>

        {/* Form Container Right Panel */}
        <div className="md:col-span-3 p-6 md:p-10 flex flex-col justify-between">
          <div>
            {/* Header of step */}
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5 mb-6">
              <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
                <CurrentStepIcon className="w-6 h-6 text-slate-800" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Шаг {step} из 7</span>
                <h3 className="text-xl font-bold text-slate-800 mt-1">{stepsList[step-1].title}</h3>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl mb-6 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600 block animate-ping mr-1"></span>
                {error}
              </div>
            )}

            {/* FORM MULTI STEP MODULES */}

            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5 uppercase">Название автосервиса</label>
                    <input 
                      type="text" 
                      placeholder="АС-Авто" 
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5 uppercase">Контактный телефон</label>
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5 uppercase">Email-адрес компании</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5 uppercase">Режим работы сети</label>
                    <input 
                      type="text" 
                      value={workHours}
                      onChange={(e) => setWorkHours(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Branded Styling Color presets */}
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-3 tracking-widest">Визуальная идентичность и брендинг</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    {colorPresets.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPreset(idx)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          selectedTheme === idx ? 'border-blue-600 ring-2 ring-blue-105' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <p className="text-xs font-bold text-slate-700">{p.name}</p>
                        <div className="flex gap-1.5 mt-2">
                          <span className="w-5.5 h-3 items-center rounded-sm block" style={{ backgroundColor: p.primary }}></span>
                          <span className="w-5.5 h-3 items-center rounded-sm block" style={{ backgroundColor: p.accent }}></span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Основной</label>
                      <div className="flex gap-2">
                        <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded border p-0 cursor-pointer" />
                        <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-full p-1 border text-xs rounded text-center tracking-mono" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Акцентный</label>
                      <div className="flex gap-2">
                        <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-8 h-8 rounded border p-0 cursor-pointer" />
                        <input type="text" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-full p-1 border text-xs rounded text-center tracking-mono" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Цвет Фона</label>
                      <div className="flex gap-2">
                        <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 rounded border p-0 cursor-pointer" />
                        <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-full p-1 border text-xs rounded text-center tracking-mono" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                {/* Branch manager block */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <h4 className="text-xs font-bold uppercase text-slate-600 tracking-wider">Добавить автосервис (филиал)</h4>
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Название (например: Филиал Юг)" 
                      value={newBranch.name}
                      onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Адрес (например: ул. Герцена, 94)" 
                      value={newBranch.address}
                      onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Телефон (" 
                      value={newBranch.phone}
                      onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="График работы" 
                      value={newBranch.hours}
                      onChange={(e) => setNewBranch({ ...newBranch, hours: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                    <button 
                      type="button" 
                      onClick={handleAddBranch}
                      className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Добавить
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase text-slate-400">Список развернутых филиалов ({branches.length})</h4>
                  {branches.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Нет добавленных филиалов. Добавьте хотя бы один.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-[180px] overflow-y-auto pr-1">
                      {branches.map((b) => (
                        <div key={b.id} className="flex justify-between items-center py-2.5">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{b.name}</p>
                            <p className="text-xs text-slate-500">{b.address}</p>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveBranch(b.id)} 
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5 animate-fade-in">
                {/* Services catalog builder */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="md:col-span-2 flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase text-slate-600 tracking-wider">Менеджер услуг (добавление новых)</h4>
                  </div>
                  <div>
                    <select 
                      value={newSrv.category}
                      onChange={(e) => setNewSrv({ ...newSrv, category: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option value="Диагностика">Диагностика</option>
                      <option value="ТО и замена масел">ТО и замена масел</option>
                      <option value="Ремонт ходовой">Ремонт ходовой</option>
                      <option value="Шиномонтаж">Шиномонтаж</option>
                      <option value="Двигатель">Двигатель</option>
                    </select>
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Название услуги" 
                      value={newSrv.name}
                      onChange={(e) => setNewSrv({ ...newSrv, name: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <input 
                      type="number" 
                      placeholder="Стоимость, руб" 
                      value={newSrv.price}
                      onChange={(e) => setNewSrv({ ...newSrv, price: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="Длительность, мин" 
                      value={newSrv.duration}
                      onChange={(e) => setNewSrv({ ...newSrv, duration: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                    <button 
                      type="button" 
                      onClick={handleAddSrv}
                      className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Добавить
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-slate-400">Список услуг прайса ({services.length})</h4>
                  <div className="max-h-[200px] overflow-y-auto pr-1 border border-slate-100 rounded-xl divide-y divide-slate-100 bg-white">
                    {services.map((s) => (
                      <div key={s.id} className="flex justify-between items-center p-3 text-xs">
                        <div>
                          <span className="bg-slate-100 text-slate-600 p-1 px-1.5 rounded-md font-medium text-[10px] mr-2 uppercase">{s.category}</span>
                          <span className="font-semibold text-slate-800">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-bold text-slate-700">{s.price} ₽</span>
                          <span className="text-slate-400">{s.duration} мин</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveSrv(s.id)} 
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {[
                    { id: 'yookassa', name: 'ЮKassa (Интегрировано)', provider: 'Яндекс.Касса' },
                    { id: 'tinkoff', name: 'Т-Касса (Tinkoff)', provider: 'Tinkoff Acquiring API' },
                    { id: 'stripe', name: 'Stripe International', provider: 'Stripe API checkout' },
                    { id: 'none', name: 'Наличный расчет / Оплата в кассе', provider: 'Физические платежи' }
                  ].map((gw) => (
                    <button
                      key={gw.id}
                      type="button"
                      onClick={() => setBillingProvider(gw.id as any)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        billingProvider === gw.id ? 'border-blue-600 bg-blue-50/20 shadow-md ring-1 ring-blue-105' : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <p className="text-sm font-bold text-slate-800">{gw.name}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{gw.provider}</p>
                    </button>
                  ))}
                </div>

                {billingProvider !== 'none' && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                    <h4 className="text-xs font-bold uppercase text-slate-600 tracking-wider">Конфигурация параметров интернет-эквайринга</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">ИД Торговой точки (ShopID / TerminalKey)</label>
                        <input 
                          type="text" 
                          value={billingShopId}
                          onChange={(e) => setBillingShopId(e.target.value)}
                          placeholder="shop_123450"
                          className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Секретный Ключ API / Токен</label>
                        <input 
                          type="password" 
                          value={billingSecretKey}
                          onChange={(e) => setBillingSecretKey(e.target.value)}
                          placeholder="************************"
                          className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      ⓘ Эквайринг работает по зашифрованному протоколу HTTPS. Данные ЮKassa защищены стандартом PCI DSS.
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-5 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Email Settings */}
                  <div className="p-4 border border-slate-200 rounded-xl space-y-3.5 bg-white">
                    <h4 className="text-xs font-bold uppercase text-slate-700 block border-b pb-2 tracking-widest border-slate-100">Настройки Email (SMTP Сервер)</h4>
                    
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Филиал SMTP сервера</label>
                      <input 
                        type="text" 
                        value={smtpHost}
                        onChange={e => setSmtpHost(e.target.value)}
                        placeholder="smtp.yandex.ru"
                        className="w-full p-2 border border-slate-200 rounded text-xs"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Порт</label>
                        <input 
                          type="number" 
                          value={smtpPort}
                          onChange={e => setSmtpPort(Number(e.target.value))}
                          className="w-full p-2 border border-slate-200 rounded text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Логин / Почта</label>
                        <input 
                          type="email" 
                          value={smtpUser}
                          onChange={e => setSmtpUser(e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Пароль приложения SMTP</label>
                      <input 
                        type="password" 
                        value={smtpPass}
                        onChange={e => setSmtpPass(e.target.value)}
                        placeholder="••••••••••••••"
                        className="w-full p-2 border border-slate-200 rounded text-xs"
                      />
                    </div>
                  </div>

                  {/* SMS Gateway Settings */}
                  <div className="p-4 border border-slate-200 rounded-xl space-y-3.5 bg-white">
                    <h4 className="text-xs font-bold uppercase text-slate-700 block border-b pb-2 tracking-widest border-slate-100">SMS-шлюз оповещения клиентов</h4>

                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {['smsc', 'twilio', 'none'].map((prov) => (
                        <button
                          key={prov}
                          type="button"
                          onClick={() => setSmsProvider(prov as any)}
                          className={`p-2 rounded text-xs font-semibold text-center border capitalize transition-all ${
                            smsProvider === prov ? 'bg-orange-600 text-white border-orange-600' : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300'
                          }`}
                        >
                          {prov === 'smsc' ? 'SmsC.ru' : prov === 'twilio' ? 'Twilio' : 'Откл.'}
                        </button>
                      ))}
                    </div>

                    {smsProvider !== 'none' && (
                      <>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Логин шлюза</label>
                          <input 
                            type="text" 
                            value={smsLogin}
                            onChange={e => setSmsLogin(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Пароль / API Ключ</label>
                          <input 
                            type="password" 
                            value={smsPassword}
                            onChange={e => setSmsPassword(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded text-xs"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">
                          * Оповещения отправляются автоматически на 4-м и 5-м шагах записи.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4 animate-fade-in max-w-lg mx-auto">
                <p className="text-xs text-slate-500 leading-relaxed text-center mb-2">
                  Создайте главную учетную запись администратора для управления записями, филиалами, акциями и прейскурантами.
                </p>

                <div className="space-y-3.5 bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Имя пользователя (Логин)</label>
                    <input 
                      type="text" 
                      value={adminUsername}
                      onChange={e => setAdminUsername(e.target.value)}
                      placeholder="admin"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Административный email</label>
                    <input 
                      type="email" 
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      placeholder="admin@as-auto.ru"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Пароль суперадмина</label>
                    <input 
                      type="password" 
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white tracking-widest text-slate-750"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-5 animate-fade-in text-center max-w-xl mx-auto py-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h4 className="text-lg font-bold text-slate-800">Все готово к инициализации!</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Проверьте сводные данные ниже перед завершением. При нажатии на кнопку финиша система сохранит конфигурацию <code className="font-mono bg-slate-100 p-0.5 rounded px-1.5 text-orange-600">.env</code> и базу данных, развернет начальный прейскурант и откроет доступ к публичному порталу.
                </p>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-120 text-left text-xs space-y-2 font-mono">
                  <p><strong className="text-slate-600">Марка сервиса:</strong> {companyName}</p>
                  <p><strong className="text-slate-600">Кол-во филиалов:</strong> {branches.length}</p>
                  <p><strong className="text-slate-600">Доступных услуг:</strong> {services.length} ед.</p>
                  <p><strong className="text-slate-600">Биллинг:</strong> {billingProvider === 'none' ? 'В кассе при визите' : billingProvider.toUpperCase()}</p>
                  <p><strong className="text-slate-600">Уведомляет через:</strong> {smsProvider === 'none' ? 'Только Email' : `Email + ${smsProvider.toUpperCase()}`}</p>
                  <p><strong className="text-slate-600">Суперадмин:</strong> {adminUsername} ({adminEmail})</p>
                </div>
              </div>
            )}
          </div>

          {/* Navigational controls below */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-5 mt-8">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 1 || loading}
              className={`flex items-center gap-1.5 p-2 px-4.5 rounded-xl border font-bold text-xs transition-colors ${
                step === 1 
                  ? 'invisible' 
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer'
              }`}
            >
              <ArrowLeft className="w-4 h-4" /> Назад
            </button>

            {step < 7 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1.5 p-2 px-5.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Далее <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishSetup}
                disabled={loading}
                className="flex items-center gap-1.5 p-2 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-lg disabled:opacity-50 animate-bounce"
              >
                {loading ? 'Инициализация...' : 'Завершить установку! ✓'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
