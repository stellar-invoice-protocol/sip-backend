import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  async listInvoices(@Query('address') address?: string, @Query('role') role?: string) {
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

  @Get('diagnostics/health')
  async getDiagnostics() {
    return this.invoicesService.getDiagnostics();
  }

  @Post(':id/verify')
  async verifyInvoiceAgainstChain(@Param('id') id: string) {
    return this.invoicesService.verifyInvoiceAgainstChain(id);
  }

  @Post('webhooks')
  async registerWebhook(
    @Body() dto: RegisterWebhookDto,
    @Req() req: any, // In real app you'd have auth to get issuerAddress
  ) {
    // For now we can take issuerAddress from query or body
    return this.invoicesService.registerWebhook({
      issuerAddress: req.query.issuerAddress || dto.issuerAddress, // adjust based on your auth
      ...dto,
    });
  }
}
