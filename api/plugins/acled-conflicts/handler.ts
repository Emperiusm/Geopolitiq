import type { PluginSourceHandler } from "../../src/types";

const ACLED_BASE = "https://acleddata.com/api/acled/read";

const EVENT_TYPE_MAP: Record<string, number> = {
  "Battles": 0,
  "Explosions/Remote violence": 1,
  "Violence against civilians": 2,
  "Protests": 3,
  "Riots": 4,
  "Strategic developments": 5,
};

// ACLED inter1 codes: numeric actor-type for actor1
// See https://acleddata.com/resources/general-guides/
const INTER1_MAP: Record<number, number> = {
  1: 0, // State Forces
  2: 1, // Rebel Groups
  3: 2, // Political Militias
  4: 3, // Identity Militias
  5: 4, // Rioters
  6: 5, // Protesters
  7: 6, // Civilians
  8: 7, // External/Other Forces
};

export default {
  async fetch(): Promise<any[]> {
    const email = process.env.ACLED_EMAIL;
    const key = process.env.ACLED_API_KEY;

    if (!email || !key) {
      console.warn("[acled-conflicts] ACLED_EMAIL and ACLED_API_KEY not set, skipping");
      return [];
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dateStr = sevenDaysAgo.toISOString().split("T")[0];
    const allEvents: any[] = [];
    let page = 1;
    const pageSize = 5000;

    while (true) {
      try {
        const params = new URLSearchParams({
          key,
          email,
          event_date: dateStr,
          event_date_where: ">=",
          limit: String(pageSize),
          page: String(page),
          fields: [
            "event_id_cnty", "event_date", "event_type", "sub_event_type",
            "actor1", "actor2", "inter1",
            "country", "iso",
            "latitude", "longitude",
            "fatalities", "notes",
            "source", "source_scale",
          ].join("|"),
        });

        const res = await fetch(
          `${ACLED_BASE}?${params}`,
          {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(15000),
          },
        );

        if (!res.ok) {
          console.error(`[acled-conflicts] API error: ${res.status}`);
          break;
        }

        const json = await res.json();
        const events = json.data ?? [];

        if (!events.length) break;

        for (const e of events) {
          const lat = Number(e.latitude);
          const lng = Number(e.longitude);
          if (isNaN(lat) || isNaN(lng)) continue;

          allEvents.push({
            _id: e.event_id_cnty,
            eventDate: new Date(e.event_date),
            eventType: e.event_type,
            subEventType: e.sub_event_type,
            actor1: e.actor1,
            actor2: e.actor2 || null,
            inter1: Number(e.inter1) || 0,
            country: e.country,
            countryISO: isoNumericToAlpha2(e.iso),
            lat,
            lng,
            location: {
              type: "Point" as const,
              coordinates: [lng, lat],
            },
            fatalities: Number(e.fatalities) || 0,
            notes: e.notes,
            source: e.source,
            sourceScale: e.source_scale,
          });
        }

        if (events.length < pageSize) break;
        page++;

        // Safety: max 5 pages = 25,000 events
        if (page > 5) break;
      } catch (err) {
        console.error(`[acled-conflicts] Fetch error page ${page}:`, err);
        break;
      }
    }

    console.log(`[acled-conflicts] Fetched ${allEvents.length} events from ${page} page(s)`);
    return allEvents;
  },

  encodeBinary(doc: any): number[] {
    return [
      doc.lng,
      doc.lat,
      EVENT_TYPE_MAP[doc.eventType] ?? 5,
      doc.fatalities,
      INTER1_MAP[doc.inter1] ?? 7,
      doc.eventDate instanceof Date ? doc.eventDate.getTime() / 1000 : 0,
    ];
  },
} satisfies PluginSourceHandler;

// ACLED uses ISO 3166-1 numeric codes (e.g., 364 for Iran).
// Gambit's plugin registry resolves ISO 3166-1 alpha-2 codes to country slugs.
function isoNumericToAlpha2(isoNumeric: string | number): string {
  const num = Number(isoNumeric);
  return ISO_NUMERIC_TO_ALPHA2[num] ?? "";
}

// Comprehensive ISO 3166-1 numeric → alpha-2 mapping
// Covers all countries ACLED reports on globally
const ISO_NUMERIC_TO_ALPHA2: Record<number, string> = {
  4: "AF",    // Afghanistan
  8: "AL",    // Albania
  12: "DZ",   // Algeria
  16: "AS",   // American Samoa
  20: "AD",   // Andorra
  24: "AO",   // Angola
  28: "AG",   // Antigua and Barbuda
  32: "AR",   // Argentina
  51: "AM",   // Armenia
  36: "AU",   // Australia
  40: "AT",   // Austria
  31: "AZ",   // Azerbaijan
  44: "BS",   // Bahamas
  48: "BH",   // Bahrain
  50: "BD",   // Bangladesh
  52: "BB",   // Barbados
  112: "BY",  // Belarus
  56: "BE",   // Belgium
  84: "BZ",   // Belize
  204: "BJ",  // Benin
  64: "BT",   // Bhutan
  68: "BO",   // Bolivia
  70: "BA",   // Bosnia and Herzegovina
  72: "BW",   // Botswana
  76: "BR",   // Brazil
  96: "BN",   // Brunei
  100: "BG",  // Bulgaria
  854: "BF",  // Burkina Faso
  108: "BI",  // Burundi
  132: "CV",  // Cape Verde
  116: "KH",  // Cambodia
  120: "CM",  // Cameroon
  124: "CA",  // Canada
  140: "CF",  // Central African Republic
  148: "TD",  // Chad
  152: "CL",  // Chile
  156: "CN",  // China
  170: "CO",  // Colombia
  174: "KM",  // Comoros
  178: "CG",  // Congo (Republic)
  180: "CD",  // Congo (DRC)
  188: "CR",  // Costa Rica
  384: "CI",  // Cote d'Ivoire
  191: "HR",  // Croatia
  192: "CU",  // Cuba
  196: "CY",  // Cyprus
  203: "CZ",  // Czech Republic
  208: "DK",  // Denmark
  262: "DJ",  // Djibouti
  212: "DM",  // Dominica
  214: "DO",  // Dominican Republic
  218: "EC",  // Ecuador
  818: "EG",  // Egypt
  222: "SV",  // El Salvador
  226: "GQ",  // Equatorial Guinea
  232: "ER",  // Eritrea
  233: "EE",  // Estonia
  748: "SZ",  // Eswatini
  231: "ET",  // Ethiopia
  242: "FJ",  // Fiji
  246: "FI",  // Finland
  250: "FR",  // France
  266: "GA",  // Gabon
  270: "GM",  // Gambia
  268: "GE",  // Georgia
  276: "DE",  // Germany
  288: "GH",  // Ghana
  300: "GR",  // Greece
  308: "GD",  // Grenada
  320: "GT",  // Guatemala
  324: "GN",  // Guinea
  624: "GW",  // Guinea-Bissau
  328: "GY",  // Guyana
  332: "HT",  // Haiti
  340: "HN",  // Honduras
  348: "HU",  // Hungary
  352: "IS",  // Iceland
  356: "IN",  // India
  360: "ID",  // Indonesia
  364: "IR",  // Iran
  368: "IQ",  // Iraq
  372: "IE",  // Ireland
  376: "IL",  // Israel
  380: "IT",  // Italy
  388: "JM",  // Jamaica
  392: "JP",  // Japan
  400: "JO",  // Jordan
  398: "KZ",  // Kazakhstan
  404: "KE",  // Kenya
  296: "KI",  // Kiribati
  408: "KP",  // North Korea
  410: "KR",  // South Korea
  414: "KW",  // Kuwait
  417: "KG",  // Kyrgyzstan
  418: "LA",  // Laos
  428: "LV",  // Latvia
  422: "LB",  // Lebanon
  426: "LS",  // Lesotho
  430: "LR",  // Liberia
  434: "LY",  // Libya
  438: "LI",  // Liechtenstein
  440: "LT",  // Lithuania
  442: "LU",  // Luxembourg
  450: "MG",  // Madagascar
  454: "MW",  // Malawi
  458: "MY",  // Malaysia
  462: "MV",  // Maldives
  466: "ML",  // Mali
  470: "MT",  // Malta
  478: "MR",  // Mauritania
  480: "MU",  // Mauritius
  484: "MX",  // Mexico
  498: "MD",  // Moldova
  496: "MN",  // Mongolia
  499: "ME",  // Montenegro
  504: "MA",  // Morocco
  508: "MZ",  // Mozambique
  104: "MM",  // Myanmar
  516: "NA",  // Namibia
  524: "NP",  // Nepal
  528: "NL",  // Netherlands
  540: "NC",  // New Caledonia
  554: "NZ",  // New Zealand
  558: "NI",  // Nicaragua
  562: "NE",  // Niger
  566: "NG",  // Nigeria
  578: "NO",  // Norway
  512: "OM",  // Oman
  586: "PK",  // Pakistan
  275: "PS",  // Palestine
  591: "PA",  // Panama
  598: "PG",  // Papua New Guinea
  600: "PY",  // Paraguay
  604: "PE",  // Peru
  608: "PH",  // Philippines
  616: "PL",  // Poland
  620: "PT",  // Portugal
  634: "QA",  // Qatar
  642: "RO",  // Romania
  643: "RU",  // Russia
  646: "RW",  // Rwanda
  882: "WS",  // Samoa
  678: "ST",  // Sao Tome and Principe
  682: "SA",  // Saudi Arabia
  686: "SN",  // Senegal
  688: "RS",  // Serbia
  694: "SL",  // Sierra Leone
  702: "SG",  // Singapore
  703: "SK",  // Slovakia
  705: "SI",  // Slovenia
  90: "SB",   // Solomon Islands
  706: "SO",  // Somalia
  710: "ZA",  // South Africa
  728: "SS",  // South Sudan
  724: "ES",  // Spain
  144: "LK",  // Sri Lanka
  729: "SD",  // Sudan
  740: "SR",  // Suriname
  752: "SE",  // Sweden
  756: "CH",  // Switzerland
  760: "SY",  // Syria
  158: "TW",  // Taiwan
  762: "TJ",  // Tajikistan
  834: "TZ",  // Tanzania
  764: "TH",  // Thailand
  626: "TL",  // Timor-Leste
  768: "TG",  // Togo
  776: "TO",  // Tonga
  780: "TT",  // Trinidad and Tobago
  788: "TN",  // Tunisia
  792: "TR",  // Turkey
  795: "TM",  // Turkmenistan
  800: "UG",  // Uganda
  804: "UA",  // Ukraine
  784: "AE",  // United Arab Emirates
  826: "GB",  // United Kingdom
  840: "US",  // United States
  858: "UY",  // Uruguay
  860: "UZ",  // Uzbekistan
  548: "VU",  // Vanuatu
  862: "VE",  // Venezuela
  704: "VN",  // Vietnam
  887: "YE",  // Yemen
  894: "ZM",  // Zambia
  716: "ZW",  // Zimbabwe
  900: "XK",  // Kosovo (user-assigned)
};
