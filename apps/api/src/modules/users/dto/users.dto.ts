import { z } from 'zod';

import { createZodDto } from '../../../common/validation/zod-dto.js';

export const localeSchema = z.enum(['tr', 'en']);
export const stylePreferenceSchema = z.enum(['women', 'men', 'all']);

export const notificationPreferencesSchema = z.object({
  dailyOutfit: z.boolean(),
  wishlistReview: z.boolean(),
  cleanupReminder: z.boolean(),
  dailyOutfitHour: z.number().int().min(0).max(23),
});

export const meSchema = z.object({
  id: z.uuid(),
  email: z.string().nullable(),
  emailVerified: z.boolean(),
  displayName: z.string().nullable(),
  locale: localeSchema,
  city: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  timezone: z.string(),
  stylePreference: stylePreferenceSchema,
  onboardingCompleted: z.boolean(),
  notificationPreferences: notificationPreferencesSchema,
  role: z.enum(['user', 'admin']),
  /** Yürürlükteki metin sürümlerine göre eksik olan rızalar. */
  pendingConsents: z.array(z.enum(['privacy_notice', 'terms', 'explicit_consent'])),
  createdAt: z.iso.datetime(),
});
export class MeDto extends createZodDto('Me', meSchema) {}

export const updateMeSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80).nullish(),
    locale: localeSchema.optional(),
    city: z.string().trim().max(120).nullish(),
    // Hava durumu için; koordinat sunucuda yuvarlanarak cache anahtarı olur.
    latitude: z.number().min(-90).max(90).nullish(),
    longitude: z.number().min(-180).max(180).nullish(),
    timezone: z.string().max(64).optional(),
    stylePreference: stylePreferenceSchema.optional(),
    notificationPreferences: notificationPreferencesSchema.partial().optional(),
    onboardingCompleted: z.literal(true).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'En az bir alan gönderilmeli' })
  .refine(
    (value) =>
      (value.latitude === undefined || value.latitude === null) ===
      (value.longitude === undefined || value.longitude === null),
    { message: 'latitude ve longitude birlikte gönderilmeli' },
  );
export class UpdateMeDto extends createZodDto('UpdateMeInput', updateMeSchema) {}

export const registerDeviceSchema = z.object({
  pushToken: z.string().min(8).max(255),
  platform: z.enum(['ios', 'android']),
  locale: localeSchema.optional(),
  timezone: z.string().max(64).optional(),
  appVersion: z.string().max(32).optional(),
});
export class RegisterDeviceDto extends createZodDto('RegisterDeviceInput', registerDeviceSchema) {}

export const deviceSchema = z.object({
  id: z.uuid(),
  platform: z.enum(['ios', 'android']),
  appVersion: z.string().nullable(),
  lastSeenAt: z.iso.datetime(),
});
export class DeviceDto extends createZodDto('Device', deviceSchema) {}

export const recordConsentSchema = z.object({
  kind: z.enum(['privacy_notice', 'terms', 'explicit_consent']),
  version: z.string().min(1).max(32),
  locale: localeSchema,
});
export class RecordConsentDto extends createZodDto('RecordConsentInput', recordConsentSchema) {}

export const consentSchema = z.object({
  kind: z.enum(['privacy_notice', 'terms', 'explicit_consent']),
  version: z.string(),
  locale: localeSchema,
  acceptedAt: z.iso.datetime(),
  withdrawnAt: z.iso.datetime().nullable(),
});
export class ConsentDto extends createZodDto('Consent', consentSchema) {}

export const dataExportJobSchema = z.object({
  id: z.uuid(),
  status: z.enum(['pending', 'processing', 'ready', 'failed']),
  /** Yalnızca `ready` durumunda ve süresi dolmadıysa dolu. */
  downloadUrl: z.string().nullable(),
  expiresAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export class DataExportJobDto extends createZodDto('DataExportJob', dataExportJobSchema) {}

export const acceptedJobSchema = z.object({
  accepted: z.literal(true),
  jobId: z.uuid().nullable(),
});
export class AcceptedJobDto extends createZodDto('AcceptedJob', acceptedJobSchema) {}
