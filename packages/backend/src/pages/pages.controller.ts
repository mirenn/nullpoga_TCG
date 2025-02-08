import { Controller, Get } from '@nestjs/common';

@Controller()
export class PagesController {
  @Get()
  getRoot() {
    return { message: 'Welcome to Nullpoga TCG' };
  }
}