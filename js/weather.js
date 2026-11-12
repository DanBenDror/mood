// Current weather for roughly where you are. Coordinates are rounded to one
// decimal (about 10 km) before they leave the phone. Never blocks an entry.
export function fetchWeather() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const lat = pos.coords.latitude.toFixed(1);
        const lon = pos.coords.longitude.toFixed(1);
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          '&current=temperature_2m,apparent_temperature,weather_code,cloud_cover,precipitation,wind_speed_10m,is_day';
        const c = (await (await fetch(url)).json()).current;
        resolve({
          lat: +lat, lon: +lon, temp_c: c.temperature_2m, feels_c: c.apparent_temperature,
          code: c.weather_code, cloud_pct: c.cloud_cover, precip_mm: c.precipitation,
          wind_kmh: c.wind_speed_10m, is_day: c.is_day,
        });
      } catch { resolve(null); }
    }, () => resolve(null), { timeout: 8000, maximumAge: 600000 });
  });
}
