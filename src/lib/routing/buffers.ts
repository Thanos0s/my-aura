import type { ConsultationType, DoctorConstraints } from "./types";

/**
 * Total buffer (minutes) to hold before a stop: the standard consult buffer,
 * plus a cushion when the previous leg was a long haul. Teleconsults have no
 * travel leg, so they get a short fixed buffer instead of the full formula.
 */
export function computeBuffer(
  distanceFromPreviousKm: number,
  consultationType: ConsultationType,
  constraints: DoctorConstraints
): number {
  if (consultationType === "TELECONSULT") {
    return Math.min(5, constraints.baseConsultMinutes);
  }
  const distanceCushion =
    distanceFromPreviousKm > constraints.travelBufferThresholdKm
      ? constraints.travelBufferCushionMinutes
      : 0;
  return constraints.baseConsultMinutes + distanceCushion;
}
