'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  bookingService,
  BookingHoliday,
  BookingSpecialDay,
  ScheduleHourRange,
  VendorScheduleDay,
} from '@/services/booking.service';
import { AlertCircle, CalendarDays, Clock3, Plus, Save, Trash2 } from 'lucide-react';
import DatePicker from 'react-multi-date-picker';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

type ScheduleMessage = {
  type: 'success' | 'error';
  text: string;
};

const FALLBACK_TIMEZONE = 'Asia/Tehran';

const resolveTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIMEZONE;
  } catch {
    return FALLBACK_TIMEZONE;
  }
};

const jalaliDateFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const formatJalaliDate = (rawDate?: string) => {
  if (!rawDate) {
    return 'بدون تاریخ';
  }

  const normalizedDate = rawDate.split('T')[0];
  const dateMatch = normalizedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!dateMatch) {
    return rawDate;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const parsedDate = new Date(year, month - 1, day);

  if (Number.isNaN(parsedDate.getTime())) {
    return rawDate;
  }

  return jalaliDateFormatter.format(parsedDate);
};

const toTimeValue = (value: string): string => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) {
    return '';
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return '';
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const toApiTime = (value: string): string => {
  const normalized = toTimeValue(value);
  return normalized ? `${normalized}:00` : '';
};

const toMinutes = (value: string): number | null => {
  const normalized = toTimeValue(value);
  if (!normalized) {
    return null;
  }

  const [hourText, minuteText] = normalized.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  return hour * 60 + minute;
};

const hasOverlap = (ranges: ScheduleHourRange[]) => {
  const prepared = ranges
    .map((range) => ({
      start: toMinutes(range.start_time),
      end: toMinutes(range.end_time),
    }))
    .filter((range): range is { start: number; end: number } => range.start !== null && range.end !== null)
    .sort((a, b) => a.start - b.start);

  for (let i = 1; i < prepared.length; i += 1) {
    if (prepared[i].start < prepared[i - 1].end) {
      return true;
    }
  }

  return false;
};

const isInsideAnyWorkRange = (breakRange: ScheduleHourRange, hours: ScheduleHourRange[]) => {
  const breakStart = toMinutes(breakRange.start_time);
  const breakEnd = toMinutes(breakRange.end_time);

  if (breakStart === null || breakEnd === null) {
    return false;
  }

  return hours.some((hourRange) => {
    const hourStart = toMinutes(hourRange.start_time);
    const hourEnd = toMinutes(hourRange.end_time);

    if (hourStart === null || hourEnd === null) {
      return false;
    }

    return breakStart >= hourStart && breakEnd <= hourEnd;
  });
};

const WEEK_TEMPLATE: VendorScheduleDay[] = [
  { day_code: 'sat', day_name: 'شنبه', is_working: true, hours: [{ start_time: '09:00', end_time: '17:00' }], breaks: [] },
  { day_code: 'sun', day_name: 'یکشنبه', is_working: true, hours: [{ start_time: '09:00', end_time: '17:00' }], breaks: [] },
  { day_code: 'mon', day_name: 'دوشنبه', is_working: true, hours: [{ start_time: '09:00', end_time: '17:00' }], breaks: [] },
  { day_code: 'tue', day_name: 'سه شنبه', is_working: true, hours: [{ start_time: '09:00', end_time: '17:00' }], breaks: [] },
  { day_code: 'wed', day_name: 'چهارشنبه', is_working: true, hours: [{ start_time: '09:00', end_time: '17:00' }], breaks: [] },
  { day_code: 'thu', day_name: 'پنجشنبه', is_working: true, hours: [{ start_time: '09:00', end_time: '14:00' }], breaks: [] },
  { day_code: 'fri', day_name: 'جمعه', is_working: false, hours: [], breaks: [] },
];

const normalizeRanges = (ranges: unknown): ScheduleHourRange[] => {
  if (!Array.isArray(ranges)) {
    return [];
  }

  return ranges
    .map((item) => {
      const candidate = item as Record<string, unknown>;
      const start_time = toTimeValue(String(candidate.start_time ?? candidate.start ?? '').trim());
      const end_time = toTimeValue(String(candidate.end_time ?? candidate.end ?? '').trim());

      return { start_time, end_time };
    })
    .filter((range) => range.start_time && range.end_time);
};

const validateDay = (day: VendorScheduleDay): string | null => {
  if (!day.is_working) {
    return null;
  }

  if (day.hours.length === 0) {
    return 'برای روز کاری باید حداقل یک بازه ساعت ثبت شود.';
  }

  for (const hour of day.hours) {
    if (!hour.start_time || !hour.end_time) {
      return 'لطفا ساعت شروع و پایان را کامل وارد کنید.';
    }

    if (hour.start_time >= hour.end_time) {
      return 'ساعت شروع باید از ساعت پایان کمتر باشد.';
    }
  }

  for (const breakRange of day.breaks) {
    if (!breakRange.start_time || !breakRange.end_time) {
      return 'برای بازه استراحت نیز ساعت شروع و پایان الزامی است.';
    }

    if (breakRange.start_time >= breakRange.end_time) {
      return 'در بازه استراحت نیز ساعت شروع باید از پایان کمتر باشد.';
    }

    if (!isInsideAnyWorkRange(breakRange, day.hours)) {
      return 'بازه استراحت باید داخل یکی از بازه های کاری همان روز باشد.';
    }
  }

  if (hasOverlap(day.hours)) {
    return 'بازه های کاری نمی توانند با یکدیگر همپوشانی داشته باشند.';
  }

  if (hasOverlap(day.breaks)) {
    return 'بازه های استراحت نمی توانند با یکدیگر همپوشانی داشته باشند.';
  }

  return null;
};

export default function SchedulePage() {
  const [weekly, setWeekly] = useState<VendorScheduleDay[]>(WEEK_TEMPLATE);
  const [holidays, setHolidays] = useState<BookingHoliday[]>([]);
  const [specialDays, setSpecialDays] = useState<BookingSpecialDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingDayCode, setSavingDayCode] = useState<string | null>(null);
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);
  const [isAddingSpecialDay, setIsAddingSpecialDay] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<ScheduleMessage | null>(null);

  const [holidayForm, setHolidayForm] = useState({ holiday_date: '', title: '' });
  const [specialDayForm, setSpecialDayForm] = useState({ special_date: '', start_time: '', end_time: '' });
  const [selectedHolidayDate, setSelectedHolidayDate] = useState<DateObject | null>(null);
  const [selectedSpecialDayDate, setSelectedSpecialDayDate] = useState<DateObject | null>(null);
  const timezone = useMemo(resolveTimezone, []);

  const orderedWeekly = useMemo(() => weekly, [weekly]);

  const loadSchedule = async () => {
    try {
      setIsLoading(true);
      setMessage(null);

      const data = await bookingService.getSchedule();
      const incomingWeeklyRaw = Array.isArray(data?.weekly) ? data.weekly : [];
      const incomingByCode = new Map<string, VendorScheduleDay>();

      incomingWeeklyRaw.forEach((entry) => {
        if (!entry?.day_code) {
          return;
        }

        incomingByCode.set(entry.day_code, {
          id: entry.id,
          day_code: entry.day_code,
          day_name: entry.day_name || entry.day_code,
          is_working: Boolean(entry.is_working),
          hours: normalizeRanges(entry.hours),
          breaks: normalizeRanges(entry.breaks),
        });
      });

      const mergedWeek = WEEK_TEMPLATE.map((templateDay) => {
        const incomingDay = incomingByCode.get(templateDay.day_code);

        if (!incomingDay) {
          return {
            ...templateDay,
            is_working: false,
            hours: [],
            breaks: [],
          };
        }

        return {
          ...templateDay,
          ...incomingDay,
          day_name: incomingDay.day_name || templateDay.day_name,
          hours: incomingDay.is_working ? incomingDay.hours : [],
          breaks: incomingDay.is_working ? incomingDay.breaks : [],
        };
      });

      setWeekly(mergedWeek);
      setHolidays(Array.isArray(data?.holidays) ? data.holidays : []);
      setSpecialDays(Array.isArray(data?.special_days) ? data.special_days : []);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'خطا در دریافت تنظیمات برنامه کاری.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  const updateDay = (dayCode: string, updater: (day: VendorScheduleDay) => VendorScheduleDay) => {
    setWeekly((prev) => prev.map((day) => (day.day_code === dayCode ? updater(day) : day)));
  };

  const updateRange = (
    dayCode: string,
    group: 'hours' | 'breaks',
    index: number,
    field: keyof ScheduleHourRange,
    value: string
  ) => {
    updateDay(dayCode, (day) => {
      const nextRanges = [...day[group]];
      nextRanges[index] = { ...nextRanges[index], [field]: value };
      return { ...day, [group]: nextRanges };
    });
  };

  const addRange = (dayCode: string, group: 'hours' | 'breaks') => {
    updateDay(dayCode, (day) => ({
      ...day,
      [group]: [...day[group], { start_time: '09:00', end_time: '10:00' }],
    }));
  };

  const removeRange = (dayCode: string, group: 'hours' | 'breaks', index: number) => {
    updateDay(dayCode, (day) => ({
      ...day,
      [group]: day[group].filter((_, i) => i !== index),
    }));
  };

  const saveDay = async (day: VendorScheduleDay) => {
    const errorText = validateDay(day);
    if (errorText) {
      setMessage({ type: 'error', text: `${day.day_name}: ${errorText}` });
      return;
    }

    try {
      setSavingDayCode(day.day_code);
      setMessage(null);

      await bookingService.saveScheduleDay({
        day_code: day.day_code,
        day_name: day.day_name,
        is_working: day.is_working,
        timezone,
        hours: day.is_working
          ? day.hours.map((range) => ({
              start_time: toApiTime(range.start_time),
              end_time: toApiTime(range.end_time),
            }))
          : [],
        breaks: day.is_working
          ? day.breaks.map((range) => ({
              start_time: toApiTime(range.start_time),
              end_time: toApiTime(range.end_time),
            }))
          : [],
      });

      setMessage({ type: 'success', text: `برنامه روز ${day.day_name} با موفقیت ذخیره شد.` });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || `ذخیره برنامه روز ${day.day_name} انجام نشد.`,
      });
    } finally {
      setSavingDayCode(null);
    }
  };

  const toIsoDate = (value: DateObject) => {
    const jsDate = value.toDate();
    const year = jsDate.getFullYear();
    const month = String(jsDate.getMonth() + 1).padStart(2, '0');
    const day = String(jsDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleHolidayDateChange = (value: DateObject | null) => {
    if (!value) {
      setSelectedHolidayDate(null);
      setHolidayForm((prev) => ({ ...prev, holiday_date: '' }));
      return;
    }

    setSelectedHolidayDate(value);
    setHolidayForm((prev) => ({ ...prev, holiday_date: toIsoDate(value) }));
  };

  const handleSpecialDayDateChange = (value: DateObject | null) => {
    if (!value) {
      setSelectedSpecialDayDate(null);
      setSpecialDayForm((prev) => ({ ...prev, special_date: '' }));
      return;
    }

    setSelectedSpecialDayDate(value);
    setSpecialDayForm((prev) => ({ ...prev, special_date: toIsoDate(value) }));
  };

  const createHoliday = async () => {
    if (!holidayForm.holiday_date || !holidayForm.title.trim()) {
      setMessage({ type: 'error', text: 'تاریخ و عنوان تعطیلی الزامی است.' });
      return;
    }

    try {
      setIsAddingHoliday(true);
      setMessage(null);

      await bookingService.createHoliday({
        holiday_date: holidayForm.holiday_date,
        title: holidayForm.title.trim(),
        timezone,
      });

      setHolidayForm({ holiday_date: '', title: '' });
      setSelectedHolidayDate(null);
      await loadSchedule();
      setMessage({ type: 'success', text: 'تعطیلی جدید با موفقیت اضافه شد.' });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'ثبت تعطیلی انجام نشد.',
      });
    } finally {
      setIsAddingHoliday(false);
    }
  };

  const removeHoliday = async (id: number) => {
    try {
      setIsDeletingId(`holiday-${id}`);
      setMessage(null);
      await bookingService.deleteHoliday(id);
      await loadSchedule();
      setMessage({ type: 'success', text: 'تعطیلی حذف شد.' });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'حذف تعطیلی انجام نشد.',
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  const createSpecialDay = async () => {
    if (!specialDayForm.special_date || !specialDayForm.start_time || !specialDayForm.end_time) {
      setMessage({ type: 'error', text: 'تاریخ و ساعت شروع/پایان روز ویژه الزامی است.' });
      return;
    }

    if (specialDayForm.start_time >= specialDayForm.end_time) {
      setMessage({ type: 'error', text: 'ساعت شروع روز ویژه باید از پایان کمتر باشد.' });
      return;
    }

    try {
      setIsAddingSpecialDay(true);
      setMessage(null);

      await bookingService.createSpecialDay({
        special_date: specialDayForm.special_date,
        start_time: toApiTime(specialDayForm.start_time),
        end_time: toApiTime(specialDayForm.end_time),
        timezone,
      });

      setSpecialDayForm({ special_date: '', start_time: '', end_time: '' });
      setSelectedSpecialDayDate(null);
      await loadSchedule();
      setMessage({ type: 'success', text: 'روز ویژه با موفقیت ثبت شد.' });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'ثبت روز ویژه انجام نشد.',
      });
    } finally {
      setIsAddingSpecialDay(false);
    }
  };

  const removeSpecialDay = async (id: number) => {
    try {
      setIsDeletingId(`special-${id}`);
      setMessage(null);
      await bookingService.deleteSpecialDay(id);
      await loadSchedule();
      setMessage({ type: 'success', text: 'روز ویژه حذف شد.' });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'حذف روز ویژه انجام نشد.',
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">برنامه کاری</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          ساعات کاری هفتگی، تعطیلی ها و روزهای ویژه خود را مدیریت کنید.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1" dir="ltr">
          Timezone: {timezone}
        </p>
      </div>

      {message && (
        <div
          className={`rounded-2xl border p-4 flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/50 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-300'
          }`}
        >
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
          در حال دریافت برنامه کاری...
        </div>
      ) : (
        <>
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 md:p-6 space-y-4">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Clock3 size={18} className="text-blue-600" />
              ساعات کاری هفتگی
            </h2>

            <div className="hidden md:grid grid-cols-[130px_120px_1fr_1fr_140px] gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">
              <span>روز</span>
              <span>وضعیت</span>
              <span>بازه های کاری</span>
              <span>بازه های استراحت</span>
              <span className="text-center">اقدامات</span>
            </div>

            <div className="space-y-3">
              {orderedWeekly.map((day) => {
                const disabled = savingDayCode === day.day_code;

                return (
                  <div
                    key={day.day_code}
                    className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 md:p-3.5 bg-white dark:bg-gray-900 md:grid md:grid-cols-[130px_120px_1fr_1fr_140px] md:gap-3 md:items-start"
                  >
                    <div className="flex items-center justify-between md:block">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{day.day_name}</span>
                      <span className={`md:mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${day.is_working ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                        {day.is_working ? 'کاری' : 'غیرکاری'}
                      </span>
                    </div>

                    <label className="mt-3 md:mt-1 inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={day.is_working}
                        onChange={(e) =>
                          updateDay(day.day_code, (prev) => ({
                            ...prev,
                            is_working: e.target.checked,
                          }))
                        }
                      />
                      روز کاری
                    </label>

                    {day.is_working ? (
                      <div className="mt-4 md:mt-0 space-y-4 md:space-y-3">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">بازه های کاری</p>
                            <button
                              onClick={() => addRange(day.day_code, 'hours')}
                              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                            >
                              <Plus size={13} />
                              افزودن
                            </button>
                          </div>

                          {day.hours.map((hour, index) => (
                            <div key={`${day.day_code}-hour-${index}`} className="grid grid-cols-[1fr_auto_1fr_auto] gap-1.5 md:gap-2 items-center bg-gray-50 dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700 rounded-lg p-2">
                              <input
                                type="time"
                                lang="en-GB"
                                value={hour.start_time}
                                onChange={(e) => updateRange(day.day_code, 'hours', index, 'start_time', e.target.value)}
                                className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 [color-scheme:light] dark:[color-scheme:dark]"
                              />
                              <span className="text-gray-400 text-xs">تا</span>
                              <input
                                type="time"
                                lang="en-GB"
                                value={hour.end_time}
                                onChange={(e) => updateRange(day.day_code, 'hours', index, 'end_time', e.target.value)}
                                className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 [color-scheme:light] dark:[color-scheme:dark]"
                              />
                              <button
                                onClick={() => removeRange(day.day_code, 'hours', index)}
                                className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                aria-label="حذف بازه"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 md:mt-0 md:col-span-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">این روز غیرکاری است.</p>
                      </div>
                    )}

                    {day.is_working && (
                      <div className="mt-4 md:mt-0 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">بازه های استراحت</p>
                          <button
                            onClick={() => addRange(day.day_code, 'breaks')}
                            className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                          >
                            <Plus size={13} />
                            افزودن
                          </button>
                        </div>

                        {day.breaks.length === 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">برای این روز بازه استراحت ثبت نشده است.</p>
                        )}

                        {day.breaks.map((breakItem, index) => (
                          <div key={`${day.day_code}-break-${index}`} className="grid grid-cols-[1fr_auto_1fr_auto] gap-1.5 md:gap-2 items-center bg-gray-50 dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700 rounded-lg p-2">
                            <input
                              type="time"
                              lang="en-GB"
                              value={breakItem.start_time}
                              onChange={(e) => updateRange(day.day_code, 'breaks', index, 'start_time', e.target.value)}
                              className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 [color-scheme:light] dark:[color-scheme:dark]"
                            />
                            <span className="text-gray-400 text-xs">تا</span>
                            <input
                              type="time"
                              lang="en-GB"
                              value={breakItem.end_time}
                              onChange={(e) => updateRange(day.day_code, 'breaks', index, 'end_time', e.target.value)}
                              className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 [color-scheme:light] dark:[color-scheme:dark]"
                            />
                            <button
                              onClick={() => removeRange(day.day_code, 'breaks', index)}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              aria-label="حذف استراحت"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 md:mt-0 md:self-stretch md:flex md:items-center md:justify-center">
                      <button
                        onClick={() => saveDay(day)}
                        disabled={disabled}
                        className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-70"
                      >
                        <Save size={16} />
                        {disabled ? 'در حال ذخیره...' : 'ذخیره روز'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 md:p-6 space-y-4">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <CalendarDays size={18} className="text-blue-600" />
                تعطیلی ها
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <DatePicker
                  value={selectedHolidayDate}
                  onChange={(value) => handleHolidayDateChange((value as DateObject) || null)}
                  calendar={persian}
                  locale={persian_fa}
                  format="YYYY/MM/DD"
                  editable={false}
                  calendarPosition="bottom-right"
                  containerClassName="w-full"
                  inputClass="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  placeholder="تاریخ تعطیلی"
                />
                <input
                  type="text"
                  value={holidayForm.title}
                  onChange={(e) => setHolidayForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="عنوان تعطیلی"
                  className="px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
              </div>

              <button
                onClick={createHoliday}
                disabled={isAddingHoliday}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-70"
              >
                <Plus size={16} />
                {isAddingHoliday ? 'در حال ثبت...' : 'افزودن تعطیلی'}
              </button>

              <div className="space-y-2">
                {holidays.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">تعطیلی ثبت نشده است.</p>
                ) : (
                  holidays.map((holiday) => (
                    <div
                      key={holiday.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2.5"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{holiday.title || 'تعطیلی'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                          {formatJalaliDate(holiday.holiday_date)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeHoliday(holiday.id)}
                        disabled={isDeletingId === `holiday-${holiday.id}`}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60"
                        aria-label="حذف تعطیلی"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 md:p-6 space-y-4">
              <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <CalendarDays size={18} className="text-blue-600" />
                روزهای ویژه
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <DatePicker
                  value={selectedSpecialDayDate}
                  onChange={(value) => handleSpecialDayDateChange((value as DateObject) || null)}
                  calendar={persian}
                  locale={persian_fa}
                  format="YYYY/MM/DD"
                  editable={false}
                  calendarPosition="bottom-right"
                  containerClassName="w-full"
                  inputClass="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  placeholder="تاریخ روز ویژه"
                />
                <input
                  type="time"
                  lang="en-GB"
                  value={specialDayForm.start_time}
                  onChange={(e) => setSpecialDayForm((prev) => ({ ...prev, start_time: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 [color-scheme:light] dark:[color-scheme:dark]"
                />
                <input
                  type="time"
                  lang="en-GB"
                  value={specialDayForm.end_time}
                  onChange={(e) => setSpecialDayForm((prev) => ({ ...prev, end_time: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              <button
                onClick={createSpecialDay}
                disabled={isAddingSpecialDay}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-70"
              >
                <Plus size={16} />
                {isAddingSpecialDay ? 'در حال ثبت...' : 'افزودن روز ویژه'}
              </button>

              <div className="space-y-2">
                {specialDays.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">روز ویژه ثبت نشده است.</p>
                ) : (
                  specialDays.map((specialDay) => (
                    <div
                      key={specialDay.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2.5"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100" dir="ltr">
                          {formatJalaliDate(specialDay.special_date)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                          {specialDay.start_time?.slice(0, 5)} - {specialDay.end_time?.slice(0, 5)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeSpecialDay(specialDay.id)}
                        disabled={isDeletingId === `special-${specialDay.id}`}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60"
                        aria-label="حذف روز ویژه"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
