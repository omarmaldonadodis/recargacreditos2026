// utils/dateUtils.js (CommonJS)
const { zonedTimeToUtc, utcToZonedTime } = require('date-fns-tz');

/**
 * Convierte una fecha (en formato "YYYY-MM-DD") a un objeto Date en UTC,
 * considerando el timezone.
 */
function parseDbDate(dateString, isStart, timeZone = 'America/Mexico_City') {
  const localTime = isStart ? `${dateString}T00:00:00` : `${dateString}T23:59:59.999`;
  return zonedTimeToUtc(localTime, timeZone);
}

function parseDbDate2(dateString, isStart, timeZone = 'America/Mexico_City') {
  const localTime = isStart ? `${dateString}T00:00:00` : `${dateString}T23:59:59.999`;
  return zonedTimeToUtc(localTime, timeZone);
}

function getWeekOfYear(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

module.exports = { parseDbDate,parseDbDate2, getWeekOfYear };
