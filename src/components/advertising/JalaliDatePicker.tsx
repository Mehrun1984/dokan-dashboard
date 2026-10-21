'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const FA_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];
const FA_WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}
function mod(a: number, b: number): number {
  return a - Math.trunc(a / b) * b;
}

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394,
    2456, 3178,
  ];
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jm: number;
  let jump = 0;
  if (jy < jp || jy >= breaks[bl - 1]) throw new Error(`Invalid Jalaali year ${jy}`);
  for (let i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function d2j(jdn: number): { jy: number; jm: number; jd: number } {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

export function toJalaali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  return d2j(g2d(gy, gm, gd));
}

export function toGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  return d2g(j2d(jy, jm, jd));
}

function jalaaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jalCal(jy).leap === 0 ? 30 : 29;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

interface Props {
  value: string;
  onChange: (jalaliDateString: string) => void;
  placeholder?: string;
  inputClass?: string;
}

export default function JalaliDatePicker({ value, onChange, placeholder, inputClass = '' }: Props) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => {
    const now = new Date();
    return toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }, []);
  const parsed = useMemo(() => {
    const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(value);
    if (!m) return null;
    const jy = Number(m[1]);
    const jm = Number(m[2]);
    const jd = Number(m[3]);
    if (jm < 1 || jm > 12 || jd < 1 || jd > jalaaliMonthLength(jy, jm)) return null;
    return { jy, jm, jd };
  }, [value]);
  const [view, setView] = useState(() => ({
    y: parsed?.jy ?? today.jy,
    m: parsed?.jm ?? today.jm,
  }));

  function openPanel() {
    setView({ y: parsed?.jy ?? today.jy, m: parsed?.jm ?? today.jm });
    setOpen((o) => !o);
  }

  function select(jy: number, jm: number, jd: number) {
    onChange(`${jy}/${pad2(jm)}/${pad2(jd)}`);
    setOpen(false);
  }

  const firstWeekday = useMemo(() => {
    const g = toGregorian(view.y, view.m, 1);
    return (new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7;
  }, [view]);
  const daysInMonth = jalaaliMonthLength(view.y, view.m);

  const cells: Array<{ day: number } | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1 })),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openPanel}
        className={`${inputClass} flex items-center justify-between gap-2 text-left`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? '' : 'text-gray-400'}>{value || placeholder}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-gray-400 shrink-0">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div
            dir="rtl"
            className="absolute z-[61] mt-1.5 w-72 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-3 select-none"
          >
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() =>
                  setView((v) => (v.m === 12 ? { y: v.y + 1, m: 1 } : { y: v.y, m: v.m + 1 }))
                }
                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="ماه بعد"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {FA_MONTHS[view.m - 1]} {view.y}
              </span>
              <button
                type="button"
                onClick={() =>
                  setView((v) => (v.m === 1 ? { y: v.y - 1, m: 12 } : { y: v.y, m: v.m - 1 }))
                }
                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="ماه قبل"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {FA_WEEKDAYS.map((d) => (
                <span key={d} className="text-center text-[11px] text-gray-400 py-1">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((c, i) => {
                if (!c) return <span key={`x${i}`} />;
                const isSelected = parsed?.jy === view.y && parsed?.jm === view.m && parsed.jd === c.day;
                const isToday = today.jy === view.y && today.jm === view.m && today.jd === c.day;
                return (
                  <button
                    key={c.day}
                    type="button"
                    onClick={() => select(view.y, view.m, c.day)}
                    className={`h-8 rounded-lg text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white font-semibold'
                        : isToday
                          ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-500/10'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {c.day}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
