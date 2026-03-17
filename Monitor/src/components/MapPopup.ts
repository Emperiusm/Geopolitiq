import type { ConflictZone, Hotspot, MilitaryBase, StrategicWaterway, APTGroup, NuclearFacility, EconomicCenter, GammaIrradiator, Pipeline, UnderseaCable, CableAdvisory, RepairShip, InternetOutage, AIDataCenter, AisDisruptionEvent, SocialUnrestEvent, MilitaryFlight, MilitaryVessel, MilitaryFlightCluster, MilitaryVesselCluster, NaturalEvent, Port, Spaceport, CriticalMineralProject, CyberThreat } from '@/types';
import type { AirportDelayAlert, PositionSample } from '@/services/aviation';
import type { Earthquake } from '@/services/earthquakes';
import type { WeatherAlert } from '@/services/weather';
import type { StartupHub, Accelerator, TechHQ, CloudRegion } from '@/config/tech-geo';
import { isMobileDevice } from '@/utils';
import { t } from '@/services/i18n';

// Re-export types from the types module so existing consumers still work
export type { PopupType } from './map-popup-types';
export type {
  TechEventPopupData,
  TechHQClusterData,
  TechEventClusterData,
  GpsJammingPopupData,
  IranEventPopupData,
  StockExchangePopupData,
  FinancialCenterPopupData,
  CentralBankPopupData,
  CommodityHubPopupData,
  ProtestClusterData,
  DatacenterClusterData,
  PopupData,
} from './map-popup-types';

import type {
  PopupData,
  TechEventPopupData,
  TechHQClusterData,
  TechEventClusterData,
  GpsJammingPopupData,
  IranEventPopupData,
  StockExchangePopupData,
  FinancialCenterPopupData,
  CentralBankPopupData,
  CommodityHubPopupData,
  ProtestClusterData,
  DatacenterClusterData,
} from './map-popup-types';

// Import render functions from extracted modules
import {
  renderConflictPopup,
  renderHotspotPopup,
  loadHotspotGdeltContext,
  renderAPTPopup,
  renderCyberThreatPopup,
  renderProtestPopup,
  renderProtestClusterPopup,
  renderIranEventPopup,
  renderGpsJammingPopup,
} from './map-popup-security';

import {
  renderBasePopup,
  renderMilitaryFlightPopup,
  renderMilitaryVesselPopup,
  renderMilitaryFlightClusterPopup,
  renderMilitaryVesselClusterPopup,
} from './map-popup-military';

import {
  renderWaterwayPopup,
  renderNuclearPopup,
  renderIrradiatorPopup,
  renderPipelinePopup,
  renderCablePopup,
  renderCableAdvisoryPopup,
  renderRepairShipPopup,
  renderOutagePopup,
  renderDatacenterPopup,
  renderDatacenterClusterPopup,
  renderNaturalEventPopup,
} from './map-popup-infrastructure';

import {
  renderEconomicPopup,
  renderStockExchangePopup,
  renderFinancialCenterPopup,
  renderCentralBankPopup,
  renderCommodityHubPopup,
  renderPortPopup,
  renderSpaceportPopup,
  renderMineralPopup,
} from './map-popup-economy';

import {
  renderStartupHubPopup,
  renderCloudRegionPopup,
  renderTechHQPopup,
  renderAcceleratorPopup,
  renderTechEventPopup,
  renderTechHQClusterPopup,
  renderTechEventClusterPopup,
} from './map-popup-tech';

import {
  renderEarthquakePopup,
  renderWeatherPopup,
  renderAisPopup,
  renderFlightPopup,
  renderAircraftPopup,
} from './map-popup-transport';

export class MapPopup {
  private container: HTMLElement;
  private popup: HTMLElement | null = null;
  private onClose?: () => void;
  private cableAdvisories: CableAdvisory[] = [];
  private repairShips: RepairShip[] = [];
  private isMobileSheet = false;
  private sheetTouchStartY: number | null = null;
  private sheetCurrentOffset = 0;
  private readonly mobileDismissThreshold = 96;
  private outsideListenerTimeoutId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public show(data: PopupData): void {
    this.hide();

    this.isMobileSheet = isMobileDevice();
    this.popup = document.createElement('div');
    this.popup.className = this.isMobileSheet ? 'map-popup map-popup-sheet' : 'map-popup';

    const content = this.renderContent(data);
    this.popup.innerHTML = this.isMobileSheet
      ? `<button class="map-popup-sheet-handle" aria-label="${t('common.close')}"></button>${content}`
      : content;

    // Get container's viewport position for absolute positioning
    const containerRect = this.container.getBoundingClientRect();

    if (this.isMobileSheet) {
      this.popup.style.left = '';
      this.popup.style.top = '';
      this.popup.style.transform = '';
    } else {
      this.positionDesktopPopup(data, containerRect);
    }

    // Append to body to avoid container overflow clipping
    document.body.appendChild(this.popup);

    // Close button handler via event delegation on the popup element.
    // This avoids re-querying and re-attaching listeners after innerHTML.
    this.popup.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.popup-close') || target.closest('.map-popup-sheet-handle')) {
        this.hide();
        return;
      }
      const toggle = target.closest('.cluster-toggle') as HTMLButtonElement | null;
      if (toggle) {
        const hidden = toggle.previousElementSibling as HTMLElement | null;
        if (!hidden) return;
        const expanded = hidden.style.display !== 'none';
        hidden.style.display = expanded ? 'none' : '';
        toggle.textContent = expanded ? (toggle.dataset.more ?? '') : (toggle.dataset.less ?? '');
      }
    });

    if (this.isMobileSheet) {
      this.popup.addEventListener('touchstart', this.handleSheetTouchStart, { passive: true });
      this.popup.addEventListener('touchmove', this.handleSheetTouchMove, { passive: false });
      this.popup.addEventListener('touchend', this.handleSheetTouchEnd);
      this.popup.addEventListener('touchcancel', this.handleSheetTouchEnd);
      requestAnimationFrame(() => {
        if (!this.popup) return;
        this.popup.classList.add('open');
        // Remove will-change after slide-in transition to free GPU memory
        this.popup.addEventListener('transitionend', () => {
          if (this.popup) this.popup.style.willChange = 'auto';
        }, { once: true });
      });
    }

    // Click outside to close
    if (this.outsideListenerTimeoutId !== null) {
      window.clearTimeout(this.outsideListenerTimeoutId);
    }
    this.outsideListenerTimeoutId = window.setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
      document.addEventListener('touchstart', this.handleOutsideClick);
      document.addEventListener('keydown', this.handleEscapeKey);
      this.outsideListenerTimeoutId = null;
    }, 0);
  }

  private positionDesktopPopup(data: PopupData, containerRect: DOMRect): void {
    if (!this.popup) return;

    const popupWidth = 380;
    const bottomBuffer = 50; // Buffer from viewport bottom
    const topBuffer = 60; // Header height

    // Temporarily append popup off-screen to measure actual height
    this.popup.style.visibility = 'hidden';
    this.popup.style.top = '0';
    this.popup.style.left = '-9999px';
    document.body.appendChild(this.popup);
    const popupHeight = this.popup.offsetHeight;
    document.body.removeChild(this.popup);
    this.popup.style.visibility = '';

    // Convert container-relative coords to viewport coords
    const viewportX = containerRect.left + data.x;
    const viewportY = containerRect.top + data.y;

    // Horizontal positioning (viewport-relative)
    const maxX = window.innerWidth - popupWidth - 20;
    let left = viewportX + 20;
    if (left > maxX) {
      // Position to the left of click if it would overflow right
      left = Math.max(10, viewportX - popupWidth - 20);
    }

    // Vertical positioning - prefer below click, but flip above if needed
    const availableBelow = window.innerHeight - viewportY - bottomBuffer;
    const availableAbove = viewportY - topBuffer;

    let top: number;
    if (availableBelow >= popupHeight) {
      // Enough space below - position below click
      top = viewportY + 10;
    } else if (availableAbove >= popupHeight) {
      // Not enough below, but enough above - position above click
      top = viewportY - popupHeight - 10;
    } else {
      // Limited space both ways - position at top buffer
      top = topBuffer;
    }

    // CRITICAL: Ensure popup stays within viewport vertically
    top = Math.max(topBuffer, top);
    const maxTop = window.innerHeight - popupHeight - bottomBuffer;
    if (maxTop > topBuffer) {
      top = Math.min(top, maxTop);
    }

    this.popup.style.left = `${left}px`;
    this.popup.style.top = `${top}px`;
  }

  private handleOutsideClick = (e: Event) => {
    if (this.popup && !this.popup.contains(e.target as Node)) {
      this.hide();
    }
  };

  private handleEscapeKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.hide();
    }
  };

  private handleSheetTouchStart = (e: TouchEvent): void => {
    if (!this.popup || !this.isMobileSheet || e.touches.length !== 1) return;

    const target = e.target as HTMLElement | null;
    const popupBody = this.popup.querySelector('.popup-body');
    if (target?.closest('.popup-body') && popupBody && popupBody.scrollTop > 0) {
      this.sheetTouchStartY = null;
      return;
    }

    this.sheetTouchStartY = e.touches[0]?.clientY ?? null;
    this.sheetCurrentOffset = 0;
    this.popup.classList.add('dragging');
  };

  private handleSheetTouchMove = (e: TouchEvent): void => {
    if (!this.popup || !this.isMobileSheet || this.sheetTouchStartY === null) return;

    const currentY = e.touches[0]?.clientY;
    if (currentY == null) return;

    const delta = Math.max(0, currentY - this.sheetTouchStartY);
    if (delta <= 0) return;

    this.sheetCurrentOffset = delta;
    this.popup.style.transform = `translate3d(0, ${delta}px, 0)`;
    e.preventDefault();
  };

  private handleSheetTouchEnd = (): void => {
    if (!this.popup || !this.isMobileSheet || this.sheetTouchStartY === null) return;

    const shouldDismiss = this.sheetCurrentOffset >= this.mobileDismissThreshold;
    this.popup.classList.remove('dragging');
    this.sheetTouchStartY = null;

    if (shouldDismiss) {
      this.hide();
      return;
    }

    this.sheetCurrentOffset = 0;
    this.popup.style.transform = '';
    this.popup.classList.add('open');
  };

  public hide(): void {
    if (this.outsideListenerTimeoutId !== null) {
      window.clearTimeout(this.outsideListenerTimeoutId);
      this.outsideListenerTimeoutId = null;
    }

    if (this.popup) {
      this.popup.removeEventListener('touchstart', this.handleSheetTouchStart);
      this.popup.removeEventListener('touchmove', this.handleSheetTouchMove);
      this.popup.removeEventListener('touchend', this.handleSheetTouchEnd);
      this.popup.removeEventListener('touchcancel', this.handleSheetTouchEnd);
      this.popup.remove();
      this.popup = null;
      this.isMobileSheet = false;
      this.sheetTouchStartY = null;
      this.sheetCurrentOffset = 0;
      document.removeEventListener('click', this.handleOutsideClick);
      document.removeEventListener('touchstart', this.handleOutsideClick);
      document.removeEventListener('keydown', this.handleEscapeKey);
      this.onClose?.();
    }
  }

  public setOnClose(callback: () => void): void {
    this.onClose = callback;
  }

  public setCableActivity(advisories: CableAdvisory[], repairShips: RepairShip[]): void {
    this.cableAdvisories = advisories;
    this.repairShips = repairShips;
  }

  public async loadHotspotGdeltContext(hotspot: Hotspot): Promise<void> {
    return loadHotspotGdeltContext(this.popup, hotspot);
  }

  private renderContent(data: PopupData): string {
    switch (data.type) {
      case 'conflict':
        return renderConflictPopup(data.data as ConflictZone);
      case 'hotspot':
        return renderHotspotPopup(data.data as Hotspot, data.relatedNews);
      case 'earthquake':
        return renderEarthquakePopup(data.data as Earthquake);
      case 'weather':
        return renderWeatherPopup(data.data as WeatherAlert);
      case 'base':
        return renderBasePopup(data.data as MilitaryBase);
      case 'waterway':
        return renderWaterwayPopup(data.data as StrategicWaterway);
      case 'apt':
        return renderAPTPopup(data.data as APTGroup);
      case 'cyberThreat':
        return renderCyberThreatPopup(data.data as CyberThreat);
      case 'nuclear':
        return renderNuclearPopup(data.data as NuclearFacility);
      case 'economic':
        return renderEconomicPopup(data.data as EconomicCenter);
      case 'irradiator':
        return renderIrradiatorPopup(data.data as GammaIrradiator);
      case 'pipeline':
        return renderPipelinePopup(data.data as Pipeline);
      case 'cable':
        return renderCablePopup(data.data as UnderseaCable, this.cableAdvisories, this.repairShips);
      case 'cable-advisory':
        return renderCableAdvisoryPopup(data.data as CableAdvisory);
      case 'repair-ship':
        return renderRepairShipPopup(data.data as RepairShip);
      case 'outage':
        return renderOutagePopup(data.data as InternetOutage);
      case 'datacenter':
        return renderDatacenterPopup(data.data as AIDataCenter);
      case 'datacenterCluster':
        return renderDatacenterClusterPopup(data.data as DatacenterClusterData);
      case 'ais':
        return renderAisPopup(data.data as AisDisruptionEvent);
      case 'protest':
        return renderProtestPopup(data.data as SocialUnrestEvent);
      case 'protestCluster':
        return renderProtestClusterPopup(data.data as ProtestClusterData);
      case 'flight':
        return renderFlightPopup(data.data as AirportDelayAlert);
      case 'aircraft':
        return renderAircraftPopup(data.data as PositionSample);
      case 'militaryFlight':
        return renderMilitaryFlightPopup(data.data as MilitaryFlight);
      case 'militaryVessel':
        return renderMilitaryVesselPopup(data.data as MilitaryVessel);
      case 'militaryFlightCluster':
        return renderMilitaryFlightClusterPopup(data.data as MilitaryFlightCluster);
      case 'militaryVesselCluster':
        return renderMilitaryVesselClusterPopup(data.data as MilitaryVesselCluster);
      case 'natEvent':
        return renderNaturalEventPopup(data.data as NaturalEvent);
      case 'port':
        return renderPortPopup(data.data as Port);
      case 'spaceport':
        return renderSpaceportPopup(data.data as Spaceport);
      case 'mineral':
        return renderMineralPopup(data.data as CriticalMineralProject);
      case 'startupHub':
        return renderStartupHubPopup(data.data as StartupHub);
      case 'cloudRegion':
        return renderCloudRegionPopup(data.data as CloudRegion);
      case 'techHQ':
        return renderTechHQPopup(data.data as TechHQ);
      case 'accelerator':
        return renderAcceleratorPopup(data.data as Accelerator);
      case 'techEvent':
        return renderTechEventPopup(data.data as TechEventPopupData);
      case 'techHQCluster':
        return renderTechHQClusterPopup(data.data as TechHQClusterData);
      case 'techEventCluster':
        return renderTechEventClusterPopup(data.data as TechEventClusterData);
      case 'stockExchange':
        return renderStockExchangePopup(data.data as StockExchangePopupData);
      case 'financialCenter':
        return renderFinancialCenterPopup(data.data as FinancialCenterPopupData);
      case 'centralBank':
        return renderCentralBankPopup(data.data as CentralBankPopupData);
      case 'commodityHub':
        return renderCommodityHubPopup(data.data as CommodityHubPopupData);
      case 'iranEvent':
        return renderIranEventPopup(data.data as IranEventPopupData);
      case 'gpsJamming':
        return renderGpsJammingPopup(data.data as GpsJammingPopupData);
      default:
        return '';
    }
  }
}
