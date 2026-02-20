// front/src/hooks/useIncrementosNotificaciones.js - VERSIÓN DEFINITIVA ROBUSTA
import { useState, useEffect, useRef, useMemo } from 'react';
import api from '../services/axiosConfig';

// ⭐ SINGLETON GLOBAL: Asegura que solo hay 1 interval SIEMPRE
const NotificationsManager = {
  intervalId: null,
  listeners: new Set(),
  isLoading: false,
  pollingInterval: 30000,
  
  clearInterval() {
    if (this.intervalId) {
      console.log('🛑 Limpiando interval existente');
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  },
  
  async fetchNotifications() {
    if (this.isLoading) {
      console.log('⏭️ Ya hay carga en progreso');
      return;
    }

    if (this.listeners.size === 0) {
      console.log('⏭️ No hay listeners, cancelando carga');
      return;
    }

    this.isLoading = true;

    try {
      console.log('🔔 Cargando notificaciones...');
      
      const [responseGeneral, responseMovistar, responseAlertas] = await Promise.all([
        api.get('/incrementos/notificaciones', { params: { proveedor: 'general' } }),
        api.get('/incrementos/notificaciones', { params: { proveedor: 'movistar' } }),
        api.get('/alertas/')
      ]);

      const conteoGeneral = responseGeneral.data.conteo || 0;
      const conteoMovistar = responseMovistar.data.conteo || 0;
      const alertas = responseAlertas.data.alertas || [];
      const alertasGen = alertas.filter(a => a.proveedor === 'general').length;
      const alertasMov = alertas.filter(a => a.proveedor === 'movistar').length;

      const data = {
        notificacionesGeneral: conteoGeneral,
        notificacionesMovistar: conteoMovistar,
        alertasGeneral: alertasGen,
        alertasMovistar: alertasMov
      };

      console.log(`✅ Notificaciones - G:${conteoGeneral} M:${conteoMovistar} | Listeners: ${this.listeners.size}`);
      
      // Notificar a todos los listeners
      this.listeners.forEach(listener => {
        try {
          listener(data);
        } catch (err) {
          console.error('Error notificando listener:', err);
        }
      });

    } catch (err) {
      console.error('❌ Error cargando notificaciones:', err);
      
      // Notificar error a listeners
      this.listeners.forEach(listener => {
        try {
          listener({ error: err.message });
        } catch (e) {
          console.error('Error notificando error:', e);
        }
      });
    } finally {
      this.isLoading = false;
    }
  },
  
  startPolling() {
    // ⭐ CRÍTICO: Siempre limpiar interval anterior
    this.clearInterval();
    
    if (this.listeners.size === 0) {
      console.log('⏸️ No hay listeners, no se inicia polling');
      return;
    }
    
    console.log('🎬 Iniciando polling (cada 30s)');
    
    // Cargar inmediatamente
    this.fetchNotifications();
    
    // Configurar interval
    this.intervalId = setInterval(() => {
      console.log('⏰ Ejecutando polling GLOBAL');
      this.fetchNotifications();
    }, this.pollingInterval);
    
    console.log(`⏱️ Polling activo | Listeners: ${this.listeners.size}`);
  },
  
  addListener(listener) {
    const listenerId = Math.random().toString(36).substr(2, 6);
    console.log(`➕ Agregando listener ${listenerId} (total: ${this.listeners.size + 1})`);
    
    this.listeners.add(listener);
    
    // Si es el primer listener, iniciar polling
    if (this.listeners.size === 1) {
      this.startPolling();
    }
    
    return listenerId;
  },
  
  removeListener(listener, listenerId) {
    console.log(`➖ Removiendo listener ${listenerId} (total: ${this.listeners.size - 1})`);
    this.listeners.delete(listener);
    
    // Si no quedan listeners, detener polling
    if (this.listeners.size === 0) {
      console.log('🛑 Último listener removido, deteniendo polling');
      this.clearInterval();
    }
  }
};

const useIncrementosNotificaciones = (enabled = true, pollingInterval = 30000) => {
  const [notificacionesGeneral, setNotificacionesGeneral] = useState(0);
  const [notificacionesMovistar, setNotificacionesMovistar] = useState(0);
  const [alertasGeneral, setAlertasGeneral] = useState(0);
  const [alertasMovistar, setAlertasMovistar] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);
  const listenerIdRef = useRef(null);

  // Función que actualiza el estado de ESTE hook específico
  const handleUpdate = useRef((data) => {
    if (!isMountedRef.current) return;
    
    if (data.error) {
      setError(data.error);
      setLoading(false);
      return;
    }
    
    setNotificacionesGeneral(data.notificacionesGeneral);
    setNotificacionesMovistar(data.notificacionesMovistar);
    setAlertasGeneral(data.alertasGeneral);
    setAlertasMovistar(data.alertasMovistar);
    setLoading(false);
    setError(null);
  });

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!enabled) {
      console.log('⏸️ Hook deshabilitado');
      setNotificacionesGeneral(0);
      setNotificacionesMovistar(0);
      setAlertasGeneral(0);
      setAlertasMovistar(0);
      return;
    }

    // Actualizar intervalo si cambió
    if (NotificationsManager.pollingInterval !== pollingInterval) {
      console.log(`🔄 Actualizando intervalo: ${pollingInterval}ms`);
      NotificationsManager.pollingInterval = pollingInterval;
      
      // Si ya hay listeners, reiniciar polling con nuevo intervalo
      if (NotificationsManager.listeners.size > 0) {
        NotificationsManager.startPolling();
      }
    }

    // Registrar listener
    listenerIdRef.current = NotificationsManager.addListener(handleUpdate.current);
    setLoading(true);

    // Cleanup
    return () => {
      console.log('🧹 Cleanup del hook');
      isMountedRef.current = false;
      
      if (listenerIdRef.current) {
        NotificationsManager.removeListener(handleUpdate.current, listenerIdRef.current);
        listenerIdRef.current = null;
      }
    };
  }, [enabled, pollingInterval]);

  const totalNotificaciones = notificacionesGeneral + notificacionesMovistar;
  const totalAlertas = alertasGeneral + alertasMovistar;

  const refetch = useMemo(() => {
    return () => {
      console.log('🔄 Refetch manual');
      setLoading(true);
      NotificationsManager.fetchNotifications();
    };
  }, []);

  return useMemo(() => ({
    notificacionesGeneral,
    notificacionesMovistar,
    totalNotificaciones,
    alertasGeneral,
    alertasMovistar,
    totalAlertas,
    loading,
    error,
    refetch,
    tieneNotificaciones: totalNotificaciones > 0,
    tieneAlertas: totalAlertas > 0,
    tieneNotificacionesGeneral: notificacionesGeneral > 0,
    tieneNotificacionesMovistar: notificacionesMovistar > 0,
    tieneAlertasGeneral: alertasGeneral > 0,
    tieneAlertasMovistar: alertasMovistar > 0
  }), [
    notificacionesGeneral,
    notificacionesMovistar,
    totalNotificaciones,
    alertasGeneral,
    alertasMovistar,
    totalAlertas,
    loading,
    error,
    refetch
  ]);
};

export default useIncrementosNotificaciones;