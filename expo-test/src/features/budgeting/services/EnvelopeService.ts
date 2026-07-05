import type { EnvelopeRepository } from "@/database/repositories";
import type {
  Envelope,
  EnvelopeChanges,
  NewEnvelope,
} from "@/database/repositories/types";
import {
  FINANCIAL_STATE_CHANGED,
  type FinancialEventBus,
} from "@/shared/events/financialEvents";

export class EnvelopeService {
  constructor(
    private readonly envelopeRepository: EnvelopeRepository,
    private readonly eventBus: FinancialEventBus
  ) {}

  async list(profileId: string): Promise<Envelope[]> {
    return this.envelopeRepository.findAll(profileId);
  }

  async create(input: NewEnvelope): Promise<Envelope> {
    const envelope = await this.envelopeRepository.create(input);
    this.eventBus.emit(FINANCIAL_STATE_CHANGED, input.profileId);

    return envelope;
  }

  async update(id: string, changes: EnvelopeChanges): Promise<Envelope> {
    const envelope = await this.envelopeRepository.update(id, changes);
    this.eventBus.emit(FINANCIAL_STATE_CHANGED, envelope.profileId);

    return envelope;
  }

  async softDelete(id: string): Promise<void> {
    const envelope = await this.envelopeRepository.findById(id);

    if (!envelope) {
      throw new Error(`Envelope ${id} not found.`);
    }

    await this.envelopeRepository.softDelete(id);
    this.eventBus.emit(FINANCIAL_STATE_CHANGED, envelope.profileId);
  }
}
