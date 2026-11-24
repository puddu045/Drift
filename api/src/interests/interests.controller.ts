import { Controller, Get } from '@nestjs/common';

import { InterestsService } from './interests.service.js';

@Controller('interests')
export class InterestsController {
  constructor(private readonly interests: InterestsService) {}

  @Get()
  listAll() {
    return this.interests.listAll();
  }
}
