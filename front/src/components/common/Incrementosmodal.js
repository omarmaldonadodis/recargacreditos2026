// front/src/components/common/IncrementosModal.js - VERSIÓN OPTIMIZADA Y CORREGIDA
import React, { useState, useEffect } from 'react';
import { 
  Modal, Tabs, Tab, Badge, Button, Form, Table, Alert, 
  Spinner, Card, Row, Col, ListGroup, Accordion
} from 'react-bootstrap';
import * as XLSX from 'xlsx';
import moment from 'moment-timezone';
import api from '../../services/axiosConfig';
import './IncrementosModal.css';
import Select from 'react-select';


// Iconos de react-icons
import { 
  FiBell, FiFileText, FiDollarSign, FiLink, FiBarChart2,
  FiCheck, FiX, FiAlertTriangle, FiClock, FiTrendingUp,
  FiDownload, FiSave, FiTrash2, FiCheckCircle,
  FiCalendar, FiRefreshCw
} from 'react-icons/fi';

import { FiInfo } from "react-icons/fi";

const IncrementosModal = ({ show, handleClose, proveedor }) => {
  const [activeTab, setActiveTab] = useState('alertas');
  const [loading, setLoading] = useState(false);

  const [modalInicializado, setModalInicializado] = useState(false);

  
  // ============= ESTADOS EXISTENTES =============
  const [incrementos, setIncrementos] = useState([]);
  const [selectedIncremento, setSelectedIncremento] = useState(null);
  const [nuevoDeposito, setNuevoDeposito] = useState({
    monto: '',
    usuarioId: '',
    tipoDeposito: 'efectivo',
    referencia: '',
    notas: ''
  });
  const [usuarios, setUsuarios] = useState([]);
  const [depositosDisponibles, setDepositosDisponibles] = useState([]);
  const [depositosSeleccionados, setDepositosSeleccionados] = useState([]);
  const [notasAsignacion, setNotasAsignacion] = useState('');
  const [incrementoMaximo, setIncrementoMaximo] = useState(0);
  
  // Alertas
  const [alertas, setAlertas] = useState([]);
  const [estadisticasAlertas, setEstadisticasAlertas] = useState(null);
  
  // ============= ESTADOS PARA REPORTES =============
  const [reporte, setReporte] = useState(null);
  const [fechaMinima, setFechaMinima] = useState('2026-02-09');
  const [fechaMaxima, setFechaMaxima] = useState(null);
  const [fechaInicio, setFechaInicio] = useState('2026-02-09');
  const [fechaFin, setFechaFin] = useState(null);
  const [reporteError, setReporteError] = useState(null);
  
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' });

  const [porcentajeRealMovistar, setPorcentajeRealMovistar] = useState(null);
  const [cargandoPorcentaje, setCargandoPorcentaje] = useState(false);
  const [simulacionRendimiento, setSimulacionRendimiento] = useState(null);
  const [cargandoSimulacion, setCargandoSimulacion] = useState(false);
  const [analisisCompleto, setAnalisisCompleto] = useState(null);

  // ===== ZONA HORARIA =====
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const opcionesUsuarios = usuarios.map(user => ({
    value: user.id,
    label: user.displayName || `${user.tipoUsuario} - ${user.nombreCompleto}`,
    data: user
  }));

  const cargarPorcentajeRealMovistar = async () => {
    if (proveedor !== 'movistar') {
      setPorcentajeRealMovistar(null);
      return;
    }
    
    setCargandoPorcentaje(true);
    try {
      const params = new URLSearchParams({
        startDate: fechaInicio,
        endDate: fechaFin
      });
      
      const response = await api.get(`/incrementos/movistar/porcentaje-real?${params}`);
      setPorcentajeRealMovistar(response.data);
      
      console.log('📊 Métricas Reales Movistar:', response.data);
    } catch (error) {
      console.error('Error cargando métricas:', error);
      setPorcentajeRealMovistar(null);
    } finally {
      setCargandoPorcentaje(false);
    }
  };

  // ============= EFECTOS CORREGIDOS =============
  // 🔧 FIX 1: Cargar datos solo cuando se abre el modal o cambia el proveedor
  useEffect(() => {
    if (show) {
      cargarDatosIniciales();
    } else {
      resetearEstados();
    }
  }, [show, proveedor]);

  // Cargar datos específicos cuando cambia de pestaña
  useEffect(() => {
    if (show && activeTab) {
      cargarDatosTab();
    }
  }, [activeTab]);

  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0];
    setFechaMaxima(hoy);
    setFechaFin(hoy);
  }, []);

  useEffect(() => {
    if (activeTab === 'reportes' && fechaInicio && fechaFin && show) {
      if (new Date(fechaInicio) <= new Date(fechaFin)) {
        cargarReporteCompleto();
      }
    }
  }, [fechaInicio, fechaFin, activeTab, show]);

  // 🔧 SOLUCIÓN: Controlar inicialización del modal
  useEffect(() => {
    if (show && !modalInicializado) {
      // Modal se abre por primera vez
      setModalInicializado(true);
      
      // Validar pestaña inicial solo si es necesario
      if (activeTab === 'notificaciones' && incrementos.length === 0) {
        setActiveTab('alertas');
      }
      if (activeTab === 'asignar' && !selectedIncremento) {
        setActiveTab('alertas');
      }
    } else if (!show) {
      // Modal se cierra - resetear flag
      setModalInicializado(false);
    }
  }, [show]); // ⚠️ SOLO depende de 'show'

  useEffect(() => {
    if (activeTab === 'reportes' && fechaInicio && fechaFin && show) {
      if (proveedor === 'movistar') {
        cargarMetricasMovistar();
      } else {
        setPorcentajeRealMovistar(null);
        setSimulacionRendimiento(null);
        setAnalisisCompleto(null);
      }
    }
  }, [fechaInicio, fechaFin, activeTab, show, proveedor]);

  const resetearEstados = () => {
    setModalInicializado(false);
    setActiveTab('alertas');
    setIncrementos([]);
    setSelectedIncremento(null);
    setNuevoDeposito({
      monto: '',
      usuarioId: '',
      tipoDeposito: 'efectivo',
      referencia: '',
      notas: ''
    });
    setDepositosDisponibles([]);
    setDepositosSeleccionados([]);
    setNotasAsignacion('');
    setIncrementoMaximo(0);
    setAlertas([]);
    setEstadisticasAlertas(null);
    setReporte(null);
    setReporteError(null);
    setAlert({ show: false, message: '', variant: '' });
    setPorcentajeRealMovistar(null);
    setSimulacionRendimiento(null);
    setAnalisisCompleto(null);
    setCargandoPorcentaje(false);
    setCargandoSimulacion(false);
  };

  // 🔧 FIX 3: Separar carga inicial de carga por pestaña
  const cargarDatosIniciales = async () => {
    setLoading(true);
    try {
      // Siempre cargar alertas al abrir
      await cargarAlertas();
      await cargarEstadisticasAlertas();
      
      // Si la pestaña actual necesita datos adicionales, cargarlos
      await cargarDatosTab();
    } catch (error) {
      mostrarAlerta('Error al cargar datos', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const cargarDatosTab = async () => {
    try {
      switch (activeTab) {
        case 'alertas':
          // Ya se cargaron en cargarDatosIniciales
          break;
        case 'notificaciones':
          if (incrementos.length === 0) {
            await cargarIncrementos();
          }
          break;
        case 'depositos':
          await cargarUsuariosValidos();
          await cargarDepositosDisponibles();
          await cargarIncrementoMaximo();
          break;
        case 'asignar':
          if (incrementos.length === 0) {
            await cargarIncrementos();
          }
          if (depositosDisponibles.length === 0) {
            await cargarDepositosDisponibles();
          }
          break;
        case 'reportes':
          // Se carga con el useEffect de fechas
          break;
      }
    } catch (error) {
      console.error('Error al cargar datos de la pestaña:', error);
    }
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'alertas':
          await cargarAlertas();
          await cargarEstadisticasAlertas();
          await cargarIncrementos();
          break;
        case 'notificaciones':
          await cargarIncrementos();
          break;
        case 'depositos':
          await cargarUsuariosValidos();
          await cargarDepositosDisponibles();
          await cargarIncrementoMaximo();
          break;
        case 'asignar':
          await cargarIncrementos();
          await cargarDepositosDisponibles();
          break;
        case 'reportes':
          break;
      }
    } catch (error) {
      mostrarAlerta('Error al cargar datos', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // ============= FUNCIONES DE CARGA EXISTENTES =============
  
  const cargarAlertas = async () => {
    try {
      const response = await api.get('/alertas');
      const alertasFiltradas = response.data.alertas.filter(
        alerta => alerta.proveedor === proveedor
      );
      setAlertas(alertasFiltradas);
    } catch (error) {
      console.error('Error al cargar alertas:', error);
    }
  };

  const cargarEstadisticasAlertas = async () => {
    try {
      const response = await api.get('/alertas/estadisticas');
      
      const estadisticasFiltradas = {
        total: alertas.length,
        porTipo: {
          incrementos: alertas.filter(a => a.tipo === 'incremento_pendiente').length,
          depositos: alertas.filter(a => a.tipo === 'deposito_sin_asignar').length,
          ajustes: alertas.filter(a => a.tipo === 'ajuste_pendiente').length,
          inconsistencias: alertas.filter(a => a.tipo === 'inconsistencia_saldo').length
        },
        porUrgencia: {
          alta: alertas.filter(a => a.urgencia === 'alta').length,
          media: alertas.filter(a => a.urgencia === 'media').length,
          baja: alertas.filter(a => a.urgencia === 'baja').length
        },
        porProveedor: {
          [proveedor]: alertas.length
        }
      };
      
      setEstadisticasAlertas(estadisticasFiltradas);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const cargarIncrementos = async () => {
    try {
      const response = await api.get('/incrementos/notificaciones', {
        params: { proveedor }
      });
      setIncrementos(response.data.incrementos || []);
    } catch (error) {
      console.error('Error al cargar incrementos:', error);
    }
  };

  const cargarUsuariosValidos = async () => {
    try {
      const response = await api.get('/admin/usuarios-validos');
      setUsuarios(response.data.usuarios || []);
    } catch (error) {
      try {
        const responseFallback = await api.get('/admin/usuarios');
        setUsuarios(responseFallback.data || []);
      } catch (fallbackError) {
        console.error('Error en fallback:', fallbackError);
      }
    }
  };

  const cargarDepositosDisponibles = async () => {
    try {
      const response = await api.get('/incrementos/depositos', {
        params: { proveedor, asignado: false }
      });
      setDepositosDisponibles(response.data || []);
    } catch (error) {
      console.error('Error al cargar depósitos:', error);
    }
  };

  const cargarIncrementoMaximo = async () => {
    try {
      const response = await api.get('/incrementos/notificaciones', {
        params: { proveedor }
      });
      
      const incrementosPendientes = response.data.incrementos || [];
      
      if (incrementosPendientes.length > 0) {
        const maximo = Math.max(...incrementosPendientes.map(inc => parseFloat(inc.diferencia)));
        setIncrementoMaximo(maximo);
      } else {
        setIncrementoMaximo(0);
      }
    } catch (error) {
      console.error('Error al cargar incremento máximo:', error);
      setIncrementoMaximo(0);
    }
  };

  const cargarReporteCompleto = async () => {
    setReporteError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        proveedor,
        fechaInicio: fechaInicio || '2026-02-09',
        fechaFin: fechaFin || new Date().toISOString().split('T')[0],
        timezone
      });

      const response = await api.get(`/contabilidad/reporte-completo?${params}`);
      setReporte(response.data);

      if (response.data.limitesCalendario) {
        setFechaMinima(response.data.limitesCalendario.fechaMinima);
        setFechaMaxima(response.data.limitesCalendario.fechaMaxima);
      }
    } catch (err) {
      console.error('Error cargando reporte:', err);
      setReporteError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFechaInicioChange = (e) => {
    const newFechaInicio = e.target.value;
    
    if (fechaFin && new Date(newFechaInicio) > new Date(fechaFin)) {
      mostrarAlerta('La fecha de inicio no puede ser mayor a la fecha de fin', 'warning');
      return;
    }
    
    setFechaInicio(newFechaInicio);
  };

  const handleFechaFinChange = (e) => {
    const newFechaFin = e.target.value;
    
    if (fechaInicio && new Date(newFechaFin) < new Date(fechaInicio)) {
      mostrarAlerta('La fecha de fin no puede ser menor a la fecha de inicio', 'warning');
      return;
    }
    
    setFechaFin(newFechaFin);
  };

  // 🔧 FUNCIÓN exportarExcel CORREGIDA - Reemplazar en IncrementosModal.js

const exportarExcel = () => {
  if (!reporte) return;

  const wb = XLSX.utils.book_new();

  // ========== HOJA 1: RESUMEN ==========
  const resumenData = [
    ['REPORTE DE CONTABILIDAD - GESTOPAGO'],
    ['Proveedor:', proveedor.toUpperCase()],
    ['Periodo:', `${reporte.periodo.fechaInicio} a ${reporte.periodo.fechaFin}`],
    ['Generado:', reporte.metadata.generadoEn],
    ['Zona Horaria:', reporte.periodo.timezone],
    [],
    ['SALDOS'],
    ['Saldo Inicial:', reporte.saldos.inicial],
    ['Saldo Final Real:', reporte.saldos.finalReal],
    ['Saldo Final Calculado:', reporte.saldos.finalCalculado || 0],
    ['Diferencia:', reporte.saldos.diferencia],
    ['Estado:', reporte.saldos.consistente ? 'Consistente' : 'Inconsistente'],
    [],
    ['TOTALES'],
    ['Incrementos:', reporte.totales.incrementos],
    ['Depositado:', reporte.totales.depositosAsignados],
    ['Recargado:', reporte.totales.recargas],
  ];

  // ✅ CORRECCIÓN 1: Agregar comisiones solo para Movistar
  if (proveedor === 'movistar') {
    resumenData.push(['Comisiones:', reporte.totales.comisiones || 0]);
  }

  // ✅ CORRECCIÓN 2: Ganancia Real con lógica correcta según proveedor
  if (proveedor === 'movistar') {
    resumenData.push(['Ganancia Real:', reporte.totales.comisiones || 0]);
  } else {
    if (reporte.totales.incrementos === 0) {
      resumenData.push(['Ganancia Real:', 'Sin datos']);
    } else {
      resumenData.push(['Ganancia Real:', reporte.totales.gananciaReal]);
    }
  }

  // ✅ CORRECCIÓN 3: Porcentaje sin división adicional
  resumenData.push(['Porcentaje:', reporte.totales.incrementos === 0 ? 0 : reporte.totales.porcentajeGanancia]);
  
  resumenData.push(
    [],
    ['CONTADORES'],
    ['Recargas:', reporte.contadores?.recargas || 0],
    ['Incrementos:', reporte.contadores?.incrementos || 0],
    ['Depósitos:', reporte.contadores?.depositos || 0],
    [],
    ['NOTA:', reporte.totales.incrementos === 0 ? 'No hay incrementos en este periodo' : '']
  );

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  
  if (!wsResumen['!cols']) wsResumen['!cols'] = [];
  wsResumen['!cols'][0] = { wch: 25 };
  wsResumen['!cols'][1] = { wch: 20 };
  
  // ✅ CORRECCIÓN 4: Formatear celdas según proveedor
  const monedasCells = proveedor === 'movistar' 
    ? ['B8', 'B9', 'B10', 'B11', 'B15', 'B16', 'B17', 'B18', 'B19']  // Con comisiones
    : ['B8', 'B9', 'B10', 'B11', 'B15', 'B16', 'B17', 'B18'];       // Sin comisiones
  
  monedasCells.forEach(cell => {
    if (wsResumen[cell] && typeof wsResumen[cell].v === 'number') {
      wsResumen[cell].t = 'n';
      wsResumen[cell].z = '"$"#,##0.00';
    }
  });
  
  // ✅ CORRECCIÓN 5: Formatear porcentaje en la celda correcta
  const porcentajeCell = proveedor === 'movistar' ? 'B20' : 'B19';
  if (wsResumen[porcentajeCell] && typeof wsResumen[porcentajeCell].v === 'number') {
    wsResumen[porcentajeCell].t = 'n';
    wsResumen[porcentajeCell].z = '0.00%';
    wsResumen[porcentajeCell].v = wsResumen[porcentajeCell].v / 100; // Dividir aquí para formato %
  }
  
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  // ========== HOJA 2: MÉTRICAS MOVISTAR (si aplica) ==========
  if (proveedor === 'movistar' && porcentajeRealMovistar && !porcentajeRealMovistar.error) {
    const metricasMovistarData = [
      ['MÉTRICAS ESPECIALES MOVISTAR'],
      ['Periodo:', `${fechaInicio} a ${fechaFin}`],
      [],
      ['DATOS REALES'],
      ['Capital Inicial:', porcentajeRealMovistar.capitalInicial],
      ['Saldo Final:', porcentajeRealMovistar.saldoFinal],
      ['Saldo Inicial (Periodo):', porcentajeRealMovistar.saldoInicial],
      ['Total Invertido:', porcentajeRealMovistar.totalInvertido],
      ['Total Comisiones Reales:', porcentajeRealMovistar.totalComisionesReales],
      ['Cantidad Recargas:', porcentajeRealMovistar.cantidadRecargas],
      ['Porcentaje Periodo:', porcentajeRealMovistar.porcentajePeriodo],
      ['Porcentaje Redondeado:', porcentajeRealMovistar.porcentajePeriodoRedondeado + '%'],
      [],
      ['SIMULACIÓN DE RENDIMIENTO'],
    ];

    if (simulacionRendimiento && !simulacionRendimiento.error) {
      metricasMovistarData.push(
        ['Capital Inicial (Simulación):', simulacionRendimiento.capitalInicial],
        ['Promedio Recarga:', simulacionRendimiento.promedioRecarga],
        ['Número de Recargas Estimadas:', simulacionRendimiento.numeroRecargas],
        ['Total Comisiones Ganadas:', simulacionRendimiento.totalComisionesGanadas],
        ['Capital Final Disponible:', simulacionRendimiento.capitalFinalDisponible],
        ['Rendimiento Efectivo:', simulacionRendimiento.rendimientoEfectivo],
        ['Rendimiento Redondeado:', simulacionRendimiento.rendimientoEfectivoRedondeado + '%']
      );
    } else {
      metricasMovistarData.push(['No hay datos de simulación disponibles']);
    }

    const wsMetricasMovistar = XLSX.utils.aoa_to_sheet(metricasMovistarData);
    
    if (!wsMetricasMovistar['!cols']) wsMetricasMovistar['!cols'] = [];
    wsMetricasMovistar['!cols'][0] = { wch: 30 };
    wsMetricasMovistar['!cols'][1] = { wch: 20 };
    
    // Formatear como moneda
    ['B5', 'B6', 'B7', 'B8', 'B9', 'B15', 'B16', 'B19', 'B20', 'B21'].forEach(cell => {
      if (wsMetricasMovistar[cell] && typeof wsMetricasMovistar[cell].v === 'number') {
        wsMetricasMovistar[cell].t = 'n';
        wsMetricasMovistar[cell].z = '"$"#,##0.00';
      }
    });
    
    // Formatear como porcentaje
    ['B11', 'B17', 'B22'].forEach(cell => {
      if (wsMetricasMovistar[cell] && typeof wsMetricasMovistar[cell].v === 'number') {
        wsMetricasMovistar[cell].t = 'n';
        wsMetricasMovistar[cell].z = '0.00%';
        wsMetricasMovistar[cell].v = wsMetricasMovistar[cell].v / 100;
      }
    });
    
    XLSX.utils.book_append_sheet(wb, wsMetricasMovistar, 'Métricas Movistar');
  }

  // ========== HOJA 3: INCREMENTOS ==========
  if (reporte.detalles.incrementos.length > 0) {
    const incrementosHeaders = [
      'ID', 'Fecha', 'Tipo', 'Operadora', 'Saldo Anterior', 'Saldo Nuevo',
      'Incremento', 'Depósitos', 'Ganancia', 'Porcentaje', 'Estado',
    ];
    
    const incrementosData = reporte.detalles.incrementos.map(inc => [
      inc.id,
      inc.fecha,
      inc.tipo,
      inc.operadora || '',
      inc.saldoAnterior || 0,
      inc.saldoNuevo || 0,
      inc.incremento,
      inc.depositosAsociados,
      inc.ganancia,
      inc.porcentaje,  // ✅ Sin dividir, se formatea después
      inc.estado,
    ]);

    const wsIncrementos = XLSX.utils.aoa_to_sheet([
      incrementosHeaders,
      ...incrementosData
    ]);

    wsIncrementos['!cols'] = [
      { wch: 5 },  { wch: 18 }, { wch: 20 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }
    ];
    
    const filas = incrementosData.length;
    for (let i = 2; i <= filas + 1; i++) {
      ['E', 'F', 'G', 'H', 'I'].forEach(col => {
        const cell = `${col}${i}`;
        if (wsIncrementos[cell] && typeof wsIncrementos[cell].v === 'number') {
          wsIncrementos[cell].t = 'n';
          wsIncrementos[cell].z = '"$"#,##0.00';
        }
      });
      
      const cellJ = `J${i}`;
      if (wsIncrementos[cellJ] && typeof wsIncrementos[cellJ].v === 'number') {
        wsIncrementos[cellJ].t = 'n';
        wsIncrementos[cellJ].z = '0.00%';
        wsIncrementos[cellJ].v = wsIncrementos[cellJ].v / 100; // Dividir para formato %
      }
    }

    XLSX.utils.book_append_sheet(wb, wsIncrementos, 'Incrementos');
  }

  // ========== HOJA 4: DEPÓSITOS ==========
  if (reporte.detalles.depositos.length > 0) {
    const depositosHeaders = [
      'ID', 'Fecha', 'Monto', 'Método', 'Usuario', 'Referencia', 
      'Verificado', 'Asignado', 'Notas'
    ];
    
    const depositosData = reporte.detalles.depositos.map(dep => [
      dep.id,
      dep.fecha,
      dep.monto,
      dep.metodoPago || '-',
      dep.usuario || '-',
      dep.referencia || '-',
      dep.verificado ? 'Sí' : 'No',
      dep.asignado ? 'Sí' : 'No',
      dep.notas || ''
    ]);

    const wsDepositos = XLSX.utils.aoa_to_sheet([
      depositosHeaders,
      ...depositosData
    ]);

    wsDepositos['!cols'] = [
      { wch: 5 }, { wch: 18 }, { wch: 12 },
      { wch: 15 }, { wch: 20 }, { wch: 15 },
      { wch: 10 }, { wch: 10 }, { wch: 30 }
    ];
    
    const filasD = depositosData.length;
    for (let i = 2; i <= filasD + 1; i++) {
      const cell = `C${i}`;
      if (wsDepositos[cell] && typeof wsDepositos[cell].v === 'number') {
        wsDepositos[cell].t = 'n';
        wsDepositos[cell].z = '"$"#,##0.00';
      }
    }

    XLSX.utils.book_append_sheet(wb, wsDepositos, 'Depósitos');
  }

  // ========== HOJA 5: RECARGAS ==========
  if (reporte.detalles.recargas.length > 0) {
    const recargasHeaders = [
      'Fecha', 'Número', 'Operadora', 'Valor', 'Comisión', 'Saldo Anterior',
      'Saldo Nuevo', 'Exitoso'
    ];
    
    const recargasData = reporte.detalles.recargas.map(rec => [
      rec.fecha,
      rec.numeroRecarga || '-',
      rec.operadora || '-',
      rec.valor,
      rec.comision,
      rec.saldoAnterior || 0,
      rec.saldoNuevo || 0,
      rec.exitoso ? 'Sí' : 'No',
    ]);

    const wsRecargas = XLSX.utils.aoa_to_sheet([
      recargasHeaders,
      ...recargasData
    ]);

    wsRecargas['!cols'] = [
      { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 10 },
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, 
    ];
    
    const filasR = recargasData.length;
    for (let i = 2; i <= filasR + 1; i++) {
      ['D', 'E', 'F', 'G'].forEach(col => {
        const cell = `${col}${i}`;
        if (wsRecargas[cell] && typeof wsRecargas[cell].v === 'number') {
          wsRecargas[cell].t = 'n';
          wsRecargas[cell].z = '"$"#,##0.00';
        }
      });
    }

    XLSX.utils.book_append_sheet(wb, wsRecargas, 'Recargas');
  }

  const nombreArchivo = `Reporte_${proveedor}_${fechaInicio}_${fechaFin}.xlsx`;
  XLSX.writeFile(wb, nombreArchivo);
  
  mostrarAlerta('Excel exportado exitosamente', 'success');
};

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(valor);
  };

  const mostrarAlerta = (message, variant = 'success') => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: '' }), 5000);
  };

  const handleRegistrarDeposito = async (e) => {
    e.preventDefault();
    
    const montoIngresado = parseFloat(nuevoDeposito.monto);
    
    if (incrementoMaximo > 0 && montoIngresado > incrementoMaximo) {
      mostrarAlerta(
        `El monto ($${montoIngresado.toFixed(2)}) supera el incremento máximo ($${incrementoMaximo.toFixed(2)})`,
        'danger'
      );
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/incrementos/depositos', {
        ...nuevoDeposito,
        monto: montoIngresado,
        usuarioId: parseInt(nuevoDeposito.usuarioId),
        proveedor: proveedor
      });
      
      mostrarAlerta('Depósito registrado exitosamente', 'success');
      setNuevoDeposito({ 
        monto: '', 
        usuarioId: '', 
        tipoDeposito: 'efectivo',
        referencia: '',
        notas: '' 
      });
      await cargarDepositosDisponibles();
      await cargarIncrementoMaximo();
    } catch (error) {
      mostrarAlerta(error.response?.data?.error || 'Error al registrar depósito', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarDeposito = async (depositoId) => {
    if (!window.confirm('¿Estás seguro de eliminar este depósito?')) return;

    setLoading(true);
    try {
      await api.delete(`/incrementos/depositos/${depositoId}`);
      mostrarAlerta('Depósito eliminado exitosamente', 'success');
      await cargarDepositosDisponibles();
      await cargarIncrementoMaximo();
    } catch (error) {
      mostrarAlerta(error.response?.data?.error || 'Error al eliminar depósito', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificarDeposito = async (depositoId) => {
    setLoading(true);
    try {
      await api.put(`/incrementos/depositos/${depositoId}`, {
        verificado: true
      });
      mostrarAlerta('Depósito verificado', 'success');
      await cargarDepositosDisponibles();
    } catch (error) {
      mostrarAlerta('Error al verificar depósito', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const toggleDepositoSeleccionado = (depositoId) => {
    setDepositosSeleccionados(prev => {
      if (prev.includes(depositoId)) {
        return prev.filter(id => id !== depositoId);
      } else {
        return [...prev, depositoId];
      }
    });
  };

  const calcularTotalSeleccionado = () => {
    return depositosDisponibles
      .filter(d => depositosSeleccionados.includes(d.id))
      .reduce((sum, d) => sum + parseFloat(d.monto), 0);
  };

  const handleAsignarDepositos = async () => {
    if (!selectedIncremento) {
      mostrarAlerta('Selecciona un incremento primero', 'warning');
      return;
    }

    if (depositosSeleccionados.length === 0) {
      mostrarAlerta('Selecciona al menos un depósito', 'warning');
      return;
    }

    const totalSeleccionado = calcularTotalSeleccionado();
    const diferencia = parseFloat(selectedIncremento.diferencia);

    if (totalSeleccionado > diferencia) {
      mostrarAlerta(`La suma ($${totalSeleccionado.toFixed(2)}) supera el incremento ($${diferencia.toFixed(2)})`, 'danger');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/incrementos/incrementos/${selectedIncremento.id}/asignar`, {
        depositosIds: depositosSeleccionados,
        notas: notasAsignacion
      });

      const { resumen } = response.data;
      mostrarAlerta(
        `¡Asignación exitosa! Ganancia: $${resumen.ganancia} (${resumen.porcentajeGanancia})`,
        'success'
      );

      setSelectedIncremento(null);
      setDepositosSeleccionados([]);
      setNotasAsignacion('');
      await cargarIncrementos();
      await cargarDepositosDisponibles();
      await cargarAlertas();
    } catch (error) {
      mostrarAlerta(error.response?.data?.error || 'Error al asignar', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleIgnorarIncremento = async (incrementoId) => {
    if (!window.confirm('¿Estás seguro de ignorar este incremento?')) return;

    setLoading(true);
    try {
      await api.post(`/incrementos/incrementos/${incrementoId}/ignorar`, {
        notas: 'Ignorado desde el panel'
      });
      mostrarAlerta('Incremento ignorado', 'success');
      await cargarIncrementos();
      await cargarAlertas();
    } catch (error) {
      mostrarAlerta('Error al ignorar', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const getUrgenciaColor = (urgencia) => {
    switch (urgencia) {
      case 'alta': return 'danger';
      case 'media': return 'warning';
      case 'baja': return 'info';
      default: return 'secondary';
    }
  };

  const getTipoIncrementoLabel = (tipo) => {
    const labels = {
      'deposito_inicial': 'Depósito Inicial',
      'comisiones_acumuladas': 'Comisiones',
      'ajuste_manual': 'Ajuste Manual',
      'diferencia_sistema': 'Diferencia'
    };
    return labels[tipo] || tipo;
  };

  const cargarMetricasMovistar = async () => {
    if (proveedor !== 'movistar') return;
    
    setCargandoPorcentaje(true);
    setCargandoSimulacion(true);
    
    try {
      const params = new URLSearchParams({
        startDate: fechaInicio,
        endDate: fechaFin
      });
      
      const responseMetricas = await api.get(`/incrementos/movistar/porcentaje-real?${params}`);
      setPorcentajeRealMovistar(responseMetricas.data);
      
      console.log('📊 Métricas Reales Movistar (CORREGIDAS):', responseMetricas.data);
      
      if (responseMetricas.data && !responseMetricas.data.error) {
        const capitalInicial = parseFloat(responseMetricas.data.capitalInicial);
        const promedioRecarga = parseFloat(responseMetricas.data.totalInvertido) / parseInt(responseMetricas.data.cantidadRecargas);
        const porcentajeComision = parseFloat(responseMetricas.data.porcentajePeriodo);
        
        const paramsSimulacion = new URLSearchParams({
          capitalInicial: capitalInicial.toString(),
          promedioRecarga: promedioRecarga.toFixed(2),
          porcentajeComision: porcentajeComision.toString(),
          minimoOperable: '20'
        });
        
        const responseSimulacion = await api.get(`/incrementos/movistar/simulacion-rendimiento?${paramsSimulacion}`);
        setSimulacionRendimiento(responseSimulacion.data);
        
        console.log('🔮 Simulación de Rendimiento:', responseSimulacion.data);
      }
      
    } catch (error) {
      console.error('Error cargando métricas:', error);
      setPorcentajeRealMovistar(null);
      setSimulacionRendimiento(null);
    } finally {
      setCargandoPorcentaje(false);
      setCargandoSimulacion(false);
    }
  };

  const PanelAnalisisMovistar = ({ datos, simulacion, loading }) => {
    if (loading) {
      return (
        <div className="text-center py-4">
          <Spinner animation="border" variant="success" />
          <p className="mt-2 text-muted">Cargando análisis...</p>
        </div>
      );
    }

    if (!datos || datos.error) {
      return (
        <Alert variant="warning">
          <FiAlertTriangle /> {datos?.error || 'No hay datos disponibles para este periodo'}
        </Alert>
      );
    }

    return (
      <Card >
        <Card.Body>
          {simulacion && (
            <>
              <h6 className="mb-3 fw-bold text-primary">
                <FiBarChart2 className="me-2" />
               Proyección: ¿Qué pasa si sigues usando todo el capital?
              </h6>

              <Row className="g-3 mb-3">
                <Col md={3}>
                  <div className="text-center p-3 bg-light rounded h-100">
                    <small className="text-muted d-block mb-2">💰 CAPITAL INICIAL</small>
                    <h5 className="mb-1 text-primary">
                      {formatearMoneda(datos.capitalInicial)}
                    </h5>
                  </div>
                </Col>
                
                <Col md={3}>
                  <div className="text-center p-3 bg-light rounded">
                    <small className="text-muted d-block mb-1">Recargas Estimadas</small>
                    <h4 className="mb-0 text-primary">{simulacion.numeroRecargas}</h4>

                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center p-3 bg-light rounded">
                    <small className="text-muted d-block mb-1">Ganancia potencial</small>
                    <h4 className="mb-0 text-white">
                      {formatearMoneda(simulacion.totalComisionesGanadas)}
                    </h4>

                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center p-3 bg-light rounded">
                    <small className="text-muted d-block mb-1">Rendimiento Efectivo</small>
                    <h4 className="mb-0 text-white">
                      {simulacion.rendimientoEfectivoRedondeado}%
                    </h4>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center p-3 bg-light rounded">
                    <small className="text-muted d-block mb-1">Saldo Final</small>
                    <h4 className="mb-0 text-white">
                      {formatearMoneda(simulacion.capitalFinalDisponible)}
                    </h4>

                  </div>
                </Col>
              </Row>
              
              <Alert variant="success">
                <small>
                  <strong>💡 Interpretación:</strong> Si sigues haciendo recargas con todo tu capital disponible 
                  ({formatearMoneda(datos.saldoFinal)}), podrías realizar {simulacion.numeroRecargas} recargas más y 
                  ganar {formatearMoneda(simulacion.totalComisionesGanadas)} en total ({simulacion.rendimientoEfectivoRedondeado}% de rendimiento efectivo).
                </small>
              </Alert>
            </>
          )}
          
        </Card.Body>
      </Card>
    );
  };

  const DetallesReporteTabs = ({ reporte, formatearMoneda }) => {
    const [activeDetailTab, setActiveDetailTab] = useState('incrementos');

    return (
      <>
        <div className="accordion-tabs-style">
          <button
            className={`accordion-tab-button ${activeDetailTab === 'incrementos' ? 'active' : ''}`}
            onClick={() => setActiveDetailTab('incrementos')}
          >
            <FiTrendingUp /> Incrementos
            <Badge bg="primary">{reporte.detalles.incrementos.length}</Badge>
          </button>
          <button
            className={`accordion-tab-button ${activeDetailTab === 'depositos' ? 'active' : ''}`}
            onClick={() => setActiveDetailTab('depositos')}
          >
            <FiDollarSign /> Depósitos
            <Badge bg="success">{reporte.detalles.depositos.length}</Badge>
          </button>
          <button
            className={`accordion-tab-button ${activeDetailTab === 'recargas' ? 'active' : ''}`}
            onClick={() => setActiveDetailTab('recargas')}
          >
            <FiRefreshCw /> Recargas
            <Badge bg="info">{reporte.detalles.recargas.length}</Badge>
          </button>
        </div>

        <Card className="shadow-sm">
          <Card.Body className="p-0">
            {activeDetailTab === 'incrementos' && (
              reporte.detalles.incrementos.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  No hay incrementos en este periodo
                </div>
              ) : (
                <div className="table-responsive">
                  <Table size="sm" hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="small">Fecha</th>
                        <th className="small">Tipo</th>
                        <th className="small text-end">Incremento</th>
                        <th className="small text-end">Depósito</th>
                        <th className="small text-end">Ganancia</th>
                        <th className="small text-end">%</th>
                        <th className="small">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.detalles.incrementos.map(inc => (
                        <tr key={inc.id}>
                          <td className="small" data-label="Fecha">{inc.fecha}</td>
                          <td className="small" data-label="Tipo">
                            <Badge bg="secondary" className="badge-incremento">
                              {inc.tipo.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="small text-end text-success fw-bold" data-label="Incremento">
                            {formatearMoneda(inc.incremento)}
                          </td>
                          <td className="small text-end" data-label="Depósito">
                            {formatearMoneda(inc.depositosAsociados)}
                          </td>
                          <td className="small text-end text-success fw-bold" data-label="Ganancia">
                            {formatearMoneda(inc.ganancia)}
                          </td>
                          <td className="small text-end" data-label="%">{inc.porcentaje.toFixed(1)}%</td>
                          <td className="small" data-label="Operadora">
                            <Badge bg={inc.estado === 'asignado' ? 'success' : 'warning'}>
                              {inc.estado}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )
            )}

            {activeDetailTab === 'depositos' && (
              reporte.detalles.depositos.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  No hay depósitos en este periodo
                </div>
              ) : (
                <div className="table-responsive">
                  <Table size="sm" hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="small">Fecha</th>
                        <th className="small text-end">Monto</th>
                        <th className="small">Método</th>
                        <th className="small">Usuario</th>
                        <th className="small">Asignado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.detalles.depositos.map(dep => (
                        <tr key={dep.id}>
                          <td className="small" data-label="Fecha">{dep.fecha}</td>
                          <td className="small text-end fw-bold" data-label="Monto">
                            {formatearMoneda(dep.monto)}
                          </td>
                          <td className="small" data-label="Método">{dep.metodoPago || '-'}</td>
                          <td className="small" data-label="Usuario">{dep.usuario || '-'}</td>
                          <td className="small" data-label="Asignado">
                            <Badge bg={dep.asignado ? 'success' : 'warning'}>
                              {dep.asignado ? 'Sí' : 'No'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )
            )}

            {activeDetailTab === 'recargas' && (
              reporte.detalles.recargas.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  No hay recargas en este periodo
                </div>
              ) : (
                <div className="table-responsive recargas-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <Table size="sm" hover className="mb-0 recargas-table">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th className="small">Fecha</th>
                        <th className="small">Número</th>
                        <th className="small text-end">Valor</th>
                        <th className="small text-end">Comisión</th>
                        <th className="small text-end">Saldo</th>
                        <th className="small">Operadora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.detalles.recargas.map((rec, idx) => (
                        <tr key={idx}>
                          <td className="small" data-label="Fecha">{rec.fecha}</td>
                          <td className="small" data-label="Número">{rec.numeroRecarga || '-'}</td>
                          <td className="small text-end text-danger" data-label="Valor">
                            -{formatearMoneda(rec.valor)}
                          </td>
                          <td className="small text-end text-success" data-label="Comisión">
                            +{formatearMoneda(rec.comision)}
                          </td>
                          <td className="small text-end" data-label="Saldo">
                            {rec.saldoNuevo ? formatearMoneda(rec.saldoNuevo) : '-'}
                          </td>
                          <td className="small" data-label="Estado">
                                {rec.operadora}

                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )
            )}
          </Card.Body>
        </Card>
      </>
    );
  };


  const ToastFlotante = () => {
  if (!alert.show) return null;
  
  const colores = {
    success: { bg: '#198754', icon: <FiCheckCircle /> },
    danger:  { bg: '#dc3545', icon: <FiX /> },
    warning: { bg: '#fd7e14', icon: <FiAlertTriangle /> },
    info:    { bg: '#0dcaf0', icon: <FiInfo /> },
  };
  
    const { bg, icon } = colores[alert.variant] || colores.info;
    
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        minWidth: '320px',
        maxWidth: '500px',
        backgroundColor: bg,
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: 'fadeInDown 0.3s ease',
      }}>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
        <span style={{ flex: 1 }}>{alert.message}</span>
        <button
          onClick={() => setAlert({ ...alert, show: false })}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '1.1rem',
            padding: '0 4px',
            opacity: 0.8,
          }}
        >
          <FiX />
        </button>
      </div>
    );
  };

  return (
      <>

            {alert.show && (
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        minWidth: '320px',
        maxWidth: '500px',
        backgroundColor: alert.variant === 'success' ? '#0A74DA' : alert.variant === 'danger' ? '#dc3545' : alert.variant === 'warning' ? '#fd7e14' : '#0dcaf0',
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: 'fadeInDown 0.3s ease',
      }}>
        <span style={{ fontSize: '1.2rem' }}>
          {alert.variant === 'success' ? <FiCheckCircle /> : alert.variant === 'danger' ? <FiX /> : <FiAlertTriangle />}
        </span>
        <span style={{ flex: 1 }}>{alert.message}</span>
        <button
          onClick={() => setAlert({ ...alert, show: false })}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', opacity: 0.8 }}
        >
          <FiX />
        </button>
      </div>
    )}

    <Modal 
      show={show} 
      onHide={handleClose} 
      size="xl" 
      centered 
      className="incrementos-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <FiBarChart2 />
          Gestión de Contabilidad
          <Badge 
            bg={proveedor === 'general' ? 'primary' : 'success'} 
            className="ms-3"
          >
            {proveedor === 'general' ? 'General (2611)' : 'Movistar (2612)'}
          </Badge>
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body style={{ maxHeight: '75vh', overflowY: 'auto' }}>


        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
          
          <Tab 
            eventKey="alertas" 
            title={
              <span>
                <FiBell /> Alertas {alertas.length > 0 && <Badge bg="danger">{alertas.length}</Badge>}
              </span>
            }
          >
            {loading ? (
              <div className="text-center p-5">
                <Spinner animation="border" />
              </div>
            ) : (
              <>
                {estadisticasAlertas && (
                  <Row className="mb-4">
                    <Col md={3} xs={6}>
                      <Card className="stat-card stat-card-ligth text-center">
                        <Card.Body>
                          <h2>{estadisticasAlertas.total}</h2>
                          <small>Total Alertas</small>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3} xs={6}>
                      <Card className="stat-card stat-card-ligth text-center">
                        <Card.Body>
                          <h2>{estadisticasAlertas.porUrgencia.alta}</h2>
                          <small>Urgencia Alta</small>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3} xs={6}>
                      <Card className="stat-card stat-card-ligth text-center">
                        <Card.Body>
                          <h2>{estadisticasAlertas.porTipo.incrementos}</h2>
                          <small>Incrementos</small>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3} xs={6}>
                      <Card className="stat-card stat-card-ligth text-center">
                        <Card.Body>
                          <h2>{estadisticasAlertas.porTipo.depositos}</h2>
                          <small>Depósitos</small>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                )}

                {alertas.length === 0 ? (
                  <Alert variant="success">
                    <FiCheckCircle /> No hay alertas pendientes para <strong>{proveedor === 'general' ? 'General' : 'Movistar'}</strong>
                  </Alert>
                ) : (
                  <div>
                    {alertas.map((alerta, idx) => (
                      <Card key={idx} className="mb-3 shadow-sm incremento-card">
                        <Card.Body>
                          <Row className="align-items-center">
                            <Col md={1}>
                              <Badge bg={getUrgenciaColor(alerta.urgencia)} pill style={{ fontSize: '1.2rem' }}>
                                <FiAlertTriangle />
                              </Badge>
                            </Col>
                            <Col md={7}>
                              <h5 className="mb-1">
                                <Badge bg={getUrgenciaColor(alerta.urgencia)} className="me-2">
                                  {alerta.urgencia.toUpperCase()}
                                </Badge>
                                {alerta.titulo}
                              </h5>
                              <p className="mb-1">{alerta.mensaje}</p>
                              <small className="text-muted">
                                {alerta.horasTranscurridas > 0 && (
                                  <>
                                    <FiClock /> {alerta.horasTranscurridas}h
                                  </>
                                )}
                                {alerta.tipoIncremento && ` | ${getTipoIncrementoLabel(alerta.tipoIncremento)}`}
                              </small>
                            </Col>
                            <Col md={2} className="text-center">
                              <h3 className="text-success mb-0">${alerta.monto}</h3>
                            </Col>
                            <Col md={2} className="text-end">
                              {alerta.tipo === 'incremento_pendiente' && (
                                <Button 
                                  variant="primary" 
                                  size="sm"
                                  className="btn-incrementos"
                                  onClick={async () => {
                                    if (incrementos.length === 0) {
                                      setLoading(true);
                                      try {
                                        await cargarIncrementos();
                                        setTimeout(() => {
                                          const inc = incrementos.find(i => i.id === alerta.id);
                                          if (inc) {
                                            setSelectedIncremento(inc);
                                            setActiveTab('asignar');
                                          }
                                        }, 100);
                                      } catch (error) {
                                        mostrarAlerta('Error al cargar incremento', 'danger');
                                      } finally {
                                        setLoading(false);
                                      }
                                    } else {
                                      const inc = incrementos.find(i => i.id === alerta.id);
                                      if (inc) {
                                        setSelectedIncremento(inc);
                                        setActiveTab('asignar');
                                      } else {
                                        setLoading(true);
                                        try {
                                          await cargarIncrementos();
                                          setTimeout(() => {
                                            const inc = incrementos.find(i => i.id === alerta.id);
                                            if (inc) {
                                              setSelectedIncremento(inc);
                                              setActiveTab('asignar');
                                            } else {
                                              mostrarAlerta('No se encontró el incremento', 'warning');
                                            }
                                          }, 100);
                                        } catch (error) {
                                          mostrarAlerta('Error al cargar incremento', 'danger');
                                        } finally {
                                          setLoading(false);
                                        }
                                      }
                                    }
                                  }}
                                >
                                  <FiLink /> Asignar
                                </Button>
                              )}
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </Tab>

          {incrementos.length > 0 && (
            <Tab 
              eventKey="notificaciones" 
              title={
                <span>
                  <FiFileText /> Incrementos <Badge bg="danger">{incrementos.length}</Badge>
                </span>
              }
            >
              {loading ? (
                <div className="text-center p-5">
                  <Spinner animation="border" />
                </div>
              ) : (
                <div>
                  {incrementos.map(inc => {
                    const saldoAnterior = parseFloat(inc.saldoAnterior);
                    const saldoNuevo = parseFloat(inc.saldoNuevo);
                    const diferencia = parseFloat(inc.diferencia);
                    
                    return (
                      <Card key={inc.id} className="mb-3 shadow-sm incremento-card">
                        <Card.Body>
                          <Row>
                            <Col lg={12} md={12}>
                              <h5>
                                <Badge bg="warning" text="dark">#{inc.id}</Badge>
                                <Badge bg={proveedor === 'general' ? 'primary' : 'success'} className="ms-2">
                                  {getTipoIncrementoLabel(inc.tipoIncremento)}
                                </Badge>
                                <small className="text-muted ms-2">
                                  <FiClock /> {new Date(inc.fecha).toLocaleString()}
                                </small>
                              </h5>
                              <p className="mb-1">
                                <strong>Operadora:</strong> {inc.operadora}
                              </p>
                              
                              {inc.comisionAcumulada && (
                                <Alert variant="info" className="mt-2 mb-2 py-2">
                                  <FiTrendingUp /> Comisiones acumuladas: <strong>${parseFloat(inc.comisionAcumulada).toFixed(2)}</strong>
                                  {' '}({inc.cantidadRecargasComision} recargas)
                                </Alert>
                              )}
                              
                              <div className="mt-2 p-2 bg-light rounded">
                                <Row>
                                  <Col md={3}>
                                    <small className="text-muted">Saldo anterior</small>
                                    <p className="mb-0"><strong>${saldoAnterior.toFixed(2)}</strong></p>
                                  </Col>
                                  <Col md={3}>
                                    <small className="text-muted">Saldo nuevo</small>
                                    <p className="mb-0"><strong>${saldoNuevo.toFixed(2)}</strong></p>
                                  </Col>
                                  <Col md={3}>
                                    <small className="text-muted">Diferencia</small>
                                    <h4 className="mb-0 text-success">${diferencia.toFixed(2)}</h4>
                                  </Col>
                                  <Col md={3} s={12} className="d-flex w-100">
                                    <Button 
                                      variant="success" 
                                      size="l"
                                      className="btn-incrementos btn-success-gradient"
                                      onClick={() => {
                                        setSelectedIncremento(inc);
                                        setActiveTab('asignar');
                                      }}
                                    >
                                      <FiCheckCircle /> Asignar Depósitos
                                    </Button>
                                  </Col>
                                </Row>
                              </div>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    );
                  })}
                </div>
              )}
            </Tab>
          )}

          <Tab eventKey="depositos" title={<span><FiDollarSign /> Depósitos</span>}>
            <Card className="shadow-sm deposito-card">
              <Card.Body>
                <h5 className="mb-3">
                  Registrar Nuevo Depósito -{' '}
                  <Badge bg={proveedor === 'general' ? 'primary' : 'success'}>
                    {proveedor === 'general' ? 'General' : 'Movistar'}
                  </Badge>
                </h5>
                
                {incrementoMaximo > 0 && (
                  <Alert variant="info">
                    <FiTrendingUp /> <strong>Incremento máximo disponible:</strong> ${incrementoMaximo.toFixed(2)}
                  </Alert>
                )}
                
                <Form onSubmit={handleRegistrarDeposito}>
                  <div className="deposito-form-row">
                    <Form.Group>
                      <Form.Label>Monto *</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={nuevoDeposito.monto}
                        onChange={(e) => setNuevoDeposito({ ...nuevoDeposito, monto: e.target.value })}
                        max={incrementoMaximo > 0 ? incrementoMaximo : undefined}
                        required
                      />
                    </Form.Group>
                    
                    <Form.Group>
                      <Form.Label>Usuario/Tienda *</Form.Label>
                      <Select
                        options={opcionesUsuarios}
                        value={opcionesUsuarios.find(opt => opt.value === parseInt(nuevoDeposito.usuarioId)) || null}
                        onChange={(selectedOption) => {
                          setNuevoDeposito({ 
                            ...nuevoDeposito, 
                            usuarioId: selectedOption ? selectedOption.value : '' 
                          });
                        }}
                        placeholder="Buscar usuario o tienda..."
                        isClearable
                        isSearchable
                        noOptionsMessage={() => "No se encontraron usuarios"}
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: '38px',
                            borderColor: '#ced4da'
                          })
                        }}
                      />
                    </Form.Group>
                    
                    <Form.Group>
                      <Form.Label>Tipo de Depósito</Form.Label>
                      <Form.Select
                        value={nuevoDeposito.tipoDeposito}
                        onChange={(e) => setNuevoDeposito({ ...nuevoDeposito, tipoDeposito: e.target.value })}
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="ajuste">Ajuste</option>
                        <option value="otro">Otro</option>
                      </Form.Select>
                    </Form.Group>
                    
                    <Form.Group>
                      <Form.Label>Referencia</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Ej: TRANS-123"
                        value={nuevoDeposito.referencia}
                        onChange={(e) => setNuevoDeposito({ ...nuevoDeposito, referencia: e.target.value })}
                      />
                    </Form.Group>
                  </div>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Notas</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={nuevoDeposito.notas}
                      onChange={(e) => setNuevoDeposito({ ...nuevoDeposito, notas: e.target.value })}
                      placeholder="Información adicional..."
                    />
                  </Form.Group>
                  
                  <Button type="submit" variant="success" disabled={loading} className="btn-incrementos btn-success-gradient">
                    {loading ? <Spinner size="sm" /> : <><FiSave /> Registrar Depósito</>}
                  </Button>
                </Form>
              </Card.Body>
            </Card>

            <Card className="mt-3 shadow-sm">
              <Card.Body>
                <h5 className="mb-3">
                  <FiFileText /> Depósitos Disponibles{' '}
                  <Badge bg="secondary">{depositosDisponibles.length}</Badge>
                </h5>
                {depositosDisponibles.length === 0 ? (
                  <Alert variant="info">No hay depósitos sin asignar</Alert>
                ) : (
                  <div className="table-responsive">
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Monto</th>
                          <th>Usuario</th>
                          <th>Tipo</th>
                          <th>Referencia</th>
                          <th>Fecha</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {depositosDisponibles.map(dep => (
                          <tr key={dep.id}>
                            <td data-label="#">{dep.id}</td>
                            <td data-label="Monto">
                              <strong className="text-success">${parseFloat(dep.monto).toFixed(2)}</strong>
                            </td>
                            <td data-label="Usuario">
                              {dep.Usuario?.nombres_apellidos || dep.Usuario?.nombre_tienda}
                            </td>
                            <td data-label="Tipo">
                              <Badge bg="info">{dep.tipoDeposito}</Badge>
                            </td>
                            <td data-label="Referencia">{dep.referencia || '-'}</td>
                            <td data-label="Fecha">{new Date(dep.fecha).toLocaleDateString()}</td>
                            <td data-label="Estado">
                              <Badge bg={dep.verificado ? 'success' : 'warning'}>
                                {dep.verificado ? <><FiCheckCircle /> Verificado</> : 'Pendiente'}
                              </Badge>
                            </td>
                            <td data-label="Acciones">
                              <div className="d-flex gap-1">
                                {!dep.verificado && (
                                  <Button 
                                    variant="outline-success" 
                                    size="sm"
                                    onClick={() => handleVerificarDeposito(dep.id)}
                                  >
                                    <FiCheck />
                                  </Button>
                                )}
                                <Button 
                                  variant="outline-danger" 
                                  size="sm"
                                  onClick={() => handleEliminarDeposito(dep.id)}
                                  disabled={loading}
                                >
                                  <FiTrash2 />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Tab>

          {selectedIncremento && (
            <Tab eventKey="asignar" title={<span><FiLink /> Asignar</span>}>
              <div>
                <Card className="mb-3 shadow-sm border-primary">
                  <Card.Body>
                    <h5>Incremento Seleccionado</h5>
                    <Row className="mt-3">
                      <Col md={2}>
                        <small className="text-muted">ID</small>
                        <p><Badge bg="primary">#{selectedIncremento.id}</Badge></p>
                      </Col>
                      <Col md={2}>
                        <small className="text-muted">Tipo</small>
                        <p><Badge bg="info">{getTipoIncrementoLabel(selectedIncremento.tipoIncremento)}</Badge></p>
                      </Col>
                      <Col md={3}>
                        <small className="text-muted">Operadora</small>
                        <p><strong>{selectedIncremento.operadora}</strong></p>
                      </Col>
                      <Col md={2}>
                        <small className="text-muted">Fecha</small>
                        <p>{new Date(selectedIncremento.fecha).toLocaleDateString()}</p>
                      </Col>
                      <Col md={3}>
                        <small className="text-muted">Incremento Total</small>
                        <h4 className="text-success">${parseFloat(selectedIncremento.diferencia).toFixed(2)}</h4>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                <Card className="shadow-sm">
                  <Card.Body>
                    <h5 className="mb-3">Seleccionar Depósitos</h5>
                    {depositosDisponibles.length === 0 ? (
                      <Alert variant="warning">
                        No hay depósitos disponibles. Registra depósitos primero.
                      </Alert>
                    ) : (
                      <>
                        <ListGroup className="mb-3">
                          {depositosDisponibles.map(dep => (
                            <ListGroup.Item 
                              key={dep.id}
                              active={depositosSeleccionados.includes(dep.id)}
                              onClick={() => toggleDepositoSeleccionado(dep.id)}
                              className="deposito-selectable"
                            >
                              <Row className="align-items-center">
                                <Col md={1}>
                                  <Form.Check
                                    type="checkbox"
                                    checked={depositosSeleccionados.includes(dep.id)}
                                    readOnly
                                  />
                                </Col>
                                <Col md={2}>
                                  <strong className="text-success">${parseFloat(dep.monto).toFixed(2)}</strong>
                                </Col>
                                <Col md={1}>
                                  <Badge bg="info">{dep.tipoDeposito}</Badge>
                                </Col>
                                <Col md={4}>
                                  {dep.Usuario?.nombres_apellidos || dep.Usuario?.nombre_tienda}
                                  <Badge bg="secondary" className="ms-2">{dep.Usuario?.rol}</Badge>
                                </Col>
                                <Col md={2}>
                                  {dep.referencia && <small className="text-muted">{dep.referencia}</small>}
                                </Col>
                                <Col md={2} className="text-end">
                                  <small className="text-muted">{new Date(dep.fecha).toLocaleDateString()}</small>
                                </Col>
                              </Row>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>

                        <Card className="resumen-financiero mb-3">
                          <Card.Body>
                            <Row className="text-center">
                              <Col md={4}>
                                <div className="resumen-item">
                                  <div className="resumen-label">Incremento Total</div>
                                  <div className="resumen-valor">${parseFloat(selectedIncremento.diferencia).toFixed(2)}</div>
                                </div>
                              </Col>
                              <Col md={4}>
                                <div className="resumen-item">
                                  <div className="resumen-label">Total Seleccionado</div>
                                  <div className="resumen-valor">${calcularTotalSeleccionado().toFixed(2)}</div>
                                </div>
                              </Col>
                              <Col md={4}>
                                <div className="resumen-item resumen-ganancia">
                                  <div className="resumen-label">Ganancia Estimada</div>
                                  <div className="resumen-valor">
                                    ${(parseFloat(selectedIncremento.diferencia) - calcularTotalSeleccionado()).toFixed(2)}
                                    <small className="d-block" style={{ fontSize: '0.7rem' }}>
                                      {calcularTotalSeleccionado() > 0
                                        ? `(${(
                                            ((parseFloat(selectedIncremento.diferencia) - calcularTotalSeleccionado()) /
                                              calcularTotalSeleccionado()) *
                                            100
                                          ).toFixed(1)}%)`
                                        : '(Sin datos)'}
                                    </small>
                                  </div>
                                </div>
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>

                        <Form.Group className="mb-3">
                          <Form.Label>Notas de asignación</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            value={notasAsignacion}
                            onChange={(e) => setNotasAsignacion(e.target.value)}
                            placeholder="Comentarios adicionales..."
                          />
                        </Form.Group>

                        <div className="action-btn-group">
                          <Button 
                            variant="success" 
                            onClick={handleAsignarDepositos}
                            disabled={loading || depositosSeleccionados.length === 0}
                            className="btn-incrementos btn-success-gradient"
                          >
                            {loading ? <Spinner size="sm" /> : <><FiCheckCircle /> Confirmar Asignación</>}
                          </Button>
                          <Button 
                            variant="outline-secondary"
                            onClick={() => {
                              setSelectedIncremento(null);
                              setDepositosSeleccionados([]);
                              setNotasAsignacion('');
                            }}
                            className="btn-incrementos"
                          >
                            <FiX /> Cancelar
                          </Button>
                        </div>
                      </>
                    )}
                  </Card.Body>
                </Card>
              </div>
            </Tab>
          )}

          <Tab eventKey="reportes" title={<span><FiBarChart2 /> Reportes</span>}>
            
            <Card className="mb-3 shadow-sm">
              <Card.Body>
                <div className="date-controls-row">
                  <Form.Group>
                    <Form.Label className="small fw-bold">
                      <FiCalendar /> Fecha Inicio
                    </Form.Label>
                    <Form.Control
                      type="date"
                      size="sm"
                      value={fechaInicio}
                      min={fechaMinima}
                      max={fechaMaxima}
                      onChange={handleFechaInicioChange}
                    />
                  </Form.Group>
                  
                  <Form.Group>
                    <Form.Label className="small fw-bold">
                      <FiCalendar /> Fecha Fin
                    </Form.Label>
                    <Form.Control
                      type="date"
                      size="sm"
                      value={fechaFin}
                      min={fechaInicio}
                      max={fechaMaxima}
                      onChange={handleFechaFinChange}
                    />
                  </Form.Group>
                  
                  <Button 
                    variant="success"
                    size="sm"
                    className="btn-incrementos btn-success-gradient"
                    onClick={exportarExcel}
                    disabled={!reporte || loading}
                  >
                    <FiDownload /> Exportar Excel
                  </Button>
                </div>
              </Card.Body>
            </Card>

            {reporteError && (
              <Alert variant="danger">
                <strong>Error:</strong> {reporteError}
                <Button 
                  size="sm" 
                  variant="outline-danger" 
                  className="ms-3"
                  onClick={cargarReporteCompleto}
                >
                  <FiRefreshCw /> Reintentar
                </Button>
              </Alert>
            )}

            {loading && !reporte && (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted">Generando reporte...</p>
              </div>
            )}

            {reporte && (
              <>
                <Row className="mb-3">
                  
                  <Col md={4}>
                    <Card className="text-center shadow-sm stat-card-ligth ">

                      <Card.Body className="py-3">
                        <h4 className="mb-0" style={ { opacity: 0.7, color: 'black' }}>
                          {formatearMoneda(reporte.saldos.finalReal)}
                        </h4>
                        <small style={{ opacity: 0.6, color: 'black' }}>Saldo Actual</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  
                  <Col md={4}>
                    {proveedor === 'movistar' && porcentajeRealMovistar ? (
                      <Card className="text-center shadow-sm stat-card-ligth">
                        <Card.Body className="py-3">
                          <h4 className="mb-0 fw-bold" style={{ opacity: 0.7, color: 'black' }}>
                            {porcentajeRealMovistar.porcentajePeriodoRedondeado}%
                          </h4>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            opacity: 0.9, 
                            marginTop: '4px',
                            color: 'black',
                            opacity: 0.7
                          }}>
                            +{formatearMoneda(porcentajeRealMovistar.totalComisionesReales)} ganados
                          </div>
                        </Card.Body>
                      </Card>
                    ) : (
                      <Card className={`text-center shadow-sm ${
                        reporte.totales.incrementos === 0 ? 'stat-card-info' : 
                        reporte.totales.gananciaReal >= 0 ? 'stat-card-success' : 'stat-card-warning'
                      }`}>
                        <Card.Body className="py-3">
                          {reporte.totales.incrementos === 0 ? (
                            <>
                              <h4 className="mb-0" style={{ color: 'white' }}>-</h4>
                              <small style={{ opacity: 0.9, color: 'white' }}>Sin incrementos</small>
                            </>
                          ) : (
                            <>
                              <h4 className="mb-0" style={{ color: 'white' }}>
                                {formatearMoneda(reporte.totales.gananciaReal)}
                              </h4>
                              <small style={{ opacity: 0.9, color: 'white' }}>
                                Ganancia ({reporte.totales.porcentajeGanancia.toFixed(2)}%)
                              </small>
                            </>
                          )}
                        </Card.Body>
                      </Card>
                    )}
                  </Col>
                  
                  <Col md={4}>
                    <Card className="text-center shadow-sm stat-card-ligth">
                      <Card.Body className="py-3">
                        <h4 className="mb-0" style={{ opacity: 0.7, color: 'black' }}>
                          {reporte.contadores.recargas}
                        </h4>
                        <small style={{ opacity: 0.6, color: 'black' }}>Recargas</small>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Card className="mb-3 shadow-sm">
                  <Card.Header className="bg-white">
                    <h6 className="mb-0 fw-bold"><FiBarChart2 /> Resumen Financiero</h6>
                  </Card.Header>
                  <Card.Body>
                    {proveedor === 'movistar' && porcentajeRealMovistar && !porcentajeRealMovistar.error ? (
                      <PanelAnalisisMovistar 
                        datos={porcentajeRealMovistar}
                        simulacion={simulacionRendimiento}
                        loading={cargandoPorcentaje || cargandoSimulacion}
                      />
                    ) : null}
                    
                    <Row className="small mt-3">
                      <Col md={6}>
                        <div className="d-flex justify-content-between py-2 border-bottom">
                          <span className="text-muted">Periodo:</span>
                          <span className="fw-bold">
                            {reporte.periodo.fechaInicio.split(' ')[0]} - {reporte.periodo.fechaFin.split(' ')[0]}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between py-2 border-bottom">
                          <span className="text-muted">Saldo Inicial:</span>
                          <span className="fw-bold">{formatearMoneda(reporte.saldos.inicial)}</span>
                        </div>
                        <div className="d-flex justify-content-between py-2 border-bottom">
                          <span className="text-muted">Total Incrementos:</span>
                          <span className={`fw-bold ${reporte.totales.incrementos > 0 ? 'text-success' : 'text-muted'}`}>
                            {reporte.totales.incrementos > 0 ? '+' : ''}{formatearMoneda(reporte.totales.incrementos)}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between py-2">
                          <span className="text-muted">Total Depositado:</span>
                          <span className="fw-bold">{formatearMoneda(reporte.totales.depositosAsignados)}</span>
                        </div>
                      </Col>
                      
                      <Col md={6}>
                        <div className="d-flex justify-content-between py-2 border-bottom">
                          <span className="text-muted">Total Recargado:</span>
                          <span className="fw-bold text-danger">
                            -{formatearMoneda(reporte.totales.recargas)}
                          </span>
                        </div>
                        {proveedor === 'movistar' && (
                          <div className="d-flex justify-content-between py-2 border-bottom">
                            <span className="text-muted">Comisiones:</span>
                            <span className="fw-bold text-success">
                              +{formatearMoneda(reporte.totales.comisiones)}
                            </span>
                          </div>
                        )}
                        <div className="d-flex justify-content-between py-2 border-bottom">
                          <span className="text-muted">Saldo Final:</span>
                          <span className="fw-bold">{formatearMoneda(reporte.saldos.finalReal)}</span>
                        </div>
                        <div className={`d-flex justify-content-between py-2 px-2 rounded ${
                          reporte.totales.incrementos === 0 ? 'bg-light' : 
                          reporte.totales.gananciaReal >= 0 ? 'bg-success bg-opacity-10' : 'bg-warning bg-opacity-10'
                        }`}>
                          <span className="text-muted fw-bold">Ganancia Real:</span>
                            {proveedor === 'movistar' ? (
                              // Para Movistar: SIEMPRE mostrar comisiones
                              reporte.totales.comisiones > 0 ? (
                                <span className="fw-bold fs-5 text-success">
                                  {formatearMoneda(reporte.totales.comisiones)}
                                </span>
                              ) : (
                                <span className="fw-bold text-muted">$0.00</span>
                              )
                            ) : (
                              // Para General: depende de incrementos
                              reporte.totales.incrementos === 0 ? (
                                <span className="fw-bold text-muted">Sin datos</span>
                              ) : (
                                <span className="fw-bold fs-5 text-success">
                                  {formatearMoneda(reporte.totales.gananciaReal)}
                                </span>
                              )
                            )}
                        </div>
                        
                        {reporte.totales.incrementos === 0 && (
                          <Alert variant="info" className="mt-3 mb-0 py-2">
                            <small>
                              <FiAlertTriangle /> No hay incrementos detectados en este periodo.
                            </small>
                          </Alert>
                        )}
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                <DetallesReporteTabs reporte={reporte} formatearMoneda={formatearMoneda} />

                <div className="mt-3 text-center">
                  <small className="text-muted">
                    Generado: {reporte.metadata.generadoEn} | Zona: {reporte.periodo.timezone}
                  </small>
                </div>
              </>
            )}

          </Tab>

        </Tabs>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} className="btn-incrementos">
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
      </>

  );
};

export default IncrementosModal;

