export interface CityData {
  name: string;
  slug: string;
  descriptionSnippet: string; // used in meta descriptions
}

export interface StateData {
  name: string;
  abbr: string;
  slug: string;
  heroLede: string;
  metaDescription: string;
  heroImageUrl?: string;
  cities: CityData[];
}

export const GEO_STATES: Record<string, StateData> = {
  texas: {
    name: "Texas",
    abbr: "TX",
    slug: "texas",
    heroImageUrl: "https://images.pexels.com/photos/20185085/pexels-photo-20185085.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    heroLede:
      "Spinora is available to players across Texas — from Houston and Dallas to San Antonio and Austin. Play Fire Kirin, Juwa, Orion Stars, Game Vault and 8 more sweepstakes fish table games online. 50% welcome bonus on every title.",
    metaDescription:
      "Play Fire Kirin, Juwa, Orion Stars, Game Vault and 8 more sweepstakes fish table games online in Texas. 50% welcome bonus. CashApp, Zelle & Crypto deposits. Instant accounts for players in Houston, Dallas, San Antonio, Austin and across TX.",
    cities: [
      { name: "Houston", slug: "houston", descriptionSnippet: "Houston's most popular sweepstakes fish table platform" },
      { name: "Dallas", slug: "dallas", descriptionSnippet: "Dallas players enjoy Fire Kirin, Juwa and 10 more games" },
      { name: "San Antonio", slug: "san-antonio", descriptionSnippet: "San Antonio sweepstakes gaming — account ready instantly" },
      { name: "Austin", slug: "austin", descriptionSnippet: "Austin players can access all 12 Spinora games" },
      { name: "Fort Worth", slug: "fort-worth", descriptionSnippet: "Fort Worth online fish table games with 50% welcome bonus" },
    ],
  },
  florida: {
    name: "Florida",
    abbr: "FL",
    slug: "florida",
    heroImageUrl: "https://images.pexels.com/photos/30147234/pexels-photo-30147234.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    heroLede:
      "Spinora serves players across Florida — Miami, Orlando, Jacksonville, Tampa and beyond. Access all 12 fish table & sweepstakes games with a 50% welcome bonus. Instant accounts and wallet-funded credits.",
    metaDescription:
      "Play Fire Kirin, Juwa, Orion Stars and 9 more sweepstakes fish table games online in Florida. 50% welcome bonus. CashApp, Zelle & Crypto. Instant accounts for players in Miami, Orlando, Jacksonville, Tampa and across FL.",
    cities: [
      { name: "Miami", slug: "miami", descriptionSnippet: "Miami players get 50% bonus on their first deposit" },
      { name: "Orlando", slug: "orlando", descriptionSnippet: "Orlando sweepstakes games — Fire Kirin, Juwa and more" },
      { name: "Jacksonville", slug: "jacksonville", descriptionSnippet: "Jacksonville fish table games available 7 days a week" },
      { name: "Tampa", slug: "tampa", descriptionSnippet: "Tampa online fish tables with fast Telegram support" },
    ],
  },
  georgia: {
    name: "Georgia",
    abbr: "GA",
    slug: "georgia",
    heroImageUrl: "https://images.pexels.com/photos/33133726/pexels-photo-33133726.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    heroLede:
      "Spinora is available to players across Georgia including Atlanta, Augusta, Savannah and Columbus. Play 12 premium sweepstakes fish table and slot games online. 50% welcome bonus, instant account setup.",
    metaDescription:
      "Play Fire Kirin, Juwa, Orion Stars and more sweepstakes fish table games online in Georgia. 50% welcome bonus for players in Atlanta, Augusta, Savannah and across GA. Instant account setup.",
    cities: [
      { name: "Atlanta", slug: "atlanta", descriptionSnippet: "Atlanta's #1 sweepstakes fish table gaming platform" },
      { name: "Augusta", slug: "augusta", descriptionSnippet: "Augusta players access Fire Kirin, Juwa and 10 more games" },
      { name: "Savannah", slug: "savannah", descriptionSnippet: "Savannah online sweepstakes gaming — 50% welcome bonus" },
      { name: "Columbus", slug: "columbus-ga", descriptionSnippet: "Columbus GA sweepstakes games with fast account setup" },
    ],
  },
  california: {
    name: "California",
    abbr: "CA",
    slug: "california",
    heroImageUrl: "https://images.pexels.com/photos/29536601/pexels-photo-29536601.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    heroLede:
      "Spinora serves players across California — Los Angeles, San Diego, Sacramento, Fresno and beyond. All 12 sweepstakes fish table games available online with a 50% first deposit welcome bonus.",
    metaDescription:
      "Play Fire Kirin, Juwa, Orion Stars and 9 more sweepstakes games online in California. 50% welcome bonus. CashApp, Zelle & Crypto deposits. Instant accounts for players in Los Angeles, San Diego, Sacramento and across CA.",
    cities: [
      { name: "Los Angeles", slug: "los-angeles", descriptionSnippet: "LA players get Fire Kirin, Juwa and 10 more games online" },
      { name: "San Diego", slug: "san-diego", descriptionSnippet: "San Diego sweepstakes gaming with 50% welcome bonus" },
      { name: "Sacramento", slug: "sacramento", descriptionSnippet: "Sacramento online fish table games — account ready instantly" },
      { name: "Fresno", slug: "fresno", descriptionSnippet: "Fresno players access all 12 Spinora sweepstakes games" },
    ],
  },
  "north-carolina": {
    name: "North Carolina",
    abbr: "NC",
    slug: "north-carolina",
    heroImageUrl: "https://images.pexels.com/photos/18931263/pexels-photo-18931263.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    heroLede:
      "Spinora is available to players across North Carolina including Charlotte, Raleigh and Greensboro. Play Fire Kirin, Juwa, Orion Stars and 9 more sweepstakes games online with a 50% welcome bonus.",
    metaDescription:
      "Play Fire Kirin, Juwa, Orion Stars and sweepstakes fish table games online in North Carolina. 50% welcome bonus for players in Charlotte, Raleigh, Greensboro and across NC. Instant account setup.",
    cities: [
      { name: "Charlotte", slug: "charlotte", descriptionSnippet: "Charlotte's leading online sweepstakes fish table platform" },
      { name: "Raleigh", slug: "raleigh", descriptionSnippet: "Raleigh players enjoy Fire Kirin, Juwa and 10 more games" },
      { name: "Greensboro", slug: "greensboro", descriptionSnippet: "Greensboro online sweepstakes gaming — 50% welcome bonus" },
    ],
  },
  ohio: {
    name: "Ohio",
    abbr: "OH",
    slug: "ohio",
    heroImageUrl: "https://images.pexels.com/photos/18353982/pexels-photo-18353982.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    heroLede:
      "Spinora serves players across Ohio — Columbus, Cleveland, Cincinnati and beyond. All 12 sweepstakes fish table and slot games available online. 50% welcome bonus and instant account setup.",
    metaDescription:
      "Play Fire Kirin, Juwa, Orion Stars and sweepstakes games online in Ohio. 50% welcome bonus for players in Columbus, Cleveland, Cincinnati and across OH. CashApp, Zelle & Crypto deposits.",
    cities: [
      { name: "Columbus", slug: "columbus-oh", descriptionSnippet: "Columbus OH sweepstakes gaming with 50% welcome bonus" },
      { name: "Cleveland", slug: "cleveland", descriptionSnippet: "Cleveland online fish table games — Fire Kirin, Juwa and more" },
      { name: "Cincinnati", slug: "cincinnati", descriptionSnippet: "Cincinnati players access all 12 Spinora games online" },
    ],
  },
  michigan: {
    name: "Michigan",
    abbr: "MI",
    slug: "michigan",
    heroImageUrl: "https://images.pexels.com/photos/12950494/pexels-photo-12950494.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    heroLede:
      "Spinora is available to players across Michigan — Detroit, Grand Rapids and beyond. Play all 12 sweepstakes fish table and slot games online. 50% welcome bonus applied automatically to every new account.",
    metaDescription:
      "Play Fire Kirin, Juwa, Orion Stars and 9 more sweepstakes games online in Michigan. 50% welcome bonus for players in Detroit, Grand Rapids and across MI. Instant account setup.",
    cities: [
      { name: "Detroit", slug: "detroit", descriptionSnippet: "Detroit's top online sweepstakes fish table gaming platform" },
      { name: "Grand Rapids", slug: "grand-rapids", descriptionSnippet: "Grand Rapids players enjoy Fire Kirin, Juwa and 10 more games" },
    ],
  },
} as const;

export type StateSlug = keyof typeof GEO_STATES;

export function getStateData(stateSlug: string): StateData | null {
  return (GEO_STATES as Record<string, StateData>)[stateSlug] ?? null;
}

export function getCityData(stateSlug: string, citySlug: string): CityData | null {
  const state = getStateData(stateSlug);
  if (!state) return null;
  return state.cities.find((c) => c.slug === citySlug) ?? null;
}

export function allStateSlugs(): string[] {
  return Object.keys(GEO_STATES);
}

export function allCityParams(): { state: string; city: string }[] {
  return Object.entries(GEO_STATES).flatMap(([stateSlug, stateData]) =>
    stateData.cities.map((city) => ({ state: stateSlug, city: city.slug }))
  );
}
