import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  async listInvoices(
    @Query('address') address?: string,
    @Query('role') role?: string,
  ) {
    return this.invoicesService.listInvoices(address, role);
  }

  @Get(':id')
  async getInvoiceDetail(@Param('id') id: string) {
    return this.invoicesService.getInvoiceDetail(id);
  }

  @Get(':id/public')
  async getPublicInvoiceData(@Param('id') id: string) {
    return this.invoicesService.getPublicInvoiceData(id);
  }

  @Post(':id/verify')
  async verifyInvoiceAgainstChain(@Param('id') id: string) {
    return this.invoicesService.verifyInvoiceAgainstChain(id);
  }
}
