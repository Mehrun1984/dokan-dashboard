import type { Appointment } from '@/services/booking.service';

export type BookingStatus = 'pending' | 'cancelled' | 'confirmed';

export type AppointmentLike = Partial<Appointment> & Record<string, any>;

export interface BookingStatusMeta {
  label: string;
  className: string;
  value: BookingStatus;
}

const jalaliDateFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const getStatusMeta = (status: string): BookingStatusMeta => {
  if (status === 'pending') {
    return {
      label: 'در انتظار',
      value: 'pending',
      className: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300',
    };
  }

  if (status === 'cancelled') {
    return {
      label: 'لغو شده',
      value: 'cancelled',
      className: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300',
    };
  }

  return {
    label: 'تایید شده',
    value: 'confirmed',
    className: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300',
  };
};

export const extractCustomerInfo = (apt: AppointmentLike) => {
  let customerName = 'مشتری (بدون نام)';
  let customerPhone = '---';

  if (apt.notes && String(apt.notes).includes('نام مشتری:')) {
    const parts = String(apt.notes).split('|');
    customerName = parts[0]?.replace('نام مشتری:', '').trim() || customerName;
    customerPhone = parts[1]?.replace('تلفن:', '').trim() || customerPhone;
  } else if (apt.customer_name) {
    customerName = apt.customer_name;
    customerPhone = apt.customer_phone || '---';
  }

  return { customerName, customerPhone };
};

export const formatJalaliDate = (rawDate?: string) => {
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

export const extractDate = (apt: AppointmentLike) => formatJalaliDate(apt.appointment_date || apt.date);

export const extractTime = (apt: AppointmentLike) => {
  const rawTime = apt.start_time || apt.time_slot;
  return rawTime ? String(rawTime).substring(0, 5) : '--:--';
};

export const extractOperator = (apt: AppointmentLike) => {
  const alias = String(apt?.operator_alias || '').trim();
  const internalName = String(apt?.operator_internal_name || '').trim();
  const operatorId = Number(apt?.operator_id || apt?.product_operator_id || 0);

  if (alias && internalName) {
    return `${alias} - ${internalName}`;
  }

  if (alias) {
    return alias;
  }

  if (operatorId > 0) {
    return `اپراتور #${operatorId}`;
  }

  return 'تعیین نشده';
};
