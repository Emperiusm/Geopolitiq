// Day/Night and solar elevation calculator
export function getSolarPosition(date: Date, lat: number, lng: number) {
  // Simplified solar elevation logic
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const daysInYear = 365.25;
  const start = new Date(date.getUTCFullYear(), 0, 0);
  const diff = Number(date) - Number(start);
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * (Math.PI / 180));
  const timeOffset = (lng / 15);
  const localSolarTime = hour + timeOffset;
  const hourAngle = 15 * (localSolarTime - 12);

  const latRad = lat * (Math.PI / 180);
  const decRad = declination * (Math.PI / 180);
  const haRad = hourAngle * (Math.PI / 180);

  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const altitude = Math.asin(sinAlt) * (180 / Math.PI);

  return altitude;
}

export function getDayNightState(lat: number, lng: number): 'day' | 'twilight' | 'night' {
  const altitude = getSolarPosition(new Date(), lat, lng);
  if (altitude > 0) return 'day';
  if (altitude > -18) return 'twilight';
  return 'night';
}
