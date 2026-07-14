import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SorobanService } from '../common/soroban/soroban.service';

/**
 * IndexerService - Indexes on-chain invoices into PostgreSQL
 *
 * Responsibilities:
 * 1. Track last processed ledger (IndexerCursor)
 * 2. Poll or subscribe to Soroban RPC for contract events
 * 3. Mirror invoice state into Postgres
 * 4. Handle sync errors and retries
 */
@Injectable()
export class IndexerService implements OnModuleInit {
  private readonly logger = new Logger(IndexerService.name);
  private pollingInterval = 60000; // 60 seconds default
  private isRunning = false;

  constructor(
    private prisma: PrismaService,
    private soroban: SorobanService,
  ) {}

  async onModuleInit() {
    if (process.env.DISABLE_INDEXER === 'true') {
      this.logger.warn('Indexer disabled via DISABLE_INDEXER env var');
      return;
    }

    this.startIndexing();
  }

  private startIndexing() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.logger.log('✓ Starting invoice indexer...');
    this.pollForEvents();
  }

  private async pollForEvents() {
    // TODO: Replace with real Soroban RPC event subscription
    // For now, poll at intervals
    const pollInterval = setInterval(async () => {
      try {
        await this.syncLatestEvents();
      } catch (error) {
        this.logger.error('Error in indexer polling:', error);
      }
    }, this.pollingInterval);

    // Store interval ref for cleanup if needed
    (this as any).pollInterval = pollInterval;
  }

  async syncLatestEvents() {
    try {
      const cursor = await this.getIndexerCursor();
      const lastLedger = cursor?.lastProcessedLedger || 0;

      this.logger.debug(`Syncing from ledger ${lastLedger}`);

      // TODO: Fetch events from Soroban RPC starting at lastLedger
      // const events = await this.soroban.fetchContractEvents(lastLedger);
      // for (const event of events) {
      //   await this.processEvent(event);
      // }

      // Stub: just update cursor
      await this.updateIndexerCursor(lastLedger + 1);
    } catch (error) {
      this.logger.error('syncLatestEvents failed:', error);
    }
  }

  private async getIndexerCursor() {
    return this.prisma.indexerCursor.findFirst();
  }

  private async updateIndexerCursor(ledger: number, seq: number = 0) {
    return this.prisma.indexerCursor.upsert({
      where: { id: 1 },
      update: {
        lastProcessedLedger: ledger,
        lastProcessedSeq: seq,
      },
      create: {
        lastProcessedLedger: ledger,
        lastProcessedSeq: seq,
      },
    });
  }

  /**
   * Process a contract event (invoice created, payment received, etc.)
   * This will be called by the event subscription or polling loop
   */
  async processContractEvent(event: any) {
    this.logger.debug('Processing contract event:', event);

    // TODO: Parse event type and handle accordingly
    // - InvoiceCreated -> create Invoice record
    // - PaymentReceived -> update paidAmount, create Payment record
    // - InvoiceStatusChanged -> update status

    // Stub implementation
    if (event.type === 'invoice_created') {
      // await this.invoicesService.createInvoiceFromChain(event.contractId, event.data);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      pollingInterval: this.pollingInterval,
    };
  }
}
