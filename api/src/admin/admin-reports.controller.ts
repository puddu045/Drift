import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { AuthorizationGuard, Can } from '@nestjs/authorization';

import type { AuthenticatedUser } from '../auth/current-user.js';
import { AdminPolicy } from './admin.policy.js';
import type { ListReportsQuery, ResolveReport } from './admin.schemas.js';
import { idParamSchema, listReportsQuerySchema, resolveReportSchema } from './admin.schemas.js';
import { AdminReportsService } from './admin-reports.service.js';

@Controller('admin/reports')
@UseGuards(AuthorizationGuard)
@Can(AdminPolicy, 'manage')
export class AdminReportsController {
  constructor(private readonly reports: AdminReportsService) {}

  @Get()
  list(@Query({ schema: listReportsQuerySchema }) query: ListReportsQuery) {
    return this.reports.list(query);
  }

  @Post(':reportId/resolve')
  @HttpCode(200)
  resolve(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('reportId', { schema: idParamSchema }) reportId: string,
    @Body({ schema: resolveReportSchema }) body: ResolveReport,
  ) {
    return this.reports.resolve(admin.id, reportId, body);
  }
}
