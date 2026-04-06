export type RealmScreen = 'realm1' | 'realm2' | 'realm3' | 'realm4' | 'realm5'

// Keep this true for hackathon first-draft deployment.
// Switch to false when you want the full 5-realm experience.
export const PROTOTYPE_MODE = true

export const ACTIVE_REALM_SCREENS: RealmScreen[] = ['realm1', 'realm2', 'realm3', 'realm4', 'realm5']

export function isRealmEnabled(realm: RealmScreen): boolean {
  return !PROTOTYPE_MODE || ACTIVE_REALM_SCREENS.includes(realm)
}

export function getPlayableRealmCount(): number {
  return PROTOTYPE_MODE ? ACTIVE_REALM_SCREENS.length : 5
}
