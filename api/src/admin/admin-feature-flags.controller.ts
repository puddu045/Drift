import { Body, Controller, Delete, Get, HttpCode, Param, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { AuthorizationGuard, Can } from '@nestjs/authorization';

import type { AuthenticatedUser } from '../auth/current-user.js';
import { AdminPolicy } from './admin.policy.js';
import type { SetFeatureFlag } from './admin.schemas.js';
import { featureFlagKeyParamSchema, setFeatureFlagSchema } from './admin.schemas.js';
import { AdminFeatureFlagsService } from './admin-feature-flags.service.js';

@Controller('admin/feature-flags')
@UseGuards(AuthorizationGuard)
@Can(AdminPolicy, 'manage')
export class AdminFeatureFlagsController {
  constructor(private readonly flags: AdminFeatureFlagsService) {}

  @Get()
  list() {
    return this.flags.list();
  }

  @Put(':key')
  set(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('key', { schema: featureFlagKeyParamSchema }) key: string,
    @Body({ schema: setFeatureFlagSchema }) body: SetFeatureFlag,
  ) {
    return this.flags.set(admin.id, key, body);
  }

  @Delete(':key')
  @HttpCode(204)
  async delete(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('key', { schema: featureFlagKeyParamSchema }) key: string,
  ) {
    await this.flags.delete(admin.id, key);
  }
}
