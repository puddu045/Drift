import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthorizationGuard, Can } from '@nestjs/authorization';

import { AdminPolicy } from './admin.policy.js';
import { AdminDashboardService } from './admin-dashboard.service.js';

@Controller('admin/dashboard')
@UseGuards(AuthorizationGuard)
@Can(AdminPolicy, 'manage')
export class AdminDashboardController {
  constructor(private readonly dashboard: AdminDashboardService) {}

  @Get()
  stats() {
    return this.dashboard.stats();
  }
}
