import apiClient from '@/lib/axios';

const NAMESPACE = '/core-plugin/v1/booking';

// The full appointment object returned by the server
export interface Appointment {
  id: number;
  service_id?: number;
  customer_name: string;
  customer_phone: string;
  date?: string;
  time_slot?: string;
  status: string;
  customer_id?: number; // Backend might return this after generating the shadow account
  appointment_date?: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
  operator_alias?: string;
  operator_id?: number;
  product_operator_id?: number;
}

// The payload sent to create an appointment (Shadow Account Flow)
export interface CreateAppointmentPayload {
  service_id: number;
  customer_name: string;
  customer_phone: string;
  date: string;
  time_slot: string;
  product_operator_id?: number;
  end_time?: string;
  notes?: string;
}

export interface CreateAppointmentResponse {
  created: boolean;
  appointment_id: number;
  order_id?: number;
  product_operator_id?: number | null;
}

export interface BookingOperator {
  id: number;
  alias_name: string;
  is_active: number;
  operator_user_id?: number;
  internal_name?: string;
}

export interface BookingVendorStaffUser {
  id: number;
  label: string;
}

export interface AvailableSlot {
  start_time?: string;
  end_time?: string;
  time?: string;
  label?: string;
  value?: string;
}

export interface VendorLocationPayload {
  id: number;
  name: string;
  slug: string;
}

export interface AvailableSlotsResponse {
  slots: Array<string | AvailableSlot>;
  operators: BookingOperator[];
  vendor_location?: VendorLocationPayload | null;
}

export interface AvailableDatesResponse {
  disabled_dates: string[];
  available_dates?: string[];
  vendor_id?: number;
  product_id?: number;
  [key: string]: unknown;
}

export interface ScheduleHourRange {
  start_time: string;
  end_time: string;
}

export interface VendorScheduleDay {
  id?: number;
  day_code: string;
  day_name: string;
  is_working: boolean;
  hours: ScheduleHourRange[];
  breaks: ScheduleHourRange[];
}

export interface SaveVendorSchedulePayload {
  vendor_id?: number;
  timezone?: string;
  day_code: string;
  day_name: string;
  is_working: boolean;
  hours: ScheduleHourRange[];
  breaks: ScheduleHourRange[];
}

export interface BookingHoliday {
  id: number;
  vendor_id?: number;
  holiday_date: string;
  title: string;
}

export interface CreateBookingHolidayPayload {
  vendor_id?: number;
  timezone?: string;
  holiday_date: string;
  title: string;
}

export interface BookingSpecialDay {
  id: number;
  vendor_id?: number;
  special_date: string;
  start_time: string;
  end_time: string;
}

export interface CreateBookingSpecialDayPayload {
  vendor_id?: number;
  timezone?: string;
  special_date: string;
  start_time: string;
  end_time: string;
}

export interface VendorScheduleResponse {
  weekly: VendorScheduleDay[];
  holidays: BookingHoliday[];
  special_days: BookingSpecialDay[];
  vendor_id: number;
  timezone?: string;
}

export const bookingService = {
  // ==========================================
  // FETCHING APPOINTMENTS
  // ==========================================
  getAppointments: async (): Promise<Appointment[]> => {
    const { data } = await apiClient.get(`${NAMESPACE}/appointments`, {
      params: { 
        limit: 100,      // Prevent the database query from defaulting to 1 or 10
        offset: 0
      }
    });
    return data;
  },

  getTodayAppointments: async (): Promise<Appointment[]> => {
    // Get today's date in YYYY-MM-DD format for the API filter (Used in Dashboard Home)
    const today = new Date().toISOString().split('T')[0];
    const { data } = await apiClient.get(`${NAMESPACE}/appointments`, {
      params: { date: today }
    });
    return data;
  },

  getAvailableSlots: async (params: {
    date: string;
    product_id: number;
    product_operator_id?: number;
    operator_id?: number;
    operators_only?: boolean;
    vendor_id?: number;
    duration_minutes?: number;
    buffer_minutes?: number;
    slot_interval?: number;
  }): Promise<AvailableSlotsResponse> => {
    const requestParams = {
      date: params.date,
      product_id: params.product_id,
      product_operator_id: params.product_operator_id,
      operator_id: params.operator_id ?? params.product_operator_id,
      operators_only: params.operators_only,
      vendor_id: params.vendor_id,
      duration_minutes: params.duration_minutes,
      buffer_minutes: params.buffer_minutes,
      slot_interval: params.slot_interval,
    };

    const { data } = await apiClient.get(`${NAMESPACE}/available-slots`, {
      params: requestParams,
    });
    return data;
  },

  getAvailableDates: async (params: {
    date_start: string;
    date_end: string;
    product_id?: number;
    vendor_id?: number;
  }): Promise<AvailableDatesResponse> => {
    const { data } = await apiClient.get(`${NAMESPACE}/available-dates`, {
      params,
    });

    return data;
  },

  listOperators: async (productId: number, vendorId?: number): Promise<BookingOperator[]> => {
    const { data } = await apiClient.get(`${NAMESPACE}/operators`, {
      params: {
        product_id: productId,
        vendor_id: vendorId,
      },
    });

    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.operators)) {
      return data.operators;
    }

    return [];
  },

  listVendorStaff: async (vendorId?: number): Promise<BookingVendorStaffUser[]> => {
    const { data } = await apiClient.get(`${NAMESPACE}/vendor-staff`, {
      params: vendorId ? { vendor_id: vendorId } : undefined,
    });

    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.users)) {
      return data.users;
    }

    return [];
  },

  // ==========================================
  // MUTATING APPOINTMENTS
  // ==========================================
  createAppointment: async (payload: CreateAppointmentPayload): Promise<CreateAppointmentResponse> => {
    // TRANSLATE FRONTEND KEYS TO BACKEND EXPECTED KEYS (STEP 5 ARCHITECTURE)
    const backendPayload = {
      product_id: payload.service_id,             // Maps service_id -> product_id
      appointment_date: payload.date,             // Maps date -> appointment_date
      start_time: payload.time_slot,              // Maps time_slot -> start_time
      end_time: payload.end_time || payload.time_slot, // Backend requires end_time
      product_operator_id: payload.product_operator_id,
      
      // SEND RAW DATA FOR STEP 5: Shadow Account & Woo Order Generation
      customer_name: payload.customer_name,       
      customer_phone: payload.customer_phone,     
      
      customer_id: 0,                             // Backend will override this after user check/creation
      vendor_id: 0,                               // Backend PHP will auto-resolve this
      status: 'pending',
      notes: payload.notes || ''                  // Removed the old hack!
    };

    const { data } = await apiClient.post(`${NAMESPACE}/appointments`, backendPayload);
    return data;
  },

  deleteAppointment: async (id: number) => {
    await apiClient.delete(`${NAMESPACE}/appointments/${id}`);
  },

  getSchedule: async (vendorId?: number): Promise<VendorScheduleResponse> => {
    const { data } = await apiClient.get(`${NAMESPACE}/schedules`, {
      params: vendorId ? { vendor_id: vendorId } : undefined,
    });
    return data;
  },

  saveScheduleDay: async (payload: SaveVendorSchedulePayload) => {
    const { data } = await apiClient.post(`${NAMESPACE}/schedules`, payload);
    return data;
  },

  getHolidays: async (vendorId?: number): Promise<BookingHoliday[]> => {
    const { data } = await apiClient.get(`${NAMESPACE}/holidays`, {
      params: vendorId ? { vendor_id: vendorId } : undefined,
    });

    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.holidays)) {
      return data.holidays;
    }

    return [];
  },

  createHoliday: async (payload: CreateBookingHolidayPayload) => {
    const { data } = await apiClient.post(`${NAMESPACE}/holidays`, payload);
    return data;
  },

  deleteHoliday: async (id: number, vendorId?: number) => {
    await apiClient.delete(`${NAMESPACE}/holidays/${id}`, {
      params: vendorId ? { vendor_id: vendorId } : undefined,
    });
  },

  getSpecialDays: async (vendorId?: number): Promise<BookingSpecialDay[]> => {
    const { data } = await apiClient.get(`${NAMESPACE}/special-days`, {
      params: vendorId ? { vendor_id: vendorId } : undefined,
    });

    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.special_days)) {
      return data.special_days;
    }

    return [];
  },

  createSpecialDay: async (payload: CreateBookingSpecialDayPayload) => {
    const { data } = await apiClient.post(`${NAMESPACE}/special-days`, payload);
    return data;
  },

  deleteSpecialDay: async (id: number, vendorId?: number) => {
    await apiClient.delete(`${NAMESPACE}/special-days/${id}`, {
      params: vendorId ? { vendor_id: vendorId } : undefined,
    });
  },
};