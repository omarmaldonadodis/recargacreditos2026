// utils/weeklyAverage.js
const { startOfWeek, endOfWeek, subWeeks } = require('date-fns');

/**
 * Calcula el promedio semanal tomando en cuenta cada semana completa (lunes a domingo)
 * de un período de hasta "semanasMax" semanas. Si la tienda es nueva, se considerarán
 * todas las semanas (inclusive las sin datos, que se cuentan como 0) transcurridas desde
 * la creación, o se toma la semana actual si no se cumple una semana completa.
 *
 * @param {Array} recargas - Array de recargas que deben tener "fecha" y "valor"
 * @param {number} semanasMax - Máximo de semanas a considerar (por defecto 8)
 * @returns {number} El promedio semanal
 */
function calcularPromedioSemanal(recargas, semanasMax = 8) {
  if (!Array.isArray(recargas) || recargas.length === 0) return 0;

  // Convertir la fecha de cada recarga a objeto Date y asegurar que "valor" tenga un número
  const recargasConFecha = recargas
    .map(r => ({
      ...r,
      fecha: r.fecha ? new Date(r.fecha) : null,
      valor: r.valor != null ? r.valor : 0,
    }))
    .filter(r => r.fecha !== null);

  const hoy = new Date();
  const lunesActual = startOfWeek(hoy, { weekStartsOn: 1 });

  // Determinar la primera semana a partir de la recarga más antigua
  const earliestRecarga = recargasConFecha.reduce((prev, current) =>
    prev.fecha < current.fecha ? prev : current
  );
  const inicioSemanaPrimerMovimiento = startOfWeek(earliestRecarga.fecha, { weekStartsOn: 1 });
  
  // Calcular el número de semanas transcurridas desde esa fecha hasta hoy.
  const diffMillis = hoy - inicioSemanaPrimerMovimiento;
  const semanasTranscurridas = Math.ceil(diffMillis / (7 * 24 * 60 * 60 * 1000));
  
  // Se consideran el mínimo entre las semanas transcurridas y el máximo deseado.
  const totalSemanas = Math.min(semanasTranscurridas, semanasMax);

  let sumaSemanalTotal = 0;

  // Iterar desde la semana actual hasta "totalSemanas" semanas atrás,
  // contando todas, aunque algunas no tengan recargas (se consideran como 0).
  for (let i = 0; i < totalSemanas; i++) {
    const semanaInicio = subWeeks(lunesActual, i);
    const semanaFin = endOfWeek(semanaInicio, { weekStartsOn: 1 });
    
    // Filtrar todas las recargas que caen en la semana (si no hay, suma será 0)
    const recargasSemana = recargasConFecha.filter(r =>
      r.fecha >= semanaInicio && r.fecha <= semanaFin
    );
    const sumaSemana = recargasSemana.reduce((acum, r) => acum + r.valor, 0);
    sumaSemanalTotal += sumaSemana;
  }
  
  return sumaSemanalTotal / totalSemanas;
}

module.exports = { calcularPromedioSemanal };
