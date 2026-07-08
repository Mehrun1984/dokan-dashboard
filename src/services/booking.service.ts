import apiClient from '@/lib/axios';

const NAMESPACE = '/core-plugin/v1/booking';

// The full appointment object returned by the server
export interface Appointment {
  id: number;
  service_id: number;
  customer_name: string;
  customer_phone: string;
  date: string;
  time_slot: string;
  status: string;
  customer_id?: number; // Backend might return this after generating the shadow account
}

// The payload sent to create an appointment (Shadow Account Flow)
export interface CreateAppointmentPayload {
  service_id: number;
  customer_name: string;
  customer_phone: string;
  date: string;
  time_slot: string;
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

  getAvailableSlots: async (date: string, serviceId: number) => {
    const { data } = await apiClient.get(`${NAMESPACE}/available-slots`, {
      params: { date, service_id: serviceId }
    });
    return data;
  },

  // ==========================================
  // MUTATING APPOINTMENTS
  // ==========================================
  createAppointment: async (payload: CreateAppointmentPayload): Promise<Appointment> => {
    // TRANSLATE FRONTEND KEYS TO BACKEND EXPECTED KEYS (STEP 5 ARCHITECTURE)
    const backendPayload = {
      product_id: payload.service_id,             // Maps service_id -> product_id
      appointment_date: payload.date,             // Maps date -> appointment_date
      start_time: payload.time_slot,              // Maps time_slot -> start_time
      end_time: payload.time_slot,                // Backend requires end_time, using start_time as fallback
      
      // SEND RAW DATA FOR STEP 5: Shadow Account & Woo Order Generation
      customer_name: payload.customer_name,       
      customer_phone: payload.customer_phone,     
      
      customer_id: 0,                             // Backend will override this after user check/creation
      vendor_id: 0,                               // Backend PHP will auto-resolve this
      status: 'pending',
      notes: ''                                   // Removed the old hack!
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