import { SPECIALIST_CATALOG, SPECIALIST_IDS, SPECIALIST_ID_ALIASES } from './catalog'
import type { SpecialistDefinition, SpecialistId, SpecialistLookupId, SpecialistPolicy } from './types'

export class SpecialistManager {
  list(): SpecialistDefinition[] {
    return SPECIALIST_IDS.map(id => SPECIALIST_CATALOG[id])
  }

  get(id: string): SpecialistDefinition | null {
    const normalizedId = this.normalizeId(id)
    return normalizedId ? SPECIALIST_CATALOG[normalizedId] : null
  }

  getOrThrow(id: string): SpecialistDefinition {
    const specialist = this.get(id)
    if (!specialist) {
      throw new Error(`SPECIALIST_NOT_FOUND:${id}`)
    }
    return specialist
  }

  getBasePrompt(id: string): string | null {
    return this.get(id)?.basePrompt ?? null
  }

  getPolicies(id: string): SpecialistPolicy | null {
    return this.get(id)?.policies ?? null
  }

  normalizeId(id: string): SpecialistId | null {
    if (Object.prototype.hasOwnProperty.call(SPECIALIST_CATALOG, id)) {
      return id as SpecialistId
    }
    return SPECIALIST_ID_ALIASES[id] ?? null
  }

  isKnown(id: string): id is SpecialistLookupId {
    return this.normalizeId(id) !== null
  }
}

export const specialistManager = new SpecialistManager()
