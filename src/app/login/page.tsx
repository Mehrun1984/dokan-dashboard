'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { sendOtpAction, verifyOtpAction } from '@/app/actions/auth';
import { Store, Phone, KeyRound, ArrowRight } from 'lucide-react';

const phoneSchema = z.object({
  phone: z.string().regex(/^(\+98|0)?9\d{9}$/, 'شماره موبایل وارد شده معتبر نیست'),
});
type PhoneFormData = z.infer<typeof phoneSchema>;

const codeSchema = z.object({
  code: z.string().regex(/^\d{5}$/, 'کد تایید باید ۵ رقم باشد'),
});
type CodeFormData = z.infer<typeof codeSchema>;

const COUNTDOWN_SECONDS = 120;

export default function OTPLoginPage() {
  const router = useRouter();

  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('vendor_jwt='))
      ?.split('=')[1];

    if (token) {
      router.replace('/dashboard');
      router.refresh();
    }
  }, [router]);
  
  const [step, setStep] = useState<1 | 2>(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);

  const phoneForm = useForm<PhoneFormData>({ resolver: zodResolver(phoneSchema) });
  const codeForm = useForm<CodeFormData>({ resolver: zodResolver(codeSchema) });

  useEffect(() => {
    if (step === 2 && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      setCanResend(true);
    }
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const onPhoneSubmit = async (data: PhoneFormData) => {
    setServerError(null);
    const result = await sendOtpAction(data.phone);

    if (result.error) {
      setServerError(result.error);
    } else {
      setPhoneNumber(data.phone);
      setStep(2);
      setTimeLeft(COUNTDOWN_SECONDS);
      setCanResend(false);
    }
  };

  const onCodeSubmit = async (data: CodeFormData) => {
    setServerError(null);
    const result = await verifyOtpAction(phoneNumber, data.code);

    if (result.error) {
      setServerError(result.error);
    } else {
      router.push('/dashboard');
      router.refresh(); 
    }
  };

  const handleResend = () => {
    if (canResend) onPhoneSubmit({ phone: phoneNumber }); 
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-blue-600"></div>

        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Store size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">پنل فروشندگان</h1>
          <p className="text-sm text-gray-500">
            {step === 1 ? 'جهت ورود یا ثبت‌نام، شماره موبایل خود را وارد کنید' : 'کد تایید ارسال شده را وارد کنید'}
          </p>
        </div>

        {serverError && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium text-start flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-red-600 rounded-full shrink-0"></div>
            {serverError}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-start flex items-center gap-1.5">
                <Phone size={16} className="text-gray-400" />
                شماره موبایل
              </label>
              <input
                type="tel"
                dir="ltr"
                {...phoneForm.register('phone')}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-start text-lg tracking-wider placeholder-gray-400"
                placeholder="0912 345 6789"
              />
              {phoneForm.formState.errors.phone && (
                <span className="text-red-500 text-xs mt-1.5 block text-start">
                  {phoneForm.formState.errors.phone.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={phoneForm.formState.isSubmitting}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {phoneForm.formState.isSubmitting ? 'در حال ارسال...' : 'دریافت کد تایید'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-6 animate-fade-in">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <KeyRound size={16} className="text-gray-400" />
                  کد تایید
                </label>
                <button 
                  type="button" 
                  onClick={() => setStep(1)} 
                  className="text-xs text-blue-600 font-medium flex items-center gap-1"
                >
                  تغییر شماره <ArrowRight size={14} />
                </button>
              </div>
              
              <input
                type="text"
                inputMode="numeric"
                dir="ltr"
                maxLength={5}
                {...codeForm.register('code')}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="•••••"
              />
              {codeForm.formState.errors.code && (
                <span className="text-red-500 text-xs mt-1.5 block text-start">
                  {codeForm.formState.errors.code.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={codeForm.formState.isSubmitting}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {codeForm.formState.isSubmitting ? 'در حال بررسی...' : 'ورود به داشبورد'}
            </button>

            <div className="text-center pt-2">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={phoneForm.formState.isSubmitting}
                  className="text-sm text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                >
                  {phoneForm.formState.isSubmitting ? 'در حال ارسال مجدد...' : 'ارسال مجدد کد'}
                </button>
              ) : (
                <p className="text-sm text-gray-500 font-mono" dir="ltr">
                  ارسال مجدد کد در {formatTime(timeLeft)}
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}