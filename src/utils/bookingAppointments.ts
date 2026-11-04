import { bookingService } from '@/services/booking.service';
import type { Appointment, BookingOperator } from '@/services/booking.service';

export const getAppointmentOperatorUserId = (appointment: Appointment) =>
  Number(appointment.operator_user_id || 0);

export const filterAppointmentsForStaff = (appointments: Appointment[], userId: number) => {
  if (userId <= 0) {
    return [];
  }

  return appointments.filter(
    (appointment) => getAppointmentOperatorUserId(appointment) === userId
  );
};

export const enrichAppointmentsWithOperators = async (
  appointments: Appointment[]
): Promise<Appointment[]> => {
  const operatorCache = new Map<number, Promise<BookingOperator[]>>();

  const loadOperators = (productId: number) => {
    if (!operatorCache.has(productId)) {
      operatorCache.set(
        productId,
        bookingService.listOperators(productId).catch(() => [] as BookingOperator[])
      );
    }

    return operatorCache.get(productId)!;
  };

  return Promise.all(
    appointments.map(async (appointment) => {
      const hasLabel = Boolean(
        String(appointment.operator_alias || appointment.operator_internal_name || '').trim()
      );
      const operatorId = Number(appointment.operator_id || appointment.product_operator_id || 0);
      const operatorUserId = Number(appointment.operator_user_id || 0);
      const productId = Number(appointment.product_id || appointment.service_id || 0);
      const needsOperatorLookup =
        (!hasLabel || operatorUserId <= 0) && operatorId > 0 && productId > 0;

      if (!needsOperatorLookup) {
        return appointment;
      }

      const operators = await loadOperators(productId);
      const match = operators.find((operator) => Number(operator.id) === operatorId);

      if (!match) {
        return appointment;
      }

      return {
        ...appointment,
        operator_alias: hasLabel ? appointment.operator_alias : match.alias_name,
        operator_internal_name: hasLabel ? appointment.operator_internal_name : match.internal_name,
        operator_user_id: appointment.operator_user_id || match.operator_user_id,
      };
    })
  );
};
