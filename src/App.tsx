/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Wrench, 
  Clock, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Award, 
  ThumbsUp, 
  UserPlus, 
  Users, 
  ChevronRight, 
  Sparkles,
  CreditCard,
  MessageSquare,
  Lock,
  LogOut,
  Star,
  Printer,
  BellRing
} from 'lucide-react';
import { AppConfig, Branch, Service, Promotion, Review } from './types';
import Installer from './components/Installer';
import BookingWizard from './components/BookingWizard';
import CustomerCabinet from './components/CustomerCabinet';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AppConfig | null>(null);
  
  // Public data pools
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  
  // Modals view toggles
  const [wizardOpen, setWizardOpen] = useState(false);
  const [cabinetOpen, setCabinetOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  // Client authentication state
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);

  // Filter/Tabs state
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Review submission inputs
  const [revName, setRevName] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revText, setRevText] = useState('');
  const [revMsg, setRevMsg] = useState('');

  // Contact form submission inputs
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');

  // Expiring promotion timer (dynamic countdown calculation)
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 45, seconds: 0 });

  useEffect(() => {
    fetchSystemConfig();
    
    // Auto tick promotion countdown
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { hours: prev.hours, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 }; // wrap day
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleCheckAuth = () => {
      setIsCustomerLoggedIn(!!localStorage.getItem('customer_jwt'));
    };
    handleCheckAuth();
    const interval = setInterval(handleCheckAuth, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setConfig(data);
      
      if (data && data.isInstalled) {
        // Load additional public databases
        const branchRes = await fetch('/api/branches');
        if (branchRes.ok) setBranches(await branchRes.json());

        const srvRes = await fetch('/api/services');
        if (srvRes.ok) {
          const sList = await srvRes.json();
          setServices(sList);
          if (sList.length > 0) {
            setSelectedCategory(sList[0].category);
          }
        }

        const promoRes = await fetch('/api/promotions');
        if (promoRes.ok) setPromotions(await promoRes.json());

        const revRes = await fetch('/api/reviews');
        if (revRes.ok) setReviews(await revRes.json());
      }
    } catch (e) {
      console.error('Failure loaded system config', e);
    } finally {
      setLoading(false);
    }
  };

  // Callback on successful installation wizard completes
  const handleInstalledSuccess = () => {
    fetchSystemConfig();
  };

  // Submit client review
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revName || !revText) {
      alert('Будь ласка, заполните все поля!');
      return;
    }
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: revName, rating: revRating, text: revText })
      });
      const data = await res.json();
      if (data.success) {
        setRevMsg(data.message);
        setRevName('');
        setRevText('');
        setRevRating(5);
      }
    } catch (err) {
      alert('Ошибка при отправке отзыва.');
    }
  };

  // Submit contact feedback
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactPhone) {
      alert('Заполните ваше ФИО и контактный телефон!');
      return;
    }
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: contactName, phone: contactPhone, message: contactMsg })
      });
      const data = await res.json();
      if (data.success) {
        setContactSuccess(data.message);
        setContactName('');
        setContactPhone('');
        setContactMsg('');
      }
    } catch (err) {
      alert('Ошибка соединения.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
        <span className="w-8 h-8 rounded-full border-4 border-t-orange-500 border-r-transparent border-slate-800 animate-spin"></span>
        <p className="font-mono text-xs tracking-widest text-slate-500 uppercase mt-4">Загрузка портала АС-Авто...</p>
      </div>
    );
  }

  // Mandatory WebOnboard Installer if config hasn't been set up yet
  if (config && !config.isInstalled) {
    return <Installer onSuccess={handleInstalledSuccess} />;
  }

  const distinctCategories = [...new Set(services.map(s => s.category))];

  return (
    <div 
      className="min-h-screen font-sans flex flex-col selection:bg-orange-500 selection:text-white"
      style={{ 
        backgroundColor: config?.bgColor || '#ffffff',
        '--color-brand-primary': config?.primaryColor || '#2563eb',
        '--color-brand-accent': config?.accentColor || '#f97316'
      } as any}
    >
      {/* Inject custom styles dynamically to react onto custom color presets chosen in Admin panel */}
      <style>{`
        :root {
          --brand-primary: ${config?.primaryColor || '#2563eb'};
          --brand-hover: ${config?.primaryColor}dd;
          --brand-accent: ${config?.accentColor || '#f97316'};
        }
        .btn-brand-primary {
          background-color: var(--brand-primary);
          color: white;
          transition: background-color 0.2s;
        }
        .btn-brand-primary:hover {
          background-color: var(--brand-hover);
        }
        .text-brand-accent {
          color: var(--brand-accent);
        }
      `}</style>
      
      {/* Dynamic Header Navbar */}
      <header className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 z-40 transition-shadow hover:shadow-sm">
        <div className="max-w-7xl mx-auto px-5 py-4 flex justify-between items-center">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg text-white font-black leading-none flex items-center justify-center text-sm tracking-tighter" style={{ backgroundColor: 'var(--brand-primary)' }}>
              АС
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 leading-none tracking-tight">{config?.companyName || 'АС-Авто'}</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 block">Вологда • Сеть СТО</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-xs font-bold text-slate-600 uppercase tracking-wider">
            <a href="#about" className="hover:text-amber-600 transition-colors">О нас</a>
            <a href="#services" className="hover:text-amber-600 transition-colors">Услуги</a>
            <a href="#promotions" className="hover:text-amber-600 transition-colors">Акции</a>
            <a href="#testimonials" className="hover:text-amber-600 transition-colors">Отзывы</a>
            <a href="#branches" className="hover:text-amber-600 transition-colors">Адреса</a>
          </nav>

          <div className="flex items-center gap-3">
            {isCustomerLoggedIn ? (
              <button 
                type="button" 
                onClick={() => setCabinetOpen(true)}
                className="hidden sm:inline-flex p-2.5 px-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold cursor-pointer hover:bg-emerald-100 transition-all shadow-sm items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Личный кабинет ✓
              </button>
            ) : (
              <button 
                type="button" 
                onClick={() => setCabinetOpen(true)}
                className="hidden sm:inline-flex p-2 px-4 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50 transition-all shadow-sm"
              >
                Личный кабинет
              </button>
            )}
            <button 
              type="button" 
              onClick={() => setWizardOpen(true)}
              className="btn-brand-primary p-2.5 px-5 rounded-xl text-xs font-bold cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shrink-0"
            >
              Записаться онлайн 🚀
            </button>
            <button 
              type="button" 
              onClick={() => setAdminOpen(true)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer shadow-sm flex items-center justify-center shrink-0"
              title="Панель администратора"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Visual Section Area */}
      <section className="bg-slate-950 text-white relative py-16 md:py-24 overflow-hidden border-b border-slate-900">
        <div className="absolute inset-0 opacity-15 bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=1200")' }}></div>
        
        <div className="max-w-7xl mx-auto px-5 relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 px-3.5 rounded-full text-xs font-mono text-orange-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 block animate-ping"></span>
              Филиалы свободны для записи сегодня
            </div>
            
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight max-w-lg">
              Профессиональный ремонт и ТО автомобилей в <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">Вологде</span>
            </h2>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-md font-medium">
              Официальная гарантия на все работы и запчасти. Свои сертифицированные мастера с опытом от 10 лет. Экспресс-шиномонтаж, ТО за 45 минут, точная компьютерная диагностика.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button 
                type="button" 
                onClick={() => setWizardOpen(true)}
                className="btn-brand-primary p-3.5 px-7 rounded-xl text-xs font-bold cursor-pointer text-center tracking-wider uppercase shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                Оформить онлайн запись
              </button>
              <a 
                href="#services" 
                className="p-3.5 px-7 border border-slate-750 hover:border-slate-700 bg-slate-900 rounded-xl text-xs font-bold leading-none shrink-0 text-center tracking-wider uppercase flex items-center justify-center gap-1.5"
              >
                Прейскурант работ <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="hidden lg:block relative">
            {/* Visual aesthetic highlight box */}
            <div className="p-8 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl shadow-2xl max-w-md mx-auto relative z-10 space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest font-mono">ГОРЯЧЕЕ ПРЕДЛОЖЕНИЕ</span>
                <span className="text-[11px] text-slate-400 font-mono">Сделай аванс</span>
              </div>
              <h3 className="font-extrabold text-lg leading-tight">Скидка 15% на регламентное ТО по промокоду FIRST15</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Введите в форме записи промокод <code className="text-teal-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded text-[10px]">FIRST15</code> и получите мгновенный перерасчет стоимости.
              </p>
              
              <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">До конца акции:</span>
                  <div className="font-mono font-bold flex gap-1 text-orange-400">
                    <span>{timeLeft.hours}ч</span>:<span>{timeLeft.minutes}м</span>:<span>{timeLeft.seconds}с</span>
                  </div>
                </div>
                <button type="button" onClick={() => setWizardOpen(true)} className="p-2 py-1.5 bg-orange-600 hover:bg-orange-700 rounded text-[10px] uppercase font-bold text-white tracking-widest leading-none">Успеть</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Six Main Highlights Block */}
      <section id="about" className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-450 block" style={{ color: 'var(--brand-primary)' }}>Почему нам доверяют</span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Безупречный уровень автосервисного обслуживания</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6.5">
            {[
              { title: 'Опыт мастеров 10+ лет', desc: 'Все специалисты сертифицированы и ежегодно проходят курсы повышения квалификации в учебных центрах производителей.', icon: Users },
              { title: 'Официальная Гарантия', desc: 'Предоставляем письменную гарантию до 12 месяцев на комплектующие и все слесарные работы.', icon: ShieldCheck },
              { title: 'Современные стенды диагностики', desc: 'Автосканеры Launch, дилерское ПО и компьютерные стенды развал-схождения Hunter последнего поколения.', icon: Award },
              { title: 'Только оригинальные запчасти', desc: 'Свой склад сертифицированных дубликатов OEM-качества и автохимии лучших брендов.', icon: ThumbsUp },
              { title: 'Оперативность визитов', desc: 'Делаем регламентные ТО, шиномонтаж и мелкие слесарные работы день-в-день без затягивания сроков.', icon: Clock },
              { title: 'Полная калькуляция расчетов', desc: 'Согласовываем объемы и сметы до начала разбора авто. Прозрачное ценообразование без скрытых накруток.', icon: CreditCard }
            ].map((adv, idx) => {
              const Icon = adv.icon;
              return (
                <div key={idx} className="p-6.5 bg-slate-50 border border-slate-150 rounded-2xl space-y-3 shrink-0 flex flex-col justify-between">
                  <div>
                    <div className="p-3 w-fit rounded-xl bg-white border border-slate-150 shadow-sm" style={{ color: 'var(--brand-primary)' }}>
                      <Icon className="w-5.5 h-5.5" />
                    </div>
                    <h4 className="font-bold text-base text-slate-850 tracking-tight mt-4.5">{adv.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mt-2.5">{adv.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Active Service Categories & Price Catalogue */}
      <section id="services" className="py-16 bg-slate-50/50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: 'var(--brand-primary)' }}>Каталог и стоимости услуг</span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Наш прейскурант обслуживания</h3>
          </div>

          {branches.length === 0 ? (
            <div className="p-10 text-center border bg-white rounded-2xl italic text-xs text-slate-450 max-w-md mx-auto">
              Услуги отсутствуют. Запустите инсталлятор для конфигурации прейскуранта.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Distinctive tab filters */}
              <div className="flex gap-2.5 overflow-x-auto pb-1.5 justify-center">
                {distinctCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`p-2 px-4.5 rounded-xl text-xs font-bold leading-none cursor-pointer whitespace-nowrap transition-all ${
                      selectedCategory === cat 
                        ? 'text-white' 
                        : 'bg-white border border-slate-205 text-slate-600 hover:bg-slate-50 shadow-sm'
                    }`}
                    style={selectedCategory === cat ? { backgroundColor: 'var(--brand-primary)' } : {}}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Mapped Services Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {services
                  .filter(s => s.category === selectedCategory)
                  .map(s => (
                    <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 leading-tight">{s.name}</h4>
                        <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">{s.description || 'Высококачественные восстановительные и профилактические работы.'}</p>
                      </div>

                      <div className="border-t border-slate-100 pt-4 mt-6 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">Время выполнения:</span>
                          <span className="text-xs font-semibold text-slate-700 font-mono flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {s.duration} мин
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block mb-0.5">Стоимость от:</span>
                          <span className="text-sm font-bold block" style={{ color: 'var(--brand-accent)' }}>{s.price} ₽</span>
                        </div>
                      </div>

                      <button 
                        type="button" 
                        onClick={() => setWizardOpen(true)}
                        className="w-full mt-4 p-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer block text-center"
                      >
                        Записаться на диагностику
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* Promotions & Campaigns */}
      <section id="promotions" className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: 'var(--brand-primary)' }}>Акции и горящие скидки</span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Выгодные предложения месяца</h3>
          </div>

          {promotions.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center">На сегодня специальные акции отсутствуют. Ожидайте новых анонсов СТО.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {promotions.map(promo => (
                <div key={promo.id} className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl text-white shadow-xl flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] text-orange-400 font-bold tracking-widest">
                      <span>КОД КУПОНА: {promo.promoCode || 'FIRST15'}</span>
                      <span className="bg-orange-600 text-white rounded p-0.5 px-2 tracking-normal leading-none">АКТИВНА</span>
                    </div>

                    <h4 className="font-extrabold text-base leading-tight text-white">{promo.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{promo.description}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-850 mt-5 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Размер дисконта:</span>
                      <span className="font-mono font-bold text-sm text-orange-400">
                        {promo.discountType === 'percent' ? `${promo.discountValue}% на чек` : `-${promo.discountValue} ₽ фиксировано`}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setWizardOpen(true)}
                      className="p-1.5 px-4 bg-orange-600 hover:bg-orange-700 rounded text-[10px] uppercase font-bold text-white tracking-widest shadow-md leading-none"
                    >
                      Использовать
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Customer Testimonials and Leave a Review Form */}
      <section id="testimonials" className="py-16 bg-slate-50/50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* Left Col: list of verified reviews */}
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: 'var(--brand-primary)' }}>Репутация сети</span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Отзывы клиентов автосервиса</h3>
              </div>

              {reviews.length === 0 ? (
                <div className="p-10 border bg-white rounded-2xl text-center italic text-xs text-slate-400">
                  Будьте первыми, кто оставит первый честный отзыв!
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {reviews.map(rev => (
                    <div key={rev.id} className="p-4.5 bg-white border border-slate-200 rounded-2xl text-xs space-y-3 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-800">{rev.clientName}</h4>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Опубликован: {rev.date}</span>
                        </div>
                        
                        <div className="flex gap-0.5 text-amber-500 font-mono text-base">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className="leading-none">{i < rev.rating ? '★' : '☆'}</span>
                          ))}
                        </div>
                      </div>

                      <p className="text-slate-650 font-serif leading-relaxed italic text-[13px]">"{rev.text}"</p>

                      {rev.replyText && (
                        <div className="p-3 bg-slate-50 border-l border-orange-500 rounded-r-lg text-slate-700">
                          <strong className="text-slate-800 font-bold block mb-1">Ответ руководства СТО:</strong>
                          <p className="italic text-[11px] leading-tight text-slate-500">{rev.replyText}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Col: leave a review form */}
            <div className="lg:col-span-1">
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-slate-850">Поделиться своим отзывом</h4>
                
                {revMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] font-medium rounded-lg">
                    ✓ {revMsg}
                  </div>
                )}

                <form onSubmit={handleReviewSubmit} className="space-y-3 text-xs text-slate-800">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Ваше Имя</label>
                    <input 
                      type="text" 
                      value={revName}
                      onChange={e => setRevName(e.target.value)}
                      placeholder="Александр И."
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Ваша оценка работы СТО (1-5)</label>
                    <select
                      value={revRating}
                      onChange={e => setRevRating(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                    >
                      <option value="5">⭐⭐⭐⭐⭐ 5 звезд</option>
                      <option value="4">⭐⭐⭐⭐ 4 звезды</option>
                      <option value="3">⭐⭐⭐ 3 звезды</option>
                      <option value="2">⭐⭐ 2 звезды</option>
                      <option value="1">⭐ 1 звезда</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Ваш отзыв</label>
                    <textarea 
                      value={revText}
                      onChange={e => setRevText(e.target.value)}
                      placeholder="Опишите ваши впечатления от ремонта..."
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-xs h-24 outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Отправить на модерацию
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Branches Geolocation & Contact Form */}
      <section id="branches" className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-5 grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: 'var(--brand-primary)' }}>Наши автосервисы на карте</span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Адреса и контакты филиалов</h3>
            </div>

            <div className="space-y-3">
              {branches.map(b => (
                <div key={b.id} className="p-4 border border-slate-200 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-300 shadow-sm">
                  <div className="space-y-1 text-xs">
                    <h4 className="font-bold text-slate-800 text-sm">{b.name}</h4>
                    <p className="text-slate-500 font-semibold">{b.address}</p>
                    <p className="text-slate-400 font-medium">Режим работы: {b.hours}</p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <a 
                      href={`tel:${b.phone}`} 
                      className="p-1 px-3 border border-slate-200 rounded text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Позвонить
                    </a>
                    <button 
                      type="button" 
                      onClick={() => {
                        setSelectedCategory(services[0]?.category || '');
                        setWizardOpen(true);
                      }} 
                      className="p-1 px-3 border border-transparent rounded text-xs font-bold text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Запись
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-[11px] text-slate-400 font-mono">
              * Заказы координируются центральной диспетчерской по номеру: {config?.phone}
            </p>
          </div>

          {/* Interactive Request Callbacks Form */}
          <div className="p-6 md:p-8 bg-slate-50 border border-slate-120 rounded-2xl shadow-sm relative justify-between flex flex-col">
            <div className="space-y-2 mb-4">
              <h4 className="font-extrabold text-sm text-slate-850">Остались вопросы? Оставьте заявку</h4>
              <p className="text-xs text-slate-500">Заполните анкету перезвона, и техконсультант составит калькуляцию сметы за 10 минут!</p>
            </div>

            {contactSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-xl mb-4">
                ✓ {contactSuccess}
              </div>
            )}

            <form onSubmit={handleContactSubmit} className="space-y-3.5 text-xs text-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Ваше Имя *</label>
                  <input 
                    type="text" 
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="Дмитрий"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Номер телефона *</label>
                  <input 
                    type="tel" 
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder="+7 (___) ___-__-__"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Опишите неисправность автомобиля (опционально)</label>
                <textarea 
                  value={contactMsg}
                  onChange={e => setContactMsg(e.target.value)}
                  placeholder="Стук в передней подвеске на неровностях, замена дисков..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs h-20 bg-white outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full p-3 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer uppercase tracking-wider"
              >
                Отправить заявку мастеру
              </button>
            </form>
          </div>

        </div>
      </section>

      {/* Bottom Footer Section */}
      <footer className="bg-slate-950 text-slate-400 py-10 mt-auto border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-5 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs leading-relaxed">
          
          <div className="space-y-3">
            <h4 className="font-bold text-white text-base font-sans flex items-center gap-2">
              <span className="p-1 px-2.2 rounded bg-orange-600 font-extrabold text-white text-xs">АС</span>
              {config?.companyName || 'АС-Авто'}
            </h4>
            <p className="text-slate-500">
              Авторизованная сеть центров диагностики, регламентных ТО и ремонта легкового автотранспорта в Новгородском и Вологодском регионе.
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-slate-200">Диспетчерский отдел</h5>
            <p>Телефон горячей линии: <strong>{config?.phone}</strong></p>
            <p>Email: <a href={`mailto:${config?.email}`} className="text-orange-400 hover:underline">{config?.email}</a></p>
            <p>График работы: {config?.workHours}</p>
          </div>

          <div className="space-y-3">
            <h5 className="font-bold text-slate-200">Юридическая информация</h5>
            <p className="text-slate-500">
              © {new Date().getFullYear()} {config?.companyName || 'АС-Авто'}. Все права защищены. <br />
              Торговая площадка интернет эквайринга {config?.billingProvider.toUpperCase()}. <br />
              Вся информация носит ознакомительный характер и не является публичной офертой (ст. 437 ГК РФ).
            </p>
          </div>

        </div>
      </footer>

      {/* FLOATING ACTION MODALS OVERLAYS */}

      {/* 1. Client Booking multistep Wizard (Modal) */}
      {wizardOpen && config && (
        <BookingWizard 
          config={config}
          branches={branches}
          services={services}
          onClose={() => setWizardOpen(false)}
          onSuccess={(bId) => {
            fetchSystemConfig();
          }}
        />
      )}

      {/* 2. Tracking Client Appt Cabinet lookup (Modal) */}
      {cabinetOpen && (
        <CustomerCabinet 
          onClose={() => setCabinetOpen(false)}
        />
      )}

      {/* 3. Restricted Admin Console Panel (Modal) */}
      {adminOpen && config && (
        <AdminPanel 
          config={config}
          onConfigChange={fetchSystemConfig}
          onClose={() => setAdminOpen(false)}
        />
      )}

    </div>
  );
}
