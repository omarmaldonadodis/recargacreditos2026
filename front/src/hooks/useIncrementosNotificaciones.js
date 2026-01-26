// hooks/useIncrementosNotificaciones.js

import { useState, useEffect, useCallback } from 'react';
import api from '../services/axiosConfig';

const useIncrementosNotificaciones = (enabled = true, pollingInterval = 30000) => {
  const [notificacionesGeneral, setNotificacionesGeneral] = useState(0);
  const [notificacionesMovistar, setNotificacionesMovistar] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarNotificaciones = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      // ✅ Obtener notificaciones para GENERAL (proveedor = 'general')
      const responseGeneral = await api.get('/incrementos/notificaciones', { 
        params: { proveedor: 'general' } 
      });
      
      // ✅ Obtener notificaciones para MOVISTAR (proveedor = 'movistar')
      const responseMovistar = await api.get('/incrementos/notificaciones', { 
        params: { proveedor: 'movistar' } 
      });

      // ✅ Actualizar contadores por proveedor
      const conteoGeneral = responseGeneral.data.conteo || 0;
      const conteoMovistar = responseMovistar.data.conteo || 0;

      setNotificacionesGeneral(conteoGeneral);
      setNotificacionesMovistar(conteoMovistar);

      console.log(`📊 Notificaciones actualizadas - General: ${conteoGeneral}, Movistar: ${conteoMovistar}`);

    } catch (err) {
      console.error('Error al cargar notificaciones:', err);
      setError(err.message || 'Error al cargar notificaciones');
      
      // En caso de error, mantener los contadores en 0
      setNotificacionesGeneral(0);
      setNotificacionesMovistar(0);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Cargar notificaciones al montar y configurar polling
  useEffect(() => {
    if (!enabled) {
      // Si se deshabilita, resetear contadores
      setNotificacionesGeneral(0);
      setNotificacionesMovistar(0);
      return;
    }

    // Carga inicial
    cargarNotificaciones();

    // Configurar polling
    const interval = setInterval(() => {
      cargarNotificaciones();
    }, pollingInterval);

    // Cleanup
    return () => clearInterval(interval);
  }, [enabled, pollingInterval, cargarNotificaciones]);

  const totalNotificaciones = notificacionesGeneral + notificacionesMovistar;

  // ✅ Devolver información detallada por proveedor
  return {
    notificacionesGeneral,
    notificacionesMovistar,
    totalNotificaciones,
    loading,
    error,
    refetch: cargarNotificaciones,
    // ✅ Información adicional útil
    tieneNotificaciones: totalNotificaciones > 0,
    tieneNotificacionesGeneral: notificacionesGeneral > 0,
    tieneNotificacionesMovistar: notificacionesMovistar > 0
  };
};

export default useIncrementosNotificaciones;