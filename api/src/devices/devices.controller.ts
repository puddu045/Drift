import { Body, Controller, Delete, HttpCode, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';

import type { AuthenticatedUser } from '../auth/current-user.js';
import { DevicesService } from './devices.service.js';
import type { RegisterDevice } from './devices.schemas.js';
import { registerDeviceSchema, tokenParamSchema } from './devices.schemas.js';

@Controller('device-tokens')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post()
  @HttpCode(200)
  register(@CurrentUser() user: AuthenticatedUser, @Body({ schema: registerDeviceSchema }) body: RegisterDevice) {
    return this.devices.register(user.id, body.token, body.platform);
  }

  @Delete(':token')
  @HttpCode(204)
  unregister(@CurrentUser() user: AuthenticatedUser, @Param('token', { schema: tokenParamSchema }) token: string) {
    return this.devices.unregister(user.id, token);
  }
}
