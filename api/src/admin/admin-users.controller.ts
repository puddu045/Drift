import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { AuthorizationGuard, Can } from '@nestjs/authorization';

import type { AuthenticatedUser } from '../auth/current-user.js';
import { AdminPolicy } from './admin.policy.js';
import type { ListUsersQuery, SetUserStatus } from './admin.schemas.js';
import { idParamSchema, listUsersQuerySchema, setUserStatusSchema } from './admin.schemas.js';
import { AdminUsersService } from './admin-users.service.js';

@Controller('admin/users')
@UseGuards(AuthorizationGuard)
@Can(AdminPolicy, 'manage')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  list(@Query({ schema: listUsersQuerySchema }) query: ListUsersQuery) {
    return this.users.list(query);
  }

  @Get(':userId')
  get(@Param('userId', { schema: idParamSchema }) userId: string) {
    return this.users.get(userId);
  }

  @Patch(':userId/status')
  setStatus(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('userId', { schema: idParamSchema }) userId: string,
    @Body({ schema: setUserStatusSchema }) body: SetUserStatus,
  ) {
    return this.users.setStatus(admin.id, userId, body);
  }
}
