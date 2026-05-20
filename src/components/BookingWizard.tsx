/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Branch, Service } from '../types';
import { 
  MapPin, 
  Wrench, 
  Calendar as CalendarIcon, 
  Car, 
  User, 
  CreditCard, 
  CheckCircle, 
  Sparkles,
  Phone,
  Mail,
  Loader2,
  Clock,
  Printer,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface BookingWizardProps {
  config: any;
  branches: Branch[];
  services: Service[];
  onClose: () => void;
  onSuccess: (bookingId: string) => void;
}

export default function BookingWizard({ config, branches, services, onClose, onSuccess }: BookingWizardProps) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form states
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  
  // Car details
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carYear, setCarYear] = useState('');
  const [carVin, setCarVin] = useState('');

  // Contact details
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [agreePolicy, setAgreePolicy] = useState(true);

  // Billing decision
  const [prepaymentOption, setPrepaymentOption] = useState<'30' | '100' | '0'>('30');

  // Backend response states
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [simulatingPayment, setSimulatingPayment] = useState(false);

  // Auto select elements
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches]);

  // Auto-fill logged in customer profile details
  useEffect(() => {
    const custToken = localStorage.getItem('customer_jwt');
    if (custToken) {
      fetch('/api/customer/me', {
        headers: { 'Authorization': `Bearer ${custToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            if (data.fullName) setClientName(data.fullName);
            if (data.phone) setClientPhone(data.phone);
            if (data.email) setClientEmail(data.email);
          }
        })
        .catch(e => console.log('Booking wizard loading client info skipped:', e));
    }
  }, []);

  // Load distinct categories
  const categories = [...new Set(services.map(s => s.category))];
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0]);
    }
  }, [services]);

  // Fetch available slots on Date/Branch choice
  useEffect(() => {
    if (selectedBranchId && selectedDate) {
      fetchSlots();
    }
  }, [selectedBranchId, selectedDate]);

  const fetchSlots = async () => {
    setCheckingSlots(true);
    try {
      const res = await fetch(`/api/available-slots/${selectedBranchId}/${selectedDate}`);
      const data = await res.json();
      setAvailableSlots(data || []);
    } catch (err) {
      console.error('Error fetching available slots', err);
    } finally {
      setCheckingSlots(false);
    }
  };

  const getSelectedService = () => {
    return services.find(s => s.id === selectedServiceId);
  };

  const getSelectedBranch = () => {
    return branches.find(b => b.id === selectedBranchId);
  };

  // Pre-calculate coming 30 days for appointment calendar
  const getBookingDates = () => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const str = d.toISOString().split('T')[0];
      const name = d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
      list.push({ value: str, label: name });
    }
    return list;
  };

  const validateStep = () => {
    setError('');
    switch (step) {
      case 1:
        if (!selectedBranchId) {
          setError('Пожалуйста, выберите филиал.');
          return false;
        }
        break;
      case 2:
        if (!selectedServiceId) {
          setError('Пожалуйста, выберите желаемую услугу.');
          return false;
        }
        break;
      case 3:
        if (!selectedDate || !selectedTime) {
          setError('Пожалуйста, укажите дату и удобное время записи.');
          return false;
        }
        break;
      case 4:
        if (!carMake || !carModel || !carYear) {
          setError('Заполните обязательные поля: марка, модель и год выпуска вашего автомобиля.');
          return false;
        }
        break;
      case 5:
        if (!clientName || !clientPhone || !clientEmail) {
          setError('Заполните ваше ФИО, контактный телефон и email.');
          return false;
        }
        const mailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!mailRegex.test(clientEmail)) {
          setError('Укажите корректный адрес электронной почты.');
          return false;
        }
        if (!agreePolicy) {
          setError('Необходимо согласиться на обработку персональных данных (152-ФЗ РФ).');
          return false;
        }
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setError('');
    setStep(step - 1);
  };

  // Submit appointment to server
  const handleCreateBooking = async () => {
    if (!validateStep()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: selectedBranchId,
          serviceId: selectedServiceId,
          date: selectedDate,
          time: selectedTime,
          carMake,
          carModel,
          carYear,
          carVin,
          clientName,
          clientPhone,
          clientEmail,
          prepaymentOption,
          notes: ''
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Ошибка при создании записи.');
      }

      setConfirmedBookingId(data.bookingId);
      
      // If user selected 100% or 30% prepayment, initiate billing endpoint
      if (prepaymentOption !== '0') {
        const paymentAmount = prepaymentOption === '30' ? Math.round(data.amount * 0.3) : data.amount;
        const payRes = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: data.bookingId,
            amount: paymentAmount
          })
        });
        const payData = await payRes.json();
        if (payData.success) {
          setPaymentUrl(payData.confirmationUrl);
          setStep(6); // Go to billing screen
        } else {
          setStep(7); // Show success but unpaid
        }
      } else {
        setStep(7); // Success physical payment screen
      }
    } catch (err: any) {
      setError(err.message || 'Сбой соединения. Повторите попытку.');
    } finally {
      setLoading(false);
    }
  };

  // Perform secure mock checkout payment simulation inside checkout view
  const handleSimulatePayment = async () => {
    setSimulatingPayment(true);
    try {
      // Simulate bank delay
      await new Promise(resolve => setTimeout(resolve, 1800));
      
      const res = await fetch('/api/webhook/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: confirmedBookingId,
          paymentId: 'pay_sim_' + Math.random().toString(36).substring(2, 9),
          status: 'succeeded'
        })
      });

      if (res.ok) {
        setIsPaid(true);
        setStep(7); // Proceed to success voucher screen!
      } else {
        setError('Не удалось провести платеж. Повторите попытку.');
      }
    } catch (err) {
      setError('Ошибка при обработке транзакции.');
    } finally {
      setSimulatingPayment(false);
    }
  };

  const stepDetails = [
    { label: 'Филиал', icon: MapPin },
    { label: 'Услуга', icon: Wrench },
    { label: 'Расписание', icon: CalendarIcon },
    { label: 'Автомобиль', icon: Car },
    { label: 'Контакты', icon: User },
    ...(prepaymentOption !== '0' ? [{ label: 'Биллинг', icon: CreditCard }] : []),
    { label: 'Готово', icon: CheckCircle }
  ];

  const currentService = getSelectedService();
  const currentBranch = getSelectedBranch();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 z-50 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-3 my-4">
        
        {/* Right Details Section Card */}
        <div className="bg-slate-950 p-6 text-white flex flex-col justify-between md:border-r border-slate-800">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-800 mb-6">
              <Sparkles className="w-5 h-5 text-orange-400" />
              <h4 className="font-bold text-base text-slate-100">Инфо о заказе</h4>
            </div>

            <div className="space-y-4 text-xs">
              {currentBranch && (
                <div className="flex gap-2.5">
                  <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-100">{currentBranch.name}</p>
                    <p className="text-slate-400 mt-0.5">{currentBranch.address}</p>
                  </div>
                </div>
              )}

              {currentService && (
                <div className="flex gap-2.5 border-t border-slate-800 pt-3.5">
                  <Wrench className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="bg-slate-800 text-slate-300 p-0.5 px-1.5 rounded text-[9px] uppercase font-bold mr-1.5">{currentService.category}</span>
                    <p className="font-bold text-slate-100 mt-1">{currentService.name}</p>
                    <p className="text-slate-400 mt-0.5">Длительность: {currentService.duration} мин.</p>
                  </div>
                </div>
              )}

              {selectedDate && (
                <div className="flex gap-2.5 border-t border-slate-800 pt-3.5">
                  <CalendarIcon className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-100">Дата и Слоты</p>
                    <p className="text-slate-400 mt-0.5">
                      {new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })} в <strong className="text-white text-xs">{selectedTime || '—'}</strong>
                    </p>
                  </div>
                </div>
              )}

              {(carMake || carModel) && (
                <div className="flex gap-2.5 border-t border-slate-800 pt-3.5">
                  <Car className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-100">Транспортное средство</p>
                    <p className="text-slate-400 mt-0.5">{carMake} {carModel} ({carYear} г.)</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-5 mt-6">
            <div className="flex justify-between items-center text-xs pb-1">
              <span className="text-slate-400 font-medium">Общая стоимость:</span>
              <span className="font-mono font-bold text-slate-200">{currentService?.price || 0} ₽</span>
            </div>

            {prepaymentOption !== '0' && (
              <div className="flex justify-between items-center text-xs pb-3.5 border-b border-dashed border-slate-800 text-orange-400">
                <span>Размер предоплаты ({prepaymentOption}%):</span>
                <span className="font-mono font-bold">
                  {prepaymentOption === '30' ? Math.round((currentService?.price || 0) * 0.3) : (currentService?.price || 0)} ₽
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-3.5">
              <span className="text-sm font-bold text-slate-300">К оплате сейчас:</span>
              <span className="font-mono text-xl font-extrabold text-orange-400">
                {prepaymentOption === '0' 
                  ? '0' 
                  : prepaymentOption === '30' 
                  ? Math.round((currentService?.price || 0) * 0.3) 
                  : (currentService?.price || 0)
                } ₽
              </span>
            </div>
          </div>
        </div>

        {/* Left Form Step Container */}
        <div className="md:col-span-2 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-5">
              <h3 className="font-bold text-lg text-slate-800">Онлайн-запись в автосервис</h3>
              <button 
                type="button" 
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-600 font-bold text-lg rounded-full w-8 h-8 flex items-center justify-center hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl mb-4 text-xs font-semibold">
                ⚠️ {error}
              </div>
            )}

            {/* Render Current Steps Wizard */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-slate-500 font-medium">Шаг 1: Выберите филиал автосервиса сети «{config.companyName}»</p>
                <div className="space-y-2.5">
                  {branches.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBranchId(b.id)}
                      className={`w-full p-4 rounded-xl border text-left transition-all flex justify-between items-start ${
                        selectedBranchId === b.id 
                          ? 'border-blue-600 bg-blue-50/10 shadow-sm ring-1 ring-blue-500' 
                          : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">{b.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {b.address}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> {b.hours}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedBranchId === b.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                      }`}>
                        {selectedBranchId === b.id && <span className="text-[10px]">✓</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-slate-500 font-medium">Шаг 2: Выберите необходимую услугу</p>
                
                {/* Categorization tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat)}
                      className={`p-1.5 px-3 rounded-lg text-xs font-bold leading-none select-none whitespace-nowrap cursor-pointer transition-all ${
                        selectedCategoryId === cat 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Services list for this category */}
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {services
                    .filter(s => s.category === selectedCategoryId)
                    .map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedServiceId(s.id)}
                        className={`w-full p-3 px-4 rounded-xl border text-left flex justify-between items-center transition-all ${
                          selectedServiceId === s.id 
                            ? 'border-blue-600 bg-blue-50/10 ring-1 ring-blue-500 shadow-sm' 
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-slate-800">{s.name}</p>
                          <p className="text-xs text-slate-400">Длительность работ: {s.duration} минут</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-sm text-slate-800">{s.price} ₽</p>
                          {s.oldPrice && <p className="font-mono text-[10px] text-slate-400 line-through">{s.oldPrice} ₽</p>}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-slate-500 font-medium">Шаг 3: Выберите свободную дату и время визита</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Доступные даты</label>
                    <div className="grid grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto pr-1">
                      {getBookingDates().map(d => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => {
                            setSelectedDate(d.value);
                            setSelectedTime('');
                          }}
                          className={`p-2 rounded-lg text-xs font-bold border transition-all text-center ${
                            selectedDate === d.value 
                              ? 'border-blue-600 bg-blue-600 text-white shadow-sm' 
                              : 'border-slate-200 hover:border-slate-350 bg-white text-slate-700'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Доступное время {checkingSlots && <span className="text-[10px] text-blue-500 animate-pulse">(загрузка...)</span>}
                    </label>
                    
                    {!selectedDate ? (
                      <div className="h-[200px] flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-400 italic font-medium p-4 text-center">
                        Выберите дату слева для просмотра свободных интервалов
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="h-[200px] flex items-center justify-center text-xs text-rose-500 italic p-4 text-center">
                        Нет свободных слотов на выбранную дату
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto pr-1">
                        {availableSlots.map(slot => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setSelectedTime(slot.time)}
                            className={`p-2 rounded-lg text-xs font-mono font-bold border transition-all text-center ${
                              selectedTime === slot.time 
                                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm' 
                                : slot.available
                                ? 'border-slate-200 hover:border-slate-350 bg-white text-slate-700 cursor-pointer'
                                : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed line-through'
                            }`}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-slate-500 font-medium">Шаг 4: Укажите сведения об автомобиле</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Марка автомобиля *</label>
                    <input 
                      type="text" 
                      placeholder="Например: Ford" 
                      value={carMake}
                      onChange={e => setCarMake(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Модель автомобиля *</label>
                    <input 
                      type="text" 
                      placeholder="Например: Focus" 
                      value={carModel}
                      onChange={e => setCarModel(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Год выпуска *</label>
                    <input 
                      type="number" 
                      placeholder="Например: 2018" 
                      value={carYear}
                      onChange={e => setCarYear(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">VIN-номер (опционально)</label>
                    <input 
                      type="text" 
                      placeholder="17-значный код кузова" 
                      value={carVin}
                      onChange={e => setCarVin(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-slate-500 font-medium">Шаг 5: Контактная информация и способы оплаты</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Ваше ФИО *</label>
                    <input 
                      type="text" 
                      placeholder="Иван Иванович И." 
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Телефон для связи *</label>
                    <input 
                      type="tel" 
                      placeholder="+7 (999) 999-99-99" 
                      value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Адрес электронной почты * (для счетов и чеков)</label>
                    <input 
                      type="email" 
                      placeholder="client@mail.ru" 
                      value={clientEmail}
                      onChange={e => setClientEmail(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                {/* Billing choice card */}
                <div className="pt-3 border-t border-slate-100">
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">Правила оплаты записи</label>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPrepaymentOption('30')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        prepaymentOption === '30' 
                          ? 'border-blue-600 bg-blue-50/10 font-bold ring-1 ring-blue-500' 
                          : 'border-slate-200 text-slate-700 bg-white hover:border-slate-350'
                      }`}
                    >
                      <p className="text-xs">Предоплата 30%</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Резервирование</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrepaymentOption('100')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        prepaymentOption === '100' 
                          ? 'border-blue-600 bg-blue-50/10 font-bold ring-1 ring-blue-500' 
                          : 'border-slate-200 text-slate-700 bg-white hover:border-slate-350'
                      }`}
                    >
                      <p className="text-xs">Оплата 100%</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Полный расчет</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrepaymentOption('0')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        prepaymentOption === '0' 
                          ? 'border-blue-600 bg-blue-50/10 font-bold ring-1 ring-blue-500' 
                          : 'border-slate-200 text-slate-700 bg-white hover:border-slate-350'
                      }`}
                    >
                      <p className="text-xs">В автосервисе</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Оплата на месте</p>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    id="policy" 
                    checked={agreePolicy} 
                    onChange={e => setAgreePolicy(e.target.checked)} 
                    className="w-4 h-4 cursor-pointer text-blue-600 border-slate-200 rounded" 
                  />
                  <label htmlFor="policy" className="text-[10px] text-slate-500 leading-tight">
                    Я соглашаюсь на сбор и обработку моих персональных данных в соответствии с ФЗ №152-ФЗ РФ и согласен с Политикой конфиденциальности. *
                  </label>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-5 animate-fade-in text-center max-w-md mx-auto py-5">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-800">Перенаправление на безопасный шлюз ЮKassa...</h4>
                <p className="text-xs text-slate-500">
                  Ваша бронь <strong className="text-slate-800 font-mono text-xs">{confirmedBookingId}</strong> зафиксирована в расписании. Пожалуйста, проведите тестовый платеж для подтверждения записи.
                </p>

                <div className="bg-slate-50 border border-slate-120 p-4.5 rounded-xl text-left space-y-2">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">Сведения о транзакции:</p>
                  <p className="text-xs text-slate-600"><strong>Мерчант:</strong> Сеть «{config.companyName}» эквайринг</p>
                  <p className="text-xs text-slate-600"><strong>Назначение:</strong> Аванс/Оплата по заявке {confirmedBookingId}</p>
                  <p className="text-xs text-slate-600"><strong>Сумма:</strong> {prepaymentOption === '30' ? Math.round((currentService?.price || 0) * 0.3) : (currentService?.price || 0)} руб.</p>
                </div>

                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={simulatingPayment}
                  className="w-full p-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-transform cursor-pointer"
                >
                  {simulatingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Авторизация транзакции...
                    </>
                  ) : (
                    <>
                      Имитировать успешную оплату банковской картой 💳
                    </>
                  )}
                </button>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-5 animate-fade-in text-center max-w-lg mx-auto py-3">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-slate-800">Запись успешно завершена! 🎉</h4>
                <p className="text-xs text-slate-500">
                  Ваша бронь зафиксирована. На указанный номер телефона <strong className="text-slate-800">{clientPhone}</strong> отправлена СМС с кодом подтверждения визита.
                </p>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-120 text-left text-xs font-mono space-y-2 relative">
                  <div className="absolute top-2.5 right-2.5 bg-emerald-100 text-emerald-800 rounded p-1 text-[9px] uppercase font-bold px-1.5 font-sans">
                    {prepaymentOption === '0' ? 'Оплата при визите' : isPaid || prepaymentOption !== '0' ? 'Оплачено ✓' : 'Ожидает оплаты'}
                  </div>
                  <p className="text-sm font-bold text-slate-800 break-normal">Код брони: {confirmedBookingId}</p>
                  <p><strong>Филиал:</strong> {currentBranch?.name}</p>
                  <p><strong>Адрес:</strong> {currentBranch?.address}</p>
                  <p><strong>Услуга:</strong> {currentService?.name}</p>
                  <p><strong>Дата/Время:</strong> {new Date(selectedDate).toLocaleDateString('ru-RU')} в {selectedTime}</p>
                  <p><strong>Автомобиль:</strong> {carMake} {carModel} ({carYear} г.)</p>
                  <p><strong>Сумма расчета:</strong> {currentService?.price} ₽ (Внесено: {prepaymentOption === '0' ? '0' : prepaymentOption === '30' ? Math.round((currentService?.price || 0) * 0.3) : (currentService?.price || 0)} ₽)</p>
                </div>

                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-2 px-3 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" /> Распечатать квитанцию
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 px-4.5 bg-slate-900 hover:bg-slate-800 rounded-lg text-white text-xs font-bold"
                  >
                    Закрыть окно
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Master Wizard Controls */}
          {step < 6 && (
            <div className="flex justify-between items-center border-t border-slate-100 pt-5 mt-6">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 1 || loading}
                className={`flex items-center gap-1 p-2 px-4 rounded-xl border text-slate-600 font-bold text-xs transition-colors ${
                  step === 1 ? 'invisible' : 'border-slate-200 hover:bg-slate-50 cursor-pointer'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> Назад
              </button>

              {step < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-1 p-2 px-4.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  Далее <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateBooking}
                  disabled={loading}
                  className="flex items-center gap-1 p-2.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs cursor-pointer shadow-lg tracking-wide animate-pulse"
                >
                  {loading ? 'Создание записи...' : 'Подтвердить и Записаться! 🚀'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
