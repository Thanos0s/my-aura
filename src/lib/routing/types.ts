/**
 * Data models for the location-aware dynamic queue optimization engine.
 * Pure types — no Convex/network dependency, so the whole engine is
 * unit-testable in isolation (mirrors src/lib/intake/engine.ts).
 */

export type GeoPoint = {
  lat: number;
  lng: number;
};

export type ConsultationType = "HOME_VISIT" | "CLINIC_OPD" | "TELECONSULT";

export type UrgencyLevel = "ROUTINE" | "PRIORITY" | "EMERGENCY";

export interface ConsultationRequest {
  id: string;
  patientId: string;
  practitionerUserId: string;
  geo: GeoPoint;
  address: string;
  pinCode: string;
  consultationType: ConsultationType;
  urgency: UrgencyLevel;
  /** Patient's preferred appointment window, epoch ms. */
  preferredWindowStart: number;
  preferredWindowEnd: number;
  /** Expected in-room/on-call consult length, minutes. */
  estimatedConsultMinutes: number;
  createdAt: number;
}

export interface QueueEntry extends ConsultationRequest {
  /** 0-based position in the doctor's final route for the day. */
  sequenceIndex: number;
  /** Geographic zone this entry was clustered into ("emergency" for inserted urgent requests). */
  zoneId: string;
  /** Computed arrival time at this stop, epoch ms. */
  estimatedArrivalAt: number;
  /** estimatedArrivalAt + estimatedConsultMinutes, epoch ms. */
  estimatedDepartureAt: number;
  /** Travel time from the previous stop (or base point for the first stop), minutes. */
  travelFromPreviousMinutes: number;
  /** Straight-line-corrected distance from the previous stop (or base point), km. */
  distanceFromPreviousKm: number;
  /** Total buffer applied before this consult (consult buffer + travel + distance cushion), minutes. */
  bufferMinutes: number;
}

export interface DoctorConstraints {
  /** Minutes after midnight the doctor's day starts, e.g. 9*60. */
  workStartMinuteOfDay: number;
  /** Minutes after midnight the doctor's day ends, e.g. 18*60. */
  workEndMinuteOfDay: number;
  /** Hard cap on patients scheduled in a single day. */
  maxPatientsPerDay: number;
  /** Standard consult buffer applied to every stop, minutes (spec default: 10). */
  baseConsultMinutes: number;
  /** Distance threshold beyond which an extra cushion is applied, km (spec default: 5). */
  travelBufferThresholdKm: number;
  /** Extra cushion applied when distanceFromPreviousKm exceeds the threshold, minutes (spec default: 15). */
  travelBufferCushionMinutes: number;
  /** Assumed average road speed used by the default distance provider, km/h. */
  avgSpeedKmh: number;
  /** Doctor's starting location for the day (clinic, or home for a home-visit round). */
  basePoint: GeoPoint;
  /** The day being scheduled, midnight epoch ms — used to anchor arrival-time math. */
  dayStart: number;
}

export const DEFAULT_CONSTRAINTS: DoctorConstraints = {
  workStartMinuteOfDay: 9 * 60,
  workEndMinuteOfDay: 18 * 60,
  maxPatientsPerDay: 30,
  baseConsultMinutes: 10,
  travelBufferThresholdKm: 5,
  travelBufferCushionMinutes: 15,
  avgSpeedKmh: 25,
  basePoint: { lat: 0, lng: 0 },
  dayStart: 0,
};

export interface QueueResult {
  queue: QueueEntry[];
  /** Requests that could not be fit into the day (maxPatientsPerDay or workEndMinuteOfDay exceeded) — never silently dropped. */
  overflow: ConsultationRequest[];
}
