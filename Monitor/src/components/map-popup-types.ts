import type { ConflictZone, Hotspot, NewsItem, MilitaryBase, StrategicWaterway, APTGroup, NuclearFacility, EconomicCenter, GammaIrradiator, Pipeline, UnderseaCable, CableAdvisory, RepairShip, InternetOutage, AIDataCenter, AisDisruptionEvent, SocialUnrestEvent, MilitaryFlight, MilitaryVessel, MilitaryFlightCluster, MilitaryVesselCluster, NaturalEvent, Port, Spaceport, CriticalMineralProject, CyberThreat } from '@/types';
import type { AirportDelayAlert, PositionSample } from '@/services/aviation';
import type { Earthquake } from '@/services/earthquakes';
import type { WeatherAlert } from '@/services/weather';
import type { StartupHub, Accelerator, TechHQ, CloudRegion } from '@/config/tech-geo';
import type { TechHubActivity } from '@/services/tech-activity';
import type { GeoHubActivity } from '@/services/geo-activity';

export type PopupType = 'conflict' | 'hotspot' | 'earthquake' | 'weather' | 'base' | 'waterway' | 'apt' | 'cyberThreat' | 'nuclear' | 'economic' | 'irradiator' | 'pipeline' | 'cable' | 'cable-advisory' | 'repair-ship' | 'outage' | 'datacenter' | 'datacenterCluster' | 'ais' | 'protest' | 'protestCluster' | 'flight' | 'aircraft' | 'militaryFlight' | 'militaryVessel' | 'militaryFlightCluster' | 'militaryVesselCluster' | 'natEvent' | 'port' | 'spaceport' | 'mineral' | 'startupHub' | 'cloudRegion' | 'techHQ' | 'accelerator' | 'techEvent' | 'techHQCluster' | 'techEventCluster' | 'techActivity' | 'geoActivity' | 'stockExchange' | 'financialCenter' | 'centralBank' | 'commodityHub' | 'iranEvent' | 'gpsJamming';

export interface TechEventPopupData {
  id: string;
  title: string;
  location: string;
  lat: number;
  lng: number;
  country: string;
  startDate: string;
  endDate: string;
  url: string | null;
  daysUntil: number;
}

export interface TechHQClusterData {
  items: TechHQ[];
  city: string;
  country: string;
  count?: number;
  faangCount?: number;
  unicornCount?: number;
  publicCount?: number;
  sampled?: boolean;
}

export interface TechEventClusterData {
  items: TechEventPopupData[];
  location: string;
  country: string;
  count?: number;
  soonCount?: number;
  sampled?: boolean;
}

export interface GpsJammingPopupData {
  h3: string;
  lat: number;
  lon: number;
  level: 'medium' | 'high';
  npAvg: number;
  sampleCount: number;
  aircraftCount: number;
}

export interface IranEventPopupData {
  id: string;
  title: string;
  category: string;
  sourceUrl: string;
  latitude: number;
  longitude: number;
  locationName: string;
  timestamp: string | number;
  severity: string;
  relatedEvents?: IranEventPopupData[];
}

// Finance popup data types
export interface StockExchangePopupData {
  id: string;
  name: string;
  shortName: string;
  city: string;
  country: string;
  tier: string;
  marketCap?: number;
  tradingHours?: string;
  timezone?: string;
  description?: string;
}

export interface FinancialCenterPopupData {
  id: string;
  name: string;
  city: string;
  country: string;
  type: string;
  gfciRank?: number;
  specialties?: string[];
  description?: string;
}

export interface CentralBankPopupData {
  id: string;
  name: string;
  shortName: string;
  city: string;
  country: string;
  type: string;
  currency?: string;
  description?: string;
}

export interface CommodityHubPopupData {
  id: string;
  name: string;
  city: string;
  country: string;
  type: string;
  commodities?: string[];
  description?: string;
}

export interface ProtestClusterData {
  items: SocialUnrestEvent[];
  country: string;
  count?: number;
  riotCount?: number;
  highSeverityCount?: number;
  verifiedCount?: number;
  totalFatalities?: number;
  sampled?: boolean;
}

export interface DatacenterClusterData {
  items: AIDataCenter[];
  region: string;
  country: string;
  count?: number;
  totalChips?: number;
  totalPowerMW?: number;
  existingCount?: number;
  plannedCount?: number;
  sampled?: boolean;
}

export interface PopupData {
  type: PopupType;
  data: ConflictZone | Hotspot | Earthquake | WeatherAlert | MilitaryBase | StrategicWaterway | APTGroup | CyberThreat | NuclearFacility | EconomicCenter | GammaIrradiator | Pipeline | UnderseaCable | CableAdvisory | RepairShip | InternetOutage | AIDataCenter | AisDisruptionEvent | SocialUnrestEvent | AirportDelayAlert | PositionSample | MilitaryFlight | MilitaryVessel | MilitaryFlightCluster | MilitaryVesselCluster | NaturalEvent | Port | Spaceport | CriticalMineralProject | StartupHub | CloudRegion | TechHQ | Accelerator | TechEventPopupData | TechHQClusterData | TechEventClusterData | ProtestClusterData | DatacenterClusterData | TechHubActivity | GeoHubActivity | StockExchangePopupData | FinancialCenterPopupData | CentralBankPopupData | CommodityHubPopupData | IranEventPopupData | GpsJammingPopupData;
  relatedNews?: NewsItem[];
  x: number;
  y: number;
}
