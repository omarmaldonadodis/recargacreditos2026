// front/src/hooks/useIncrementosNotificaciones.js - VERSIÓN MEJORADA
import { useState, useEffect, useCallback } from 'react';
import api from '../services/axiosConfig';

const useIncrementosNotificaciones = (enabled = true, pollingInterval = 30000) => {
  const [notificacionesGeneral, setNotificacionesGeneral] = useState(0);
  const [notificacionesMovistar, setNotificacionesMovistar] = useState(0);
  const [alertasGeneral, setAlertasGeneral] = useState(0);
  const [alertasMovistar, setAlertasMovistar] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarNotificaciones = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      // Obtener incrementos pendientes
      const [responseGeneral, responseMovistar, responseAlertas] = await Promise.all([
        api.get('/incrementos/notificaciones', { params: { proveedor: 'general' } }),
        api.get('/incrementos/notificaciones', { params: { proveedor: 'movistar' } }),
        api.get('/alertas/')
      ]);

      const conteoGeneral = responseGeneral.data.conteo || 0;
      const conteoMovistar = responseMovistar.data.conteo || 0;

      setNotificacionesGeneral(conteoGeneral);
      setNotificacionesMovistar(conteoMovistar);

      // Contar alertas por proveedor
      const alertas = responseAlertas.data.alertas || [];
      const alertasGen = alertas.filter(a => a.proveedor === 'general').length;
      const alertasMov = alertas.filter(a => a.proveedor === 'movistar').length;

      setAlertasGeneral(alertasGen);
      setAlertasMovistar(alertasMov);

      console.log(`📊 Notificaciones - General: ${conteoGeneral}, Movistar: ${conteoMovistar}`);
      console.log(`🔔 Alertas - General: ${alertasGen}, Movistar: ${alertasMov}`);

    } catch (err) {
      console.error('Error al cargar notificaciones:', err);
      setError(err.message || 'Error al cargar notificaciones');
      
      setNotificacionesGeneral(0);
      setNotificacionesMovistar(0);
      setAlertasGeneral(0);
      setAlertasMovistar(0);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setNotificacionesGeneral(0);
      setNotificacionesMovistar(0);
      setAlertasGeneral(0);
      setAlertasMovistar(0);
      return;
    }

    cargarNotificaciones();

    const interval = setInterval(() => {
      cargarNotificaciones();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [enabled, pollingInterval, cargarNotificaciones]);

  const totalNotificaciones = notificacionesGeneral + notificacionesMovistar;
  const totalAlertas = alertasGeneral + alertasMovistar;

  return {
    // Incrementos
    notificacionesGeneral,
    notificacionesMovistar,
    totalNotificaciones,
    
    // Alertas
    alertasGeneral,
    alertasMovistar,
    totalAlertas,
    
    // Estado
    loading,
    error,
    refetch: cargarNotificaciones,
    
    // Helpers
    tieneNotificaciones: totalNotificaciones > 0,
    tieneAlertas: totalAlertas > 0,
    tieneNotificacionesGeneral: notificacionesGeneral > 0,
    tieneNotificacionesMovistar: notificacionesMovistar > 0,
    tieneAlertasGeneral: alertasGeneral > 0,
    tieneAlertasMovistar: alertasMovistar > 0
  };
};

export default useIncrementosNotificaciones;