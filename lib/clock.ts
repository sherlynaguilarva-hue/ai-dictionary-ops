/**
 * App clock. Normally real time; in the prototype a "demo clock" can jump
 * ahead (e.g. to 6 PM or tomorrow morning) so reminders can be tested
 * without waiting. Set from saved state by the StoreProvider.
 */
let simulated: string | null = null;

export function setSimulatedNow(iso: string | null) {
  simulated = iso;
}

export function isSimulated() {
  return simulated !== null;
}

export function now(): Date {
  return simulated ? new Date(simulated) : new Date();
}

export function nowISO(): string {
  return now().toISOString();
}
