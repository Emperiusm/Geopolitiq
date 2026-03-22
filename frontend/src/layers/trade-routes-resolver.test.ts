import { describe, it, expect } from 'vitest';
import { resolveTradeArcs } from './trade-routes-resolver';

const ports = [
  { _id: 'shanghai', name: 'Shanghai', lat: 31.2, lng: 121.5, country: 'China' },
  { _id: 'rotterdam', name: 'Rotterdam', lat: 51.9, lng: 4.5, country: 'Netherlands' },
  { _id: 'singapore', name: 'Singapore', lat: 1.3, lng: 103.8, country: 'Singapore' },
];

const chokepoints = [
  { _id: 'malacca', name: 'Strait of Malacca', lat: 2.5, lng: 101.5, status: 'active' },
  { _id: 'suez', name: 'Suez Canal', lat: 30.5, lng: 32.3, status: 'disrupted' },
];

const tradeRoutes = [
  {
    _id: 'china-europe-suez',
    name: 'China\u2013Europe (Suez)',
    from: 'shanghai',
    to: 'rotterdam',
    category: 'container',
    status: 'active',
    volumeDesc: '20,000 TEU/day',
    waypoints: ['malacca', 'suez'],
  },
  {
    _id: 'disrupted-route',
    name: 'Disrupted Route',
    from: 'singapore',
    to: 'rotterdam',
    category: 'energy',
    status: 'disrupted',
    volumeDesc: '5M bbl/day',
    waypoints: [],
  },
  {
    _id: 'broken-port',
    name: 'Route with missing port',
    from: 'nonexistent-port',
    to: 'rotterdam',
    category: 'bulk',
    status: 'active',
    volumeDesc: '',
    waypoints: [],
  },
];

describe('resolveTradeArcs', () => {
  const { arcs, portList, waypointsByRoute } = resolveTradeArcs(tradeRoutes, ports, chokepoints);

  it('skips routes with unresolvable port IDs', () => {
    expect(arcs.length).toBe(2);
    expect(arcs.find(a => a.route._id === 'broken-port')).toBeUndefined();
  });

  it('remaps from/to \u2192 source/destination using port names', () => {
    const arc = arcs.find(a => a.route._id === 'china-europe-suez')!;
    expect(arc.route.source).toBe('Shanghai');
    expect(arc.route.destination).toBe('Rotterdam');
  });

  it('maps status:disrupted \u2192 disruptionRisk:high, active \u2192 low', () => {
    const active = arcs.find(a => a.route._id === 'china-europe-suez')!;
    const disrupted = arcs.find(a => a.route._id === 'disrupted-route')!;
    expect(active.route.disruptionRisk).toBe('low');
    expect(disrupted.route.disruptionRisk).toBe('high');
  });

  it('sets red color for disrupted routes, teal for active', () => {
    const active = arcs.find(a => a.route._id === 'china-europe-suez')!;
    const disrupted = arcs.find(a => a.route._id === 'disrupted-route')!;
    expect(active.color).toEqual([20, 184, 166, 180]);
    expect(disrupted.color).toEqual([255, 64, 88, 220]);
  });

  it('sets width by category', () => {
    const container = arcs.find(a => a.route.category === 'container')!;
    const energy = arcs.find(a => a.route.category === 'energy')!;
    expect(container.width).toBe(2.5);
    expect(energy.width).toBe(2.0);
  });

  it('stores fromPortId and toPortId as original _id strings', () => {
    const arc = arcs.find(a => a.route._id === 'china-europe-suez')!;
    expect(arc.fromPortId).toBe('shanghai');
    expect(arc.toPortId).toBe('rotterdam');
  });

  it('builds label as "name \u00b7 status \u00b7 volumeDesc"', () => {
    const arc = arcs.find(a => a.route._id === 'china-europe-suez')!;
    expect(arc.label).toBe('China\u2013Europe (Suez) \u00b7 active \u00b7 20,000 TEU/day');
  });

  it('builds portList with routeIds for each port that appears', () => {
    const shanghai = portList.find(p => p._id === 'shanghai')!;
    expect(shanghai.routeIds).toContain('china-europe-suez');
  });

  it('builds waypointsByRoute with matching chokepoint data', () => {
    const waypoints = waypointsByRoute.get('china-europe-suez')!;
    expect(waypoints.length).toBe(2);
    expect(waypoints[0]._id).toBe('malacca');
    expect(waypoints[1]._id).toBe('suez');
  });

  it('silently skips waypoint IDs with no matching chokepoint', () => {
    const routes = [{ ...tradeRoutes[0], waypoints: ['taiwan', 'suez'] }];
    const { waypointsByRoute: wpMap } = resolveTradeArcs(routes, ports, chokepoints);
    const wps = wpMap.get('china-europe-suez')!;
    expect(wps.length).toBe(1);
    expect(wps[0]._id).toBe('suez');
  });
});
