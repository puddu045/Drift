import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthorizationGuard, Can } from '@nestjs/authorization';

import { AdminPolicy } from './admin.policy.js';
import type { ListAuditLogQuery } from './admin.schemas.js';
import { listAuditLogQuerySchema } from './admin.schemas.js';
import { AdminAuditLogService } from './admin-audit-log.service.js';

@Controller('admin/audit-log')
@UseGuards(AuthorizationGuard)
@Can(AdminPolicy, 'manage')
export class AdminAuditLogController {
  constructor(private readonly auditLog: AdminAuditLogService) {}

  @Get()
  list(@Query({ schema: listAuditLogQuerySchema }) query: ListAuditLogQuery) {
    return this.auditLog.list(query);
  }
}
