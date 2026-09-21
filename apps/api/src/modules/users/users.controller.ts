import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';

import { AppConfig } from '../../common/config/app-config.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { ApiErrorResponse, ApiZodBody, ApiZodResponse } from '../../common/openapi/decorators.js';
import type { Consent, DataExportJob, Device } from '../../db/schema/account.js';
import type { User } from '../../db/schema/users.js';
import { CurrentUser } from '../auth/guards/current-user.decorator.js';
import {
  AcceptedJobDto,
  ConsentDto,
  DataExportJobDto,
  DeviceDto,
  MeDto,
  RecordConsentDto,
  RegisterDeviceDto,
  UpdateMeDto,
  type meSchema,
} from './dto/users.dto.js';
import { UsersService, type ConsentKind } from './users.service.js';

@ApiTags('me')
@ApiBearerAuth('bearer')
@Controller('me')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly config: AppConfig,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Profil' })
  @ApiZodResponse(200, MeDto)
  @ApiErrorResponse(401, [ErrorCode.UNAUTHORIZED, ErrorCode.TOKEN_EXPIRED])
  async me(@CurrentUser() user: User): Promise<MeResponse> {
    return presentUser(user, await this.usersService.pendingConsents(user.id));
  }

  @Patch()
  @ApiOperation({
    summary: 'Profili güncelle',
    description: 'Yalnızca gönderilen alanlar değişir. Onboarding geri alınamaz.',
  })
  @ApiZodBody(UpdateMeDto)
  @ApiZodResponse(200, MeDto)
  async update(@CurrentUser() user: User, @Body() body: UpdateMeDto): Promise<MeResponse> {
    const updated = await this.usersService.update(user, body);
    return presentUser(updated, await this.usersService.pendingConsents(updated.id));
  }

  @Delete()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Hesabı sil',
    description:
      'Hesap hemen `pending_deletion` işaretlenir ve tüm oturumlar düşer; asıl silme ' +
      '(görseller, abonelik kaydı, ilişkili satırlar) kuyrukta yapılır. GERİ ALINAMAZ.',
  })
  @ApiZodResponse(202, AcceptedJobDto)
  async remove(@CurrentUser() user: User): Promise<{ accepted: true; jobId: null }> {
    await this.usersService.requestDeletion(user);
    return { accepted: true, jobId: null };
  }

  @Post('export')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Veri dışa aktarma iste (KVKK)',
    description: 'Sürmekte olan bir iş varsa yenisi açılmaz, mevcut iş döner.',
  })
  @ApiZodResponse(202, DataExportJobDto)
  async requestExport(@CurrentUser() user: User): Promise<DataExportJobResponse> {
    return presentExport(await this.usersService.requestExport(user));
  }

  @Get('export/:jobId')
  @ApiOperation({ summary: 'Dışa aktarma işinin durumu' })
  @ApiZodResponse(200, DataExportJobDto)
  @ApiErrorResponse(404, [ErrorCode.NOT_FOUND])
  async exportStatus(
    @CurrentUser() user: User,
    @Param('jobId') jobId: string,
  ): Promise<DataExportJobResponse> {
    return presentExport(await this.usersService.getExportJob(user.id, jobId));
  }

  @Post('devices')
  @ApiOperation({
    summary: 'Push cihazı kaydet',
    description: 'Aynı push token başka bir hesapta kayıtlıysa bu kullanıcıya taşınır.',
  })
  @ApiZodBody(RegisterDeviceDto)
  @ApiZodResponse(201, DeviceDto)
  async registerDevice(
    @CurrentUser() user: User,
    @Body() body: RegisterDeviceDto,
  ): Promise<DeviceResponse> {
    return presentDevice(await this.usersService.registerDevice(user, body));
  }

  @Get('devices')
  @ApiOperation({ summary: 'Kayıtlı cihazlar' })
  @ApiZodResponse(200, DeviceDto, { isArray: true })
  async listDevices(@CurrentUser() user: User): Promise<DeviceResponse[]> {
    return (await this.usersService.listDevices(user.id)).map(presentDevice);
  }

  @Delete('devices/:deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cihaz kaydını sil' })
  @ApiErrorResponse(404, [ErrorCode.NOT_FOUND])
  async removeDevice(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
  ): Promise<void> {
    await this.usersService.removeDevice(user.id, deviceId);
  }

  @Post('consents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Rıza kaydet (KVKK)',
    description: 'Aynı sürüm ikinci kez gönderilirse ilk onay zamanı korunur. Kayıtlar silinmez.',
  })
  @ApiZodBody(RecordConsentDto)
  @ApiZodResponse(201, ConsentDto, { isArray: true })
  async recordConsent(
    @CurrentUser() user: User,
    @Body() body: RecordConsentDto,
    @Req() request: FastifyRequest,
  ): Promise<ConsentResponse[]> {
    await this.usersService.recordConsent(user, body, {
      ip: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    });
    return (await this.usersService.listConsents(user.id)).map(presentConsent);
  }

  @Get('consents')
  @ApiOperation({ summary: 'Rıza geçmişi' })
  @ApiZodResponse(200, ConsentDto, { isArray: true })
  async listConsents(@CurrentUser() user: User): Promise<ConsentResponse[]> {
    return (await this.usersService.listConsents(user.id)).map(presentConsent);
  }
}

type MeResponse = z.infer<typeof meSchema>;
type DeviceResponse = {
  id: string;
  platform: 'ios' | 'android';
  appVersion: string | null;
  lastSeenAt: string;
};
type ConsentResponse = {
  kind: ConsentKind;
  version: string;
  locale: 'tr' | 'en';
  acceptedAt: string;
  withdrawnAt: string | null;
};
type DataExportJobResponse = {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  downloadUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
};

function presentUser(user: User, pendingConsents: ConsentKind[]): MeResponse {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified !== null,
    displayName: user.displayName,
    locale: user.locale,
    city: user.city,
    latitude: user.latitude,
    longitude: user.longitude,
    timezone: user.timezone,
    stylePreference: user.stylePreference,
    onboardingCompleted: user.onboardingCompletedAt !== null,
    notificationPreferences: user.notificationPreferences,
    role: user.role,
    pendingConsents,
    createdAt: user.createdAt.toISOString(),
  };
}

function presentDevice(device: Device): DeviceResponse {
  return {
    id: device.id,
    platform: device.platform,
    appVersion: device.appVersion,
    lastSeenAt: device.lastSeenAt.toISOString(),
  };
}

function presentConsent(consent: Consent): ConsentResponse {
  return {
    kind: consent.kind,
    version: consent.version,
    locale: consent.locale,
    acceptedAt: consent.acceptedAt.toISOString(),
    withdrawnAt: consent.withdrawnAt?.toISOString() ?? null,
  };
}

function presentExport(job: DataExportJob): DataExportJobResponse {
  const expired = job.expiresAt !== null && job.expiresAt.getTime() <= Date.now();
  return {
    id: job.id,
    status: job.status,
    // İndirme linki Faz 3'te obje deposu geldiğinde imzalı URL olarak dolacak.
    downloadUrl: job.status === 'ready' && !expired && job.objectKey ? job.objectKey : null,
    expiresAt: job.expiresAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
  };
}
