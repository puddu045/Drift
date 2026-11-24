import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@nestjs/authorization';

import { AdminAuditLogController } from './admin-audit-log.controller.js';
import { AdminAuditLogService } from './admin-audit-log.service.js';
import { AdminFeatureFlagsController } from './admin-feature-flags.controller.js';
import { AdminFeatureFlagsService } from './admin-feature-flags.service.js';
import { AdminReportsController } from './admin-reports.controller.js';
import { AdminReportsService } from './admin-reports.service.js';
import { AdminUsersController } from './admin-users.controller.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminPolicy } from './admin.policy.js';

// `globalGuard: false` is deliberate: this is the ONLY module that imports
// AuthorizationModule, and importing it with its default global guard would
// start denying every route in the entire app that lacks @Can()/@Can.Anyone()
// — dozens of existing, already-shipped endpoints. Scoping it to
// @UseGuards(AuthorizationGuard) on just the admin controllers above keeps
// every other route's behavior untouched.
@Module({
  imports: [AuthorizationModule.forRoot({ globalGuard: false })],
  controllers: [
    AdminUsersController,
    AdminReportsController,
    AdminAuditLogController,
    AdminFeatureFlagsController,
  ],
  providers: [AdminPolicy, AdminUsersService, AdminReportsService, AdminAuditLogService, AdminFeatureFlagsService],
})
export class AdminModule {}
