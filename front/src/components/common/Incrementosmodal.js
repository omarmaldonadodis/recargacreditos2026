// front/src/components/common/IncrementosModal.js - VERSIÓN MEJORADA CON ICONOS Y AUTO-REPORTE
import React, { useState, useEffect } from 'react';
import { 
  Modal, Tabs, Tab, Badge, Button, Form, Table, Alert, 
  Spinner, Card, Row, Col, ListGroup, Accordion
} from 'react-bootstrap';
import * as XLSX from 'xlsx';
import moment from 'moment-timezone';
import api from '../../services/axiosConfig';
import './IncrementosModal.css';

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

  // ===== ZONA HORARIA =====
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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


  // ============= EFECTOS =============
  useEffect(() => {
    if (show) {
      cargarDatos();
    } else {
      // REINICIAR TODOS LOS ESTADOS AL CERRAR EL MODAL
      resetearEstados();
    }
  }, [show, proveedor, activeTab]);

  // Inicializar fechas para reportes
  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0];
    setFechaMaxima(hoy);
    setFechaFin(hoy);
  }, []);

  // NUEVO: Auto-generar reporte cuando cambian las fechas
  useEffect(() => {
    if (activeTab === 'reportes' && fechaInicio && fechaFin && show) {
      // Validar que fecha inicio no sea mayor a fecha fin
      if (new Date(fechaInicio) <= new Date(fechaFin)) {
        cargarReporteCompleto();
      }
    }
  }, [fechaInicio, fechaFin, activeTab, show]);

  // NUEVO: Efecto para manejar cambios de tab automáticos
  useEffect(() => {
    // Si estamos en el tab de incrementos pero ya no hay incrementos, volver a alertas
    if (activeTab === 'notificaciones' && incrementos.length === 0) {
      setActiveTab('alertas');
    }
    
    // Si estamos en el tab de asignar pero ya no hay incremento seleccionado, volver a alertas
    if (activeTab === 'asignar' && !selectedIncremento) {
      setActiveTab('alertas');
    }
  }, [incrementos.length, selectedIncremento, activeTab]);

  useEffect(() => {
  if (activeTab === 'reportes' && fechaInicio && fechaFin && show) {
    if (proveedor === 'movistar') {
      cargarPorcentajeRealMovistar();
    } else {
      setPorcentajeRealMovistar(null);
    }
  }
}, [fechaInicio, fechaFin, activeTab, show, proveedor]);

  // NUEVO: Función para resetear todos los estados
  const resetearEstados = () => {
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
  
  // 🔥 AGREGAR ESTOS:
  setPorcentajeRealMovistar(null);
  setCargandoPorcentaje(false);
};
const cargarDatos = async () => {
  setLoading(true);
  try {
    switch (activeTab) {
      case 'alertas':
        await cargarAlertas();
        await cargarEstadisticasAlertas();
        await cargarIncrementos(); // ⭐ AGREGAR ESTA LÍNEA - Cargar incrementos también en alertas
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
        // El reporte se cargará automáticamente por el useEffect
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

// ==================== CAMBIOS PARA front/src/components/common/Incrementosmodal.js ====================

// ============= 1. AGREGAR ESTADOS (después de los estados existentes) =============

const [porcentajeRealMovistar, setPorcentajeRealMovistar] = useState(null);
const [cargandoPorcentaje, setCargandoPorcentaje] = useState(false);

// ============= 2. CORREGIR FUNCIÓN cargarEstadisticasAlertas =============
// REEMPLAZAR la función existente con esta:

const cargarEstadisticasAlertas = async () => {
  try {
    const response = await api.get('/alertas/estadisticas');
    
    // 🔥 FILTRAR ESTADÍSTICAS POR PROVEEDOR ACTUAL
    const estadisticasFiltradas = {
      total: alertas.length, // Usar alertas ya filtradas
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

  // ============= FUNCIÓN PARA CARGAR REPORTE COMPLETO =============
  
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

  // ============= VALIDACIÓN DE FECHAS =============
  
  const handleFechaInicioChange = (e) => {
    const newFechaInicio = e.target.value;
    
    // Validar que fecha inicio no sea mayor a fecha fin
    if (fechaFin && new Date(newFechaInicio) > new Date(fechaFin)) {
      mostrarAlerta('La fecha de inicio no puede ser mayor a la fecha de fin', 'warning');
      return;
    }
    
    setFechaInicio(newFechaInicio);
  };

  const handleFechaFinChange = (e) => {
    const newFechaFin = e.target.value;
    
    // Validar que fecha fin no sea menor a fecha inicio
    if (fechaInicio && new Date(newFechaFin) < new Date(fechaInicio)) {
      mostrarAlerta('La fecha de fin no puede ser menor a la fecha de inicio', 'warning');
      return;
    }
    
    setFechaFin(newFechaFin);
  };

  // ============= FUNCIÓN PARA EXPORTAR EXCEL =============
  
  const exportarExcel = () => {
    if (!reporte) return;

    const wb = XLSX.utils.book_new();

    // HOJA 1: RESUMEN con formato mejorado
    const resumenData = [
      ['REPORTE DE CONTABILIDAD - GESTOPAGO'],
      ['Proveedor:', proveedor.toUpperCase()],
      ['Periodo:', `${reporte.periodo.fechaInicio} a ${reporte.periodo.fechaFin}`],
      ['Generado:', reporte.metadata.generadoEn],
      [],
      ['SALDOS'],
      ['Saldo Inicial:', reporte.saldos.inicial],
      ['Saldo Final Real:', reporte.saldos.finalReal],
      ['Diferencia:', reporte.saldos.diferencia],
      ['Estado:', reporte.saldos.consistente ? 'Consistente' : 'Inconsistente'],
      [],
      ['TOTALES'],
      ['Incrementos:', reporte.totales.incrementos],
      ['Depositado:', reporte.totales.depositosAsignados],
      ['Recargado:', reporte.totales.recargas],
      ['Ganancia Real:', reporte.totales.incrementos === 0 ? 0 : reporte.totales.gananciaReal],
      ['Porcentaje:', reporte.totales.incrementos === 0 ? 0 : reporte.totales.porcentajeGanancia / 100],
      [],
      ['NOTA:', reporte.totales.incrementos === 0 ? 'No hay incrementos en este periodo' : '']
    ];

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    
    // Aplicar formato de número a las celdas de dinero
    if (!wsResumen['!cols']) wsResumen['!cols'] = [];
    wsResumen['!cols'][0] = { wch: 25 };
    wsResumen['!cols'][1] = { wch: 20 };
    
    // Formato de moneda para celdas específicas
    ['B7', 'B8', 'B9', 'B13', 'B14', 'B15', 'B16'].forEach(cell => {
      if (wsResumen[cell]) {
        wsResumen[cell].t = 'n';
        wsResumen[cell].z = '"$"#,##0.00';
      }
    });
    
    // Formato de porcentaje
    if (wsResumen['B17']) {
      wsResumen['B17'].t = 'n';
      wsResumen['B17'].z = '0.00%';
    }
    
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // HOJA 2: INCREMENTOS
    if (reporte.detalles.incrementos.length > 0) {
      const incrementosHeaders = [
        'ID', 'Fecha', 'Tipo', 'Incremento', 'Depósitos', 'Ganancia', 'Porcentaje', 'Estado'
      ];
      
      const incrementosData = reporte.detalles.incrementos.map(inc => [
        inc.id,
        inc.fecha,
        inc.tipo,
        inc.incremento,
        inc.depositosAsociados,
        inc.ganancia,
        inc.porcentaje / 100,
        inc.estado
      ]);

      const wsIncrementos = XLSX.utils.aoa_to_sheet([
        incrementosHeaders,
        ...incrementosData
      ]);

      wsIncrementos['!cols'] = [
        { wch: 5 },  { wch: 18 }, { wch: 20 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
      ];
      
      const filas = incrementosData.length;
      for (let i = 2; i <= filas + 1; i++) {
        ['D', 'E', 'F'].forEach(col => {
          const cell = `${col}${i}`;
          if (wsIncrementos[cell]) {
            wsIncrementos[cell].t = 'n';
            wsIncrementos[cell].z = '"$"#,##0.00';
          }
        });
        
        const cellG = `G${i}`;
        if (wsIncrementos[cellG]) {
          wsIncrementos[cellG].t = 'n';
          wsIncrementos[cellG].z = '0.00%';
        }
      }

      XLSX.utils.book_append_sheet(wb, wsIncrementos, 'Incrementos');
    }

    // HOJA 3: DEPÓSITOS
    if (reporte.detalles.depositos.length > 0) {
      const depositosHeaders = [
        'ID', 'Fecha', 'Monto', 'Método', 'Usuario', 'Asignado'
      ];
      
      const depositosData = reporte.detalles.depositos.map(dep => [
        dep.id,
        dep.fecha,
        dep.monto,
        dep.metodoPago || '-',
        dep.usuario || '-',
        dep.asignado ? 'Sí' : 'No'
      ]);

      const wsDepositos = XLSX.utils.aoa_to_sheet([
        depositosHeaders,
        ...depositosData
      ]);

      wsDepositos['!cols'] = [
        { wch: 5 }, { wch: 18 }, { wch: 12 },
        { wch: 15 }, { wch: 20 }, { wch: 10 }
      ];
      
      const filasD = depositosData.length;
      for (let i = 2; i <= filasD + 1; i++) {
        const cell = `C${i}`;
        if (wsDepositos[cell]) {
          wsDepositos[cell].t = 'n';
          wsDepositos[cell].z = '"$"#,##0.00';
        }
      }

      XLSX.utils.book_append_sheet(wb, wsDepositos, 'Depósitos');
    }

    // HOJA 4: RECARGAS
    if (reporte.detalles.recargas.length > 0) {
      const recargasHeaders = [
        'Fecha', 'Número', 'Valor', 'Comisión', 'Saldo Nuevo', 'Exitoso'
      ];
      
      const recargasData = reporte.detalles.recargas.map(rec => [
        rec.fecha,
        rec.numeroRecarga || '-',
        rec.valor,
        rec.comision,
        rec.saldoNuevo || 0,
        rec.exitoso ? 'Sí' : 'No'
      ]);

      const wsRecargas = XLSX.utils.aoa_to_sheet([
        recargasHeaders,
        ...recargasData
      ]);

      wsRecargas['!cols'] = [
        { wch: 18 }, { wch: 15 }, { wch: 10 },
        { wch: 10 }, { wch: 12 }, { wch: 10 }
      ];
      
      const filasR = recargasData.length;
      for (let i = 2; i <= filasR + 1; i++) {
        ['C', 'D', 'E'].forEach(col => {
          const cell = `${col}${i}`;
          if (wsRecargas[cell]) {
            wsRecargas[cell].t = 'n';
            wsRecargas[cell].z = '"$"#,##0.00';
          }
        });
      }

      XLSX.utils.book_append_sheet(wb, wsRecargas, 'Recargas');
    }

    const nombreArchivo = `Reporte_${proveedor}_${fechaInicio}_${fechaFin}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  };

  // ============= FUNCIÓN PARA FORMATEAR MONEDA =============
  
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

  // ============= HANDLERS EXISTENTES =============
  
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

  // ============= UTILIDADES =============
  
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

  // ============= COMPONENTE DE TABS PARA DETALLES DEL REPORTE =============
  
  const DetallesReporteTabs = ({ reporte, formatearMoneda }) => {
    const [activeDetailTab, setActiveDetailTab] = useState('incrementos');

    return (
      <>
        {/* Tabs Horizontales Estilo Moderno */}
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

        {/* Contenido según tab activo */}
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
                          <td className="small" data-label="Estado">
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
                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <Table size="sm" hover className="mb-0">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th className="small">Fecha</th>
                        <th className="small">Número</th>
                        <th className="small text-end">Valor</th>
                        <th className="small text-end">Comisión</th>
                        <th className="small text-end">Saldo</th>
                        <th className="small">Estado</th>
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
                            <Badge bg={rec.exitoso ? 'success' : 'danger'}>
                              {rec.exitoso ? <FiCheckCircle /> : <FiX />}
                            </Badge>
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

  // ============= RENDER =============
  
  return (
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
        {alert.show && (
          <Alert variant={alert.variant} onClose={() => setAlert({ ...alert, show: false })} dismissible>
            {alert.message}
          </Alert>
        )}

        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
          
          {/* ============= TAB: ALERTAS ============= */}
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
                    <Col md={3}>
                      <Card className="stat-card stat-card-primary text-center">
                        <Card.Body>
                          <h2>{estadisticasAlertas.total}</h2>
                          <small>Total Alertas</small>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="stat-card stat-card-warning text-center">
                        <Card.Body>
                          <h2>{estadisticasAlertas.porUrgencia.alta}</h2>
                          <small>Urgencia Alta</small>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="stat-card stat-card-info text-center">
                        <Card.Body>
                          <h2>{estadisticasAlertas.porTipo.incrementos}</h2>
                          <small>Incrementos</small>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="stat-card stat-card-success text-center">
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
    // ⭐ NUEVA LÓGICA
    // Si no tenemos incrementos cargados, cargarlos primero
    if (incrementos.length === 0) {
      setLoading(true);
      try {
        await cargarIncrementos();
        // Esperar un momento para que el estado se actualice
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
      // Si ya tenemos incrementos cargados, proceder normal
      const inc = incrementos.find(i => i.id === alerta.id);
      if (inc) {
        setSelectedIncremento(inc);
        setActiveTab('asignar');
      } else {
        // Si no encontramos el incremento, recargar
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

          {/* ============= TAB: INCREMENTOS - SOLO SI HAY INCREMENTOS ============= */}
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

          {/* ============= TAB: DEPÓSITOS ============= */}
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
                      <Form.Select
                        value={nuevoDeposito.usuarioId}
                        onChange={(e) => setNuevoDeposito({ ...nuevoDeposito, usuarioId: e.target.value })}
                        required
                      >
                        <option value="">Seleccionar...</option>
                        {usuarios.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.displayName || `${user.tipoUsuario} - ${user.nombreCompleto}`}
                          </option>
                        ))}
                      </Form.Select>
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

          {/* ============= TAB: ASIGNAR - SOLO SI HAY INCREMENTO SELECCIONADO ============= */}
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

          {/* ============= TAB: REPORTES Y VERIFICACIÓN ============= */}
          <Tab eventKey="reportes" title={<span><FiBarChart2 /> Reportes</span>}>
            
            {/* CONTROLES */}
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

            {/* ERROR */}
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

            {/* LOADING */}
            {loading && !reporte && (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted">Generando reporte...</p>
              </div>
            )}

            {/* REPORTE */}
            {reporte && (
              <>
                {/* MÉTRICAS PRINCIPALES */}
                <Row className="mb-3">
                  <Col md={3}>
                    <Card className={`text-center shadow-sm ${reporte.saldos.consistente ? 'stat-card-success' : 'stat-card-warning'}`}>
                      <Card.Body className="py-3">
                        <div className="fs-1">
                          {reporte.saldos.consistente ? <FiCheckCircle /> : <FiAlertTriangle />}
                        </div>
                        <h6 className="mb-0" style={{ color: 'white !important' }}>
                          {reporte.saldos.consistente ? 'Consistente' : 'Revisar'}
                        </h6>
                        {!reporte.saldos.consistente && (
                          <small style={{ color: 'rgba(255,255,255,0.8)' }}>
                            Dif: {formatearMoneda(reporte.saldos.diferencia)}
                          </small>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center shadow-sm stat-card-primary">
                      <Card.Body className="py-3">
                        <h4 className="mb-0">{formatearMoneda(reporte.saldos.finalReal)}</h4>
                        <small style={{ opacity: 0.9 }}>Saldo Actual</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className={`text-center shadow-sm ${
                      reporte.totales.incrementos === 0 ? 'stat-card-info' : 
                      reporte.totales.gananciaReal >= 0 ? 'stat-card-success' : 'stat-card-warning'
                    }`}>
                      <Card.Body className="py-3">
                        {reporte.totales.incrementos === 0 ? (
                          <>
                            <h4 className="mb-0">-</h4>
                            <small style={{ opacity: 0.9 }}>Sin incrementos en el periodo</small>
                          </>
                        ) : (
                          <>
                            <h4 className="mb-0">{formatearMoneda(reporte.totales.gananciaReal)}</h4>
                            <small style={{ opacity: 0.9 }}>
                              Ganancia ({reporte.totales.porcentajeGanancia.toFixed(2)}%)
                            </small>
                          </>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center shadow-sm stat-card-info">
                      <Card.Body className="py-3">
                        <h4 className="mb-0">{reporte.contadores.recargas}</h4>
                        <small style={{ opacity: 0.9 }}>Recargas</small>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* RESUMEN FINANCIERO */}
                <Card className="mb-3 shadow-sm">
                  <Card.Header className="bg-white">
                    <h6 className="mb-0 fw-bold"><FiBarChart2 /> Resumen Financiero</h6>
                  </Card.Header>
                  <Card.Body>

                 <Row className="mb-3">
  {/* Card 1: Consistencia */}
  <Col md={3}>
    <Card className={`text-center shadow-sm ${reporte.saldos.consistente ? 'stat-card-success' : 'stat-card-warning'}`}>
      <Card.Body className="py-3">
        <div className="fs-1">
          {reporte.saldos.consistente ? <FiCheckCircle /> : <FiAlertTriangle />}
        </div>
        <h6 className="mb-0" style={{ color: 'white' }}>
          {reporte.saldos.consistente ? 'Consistente' : 'Revisar'}
        </h6>
        {!reporte.saldos.consistente && (
          <small style={{ color: 'rgba(255,255,255,0.8)' }}>
            Dif: {formatearMoneda(reporte.saldos.diferencia)}
          </small>
        )}
      </Card.Body>
    </Card>
  </Col>
  
  {/* Card 2: Saldo Actual */}
  <Col md={3}>
    <Card className="text-center shadow-sm stat-card-primary">
      <Card.Body className="py-3">
        <h4 className="mb-0" style={{ color: 'white' }}>
          {formatearMoneda(reporte.saldos.finalReal)}
        </h4>
        <small style={{ opacity: 0.9, color: 'white' }}>Saldo Actual</small>
      </Card.Body>
    </Card>
  </Col>
  
  {/* ⭐ Card 3 - CONDICIONAL: Movistar o General */}
  {proveedor === 'movistar' && porcentajeRealMovistar ? (
    // ✅ MOVISTAR: Mostrar Porcentaje del Periodo
    <Col md={3}>
      <Card className="text-center shadow-sm stat-card-success">
        <Card.Body className="py-3">
          <h4 className="mb-0 fw-bold" style={{ color: 'white' }}>
            {porcentajeRealMovistar.porcentajePeriodoRedondeado}%
          </h4>
          <small style={{ opacity: 0.9, color: 'white' }}>% del Periodo</small>
          <div style={{ 
            fontSize: '0.75rem', 
            opacity: 0.9, 
            marginTop: '4px',
            color: 'white'
          }}>
            +{formatearMoneda(porcentajeRealMovistar.totalComisiones)} ganados
          </div>
        </Card.Body>
      </Card>
    </Col>
  ) : (
    // ❌ GENERAL: Mostrar Ganancia tradicional
    <Col md={3}>
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
    </Col>
  )}
  
  {/* ⭐ Card 4 - CONDICIONAL: Movistar o General */}
  {proveedor === 'movistar' && porcentajeRealMovistar ? (
    // ✅ MOVISTAR: Mostrar Ganancia Potencial si Reinvierte
    <Col md={3}>
      <Card className="text-center shadow-sm stat-card-info">
        <Card.Body className="py-3">
          <h4 className="mb-0" style={{ color: 'white' }}>
            +{formatearMoneda(porcentajeRealMovistar.gananciaPotencial)}
          </h4>
          <small style={{ opacity: 0.9, color: 'white' }}>Si Reinviertes</small>
          <div style={{ 
            fontSize: '0.75rem', 
            opacity: 0.9, 
            marginTop: '4px',
            color: 'white'
          }}>
            @ {porcentajeRealMovistar.porcentajePeriodoRedondeado}%
          </div>
        </Card.Body>
      </Card>
    </Col>
  ) : (
    // ❌ GENERAL: Mostrar Recargas
    <Col md={3}>
      <Card className="text-center shadow-sm stat-card-info">
        <Card.Body className="py-3">
          <h4 className="mb-0" style={{ color: 'white' }}>
            {reporte.contadores.recargas}
          </h4>
          <small style={{ opacity: 0.9, color: 'white' }}>Recargas</small>
        </Card.Body>
      </Card>
    </Col>
  )}
</Row>


{/* ============= ANÁLISIS COMPLETO MOVISTAR ============= */}
{proveedor === 'movistar' && porcentajeRealMovistar && !porcentajeRealMovistar.error && (
  <Card className="mb-3 shadow-sm border-success">
    <Card.Header className="bg-success bg-opacity-10 border-success">
      <h6 className="mb-0 fw-bold text-success d-flex align-items-center justify-content-between">
        <span>
          <FiTrendingUp className="me-2" /> 
          Análisis Completo - Periodo: {porcentajeRealMovistar.periodo.inicio} a {porcentajeRealMovistar.periodo.fin}
        </span>
        {cargandoPorcentaje && <Spinner size="sm" />}
      </h6>
    </Card.Header>
    <Card.Body>
      {/* ===== FILA 1: CAPITAL Y SALDOS ===== */}
      <Row className="g-3 mb-3">
        <Col md={3}>
          <div className="text-center p-3 bg-light rounded h-100">
            <small className="text-muted d-block mb-2">💰 CAPITAL INICIAL</small>
            <h5 className="mb-1 text-primary">
              {formatearMoneda(porcentajeRealMovistar.capitalInicial)}
            </h5>
            <small className="text-muted d-block">
              Saldo: {formatearMoneda(porcentajeRealMovistar.saldoInicial)}<br/>
              Incrementos: +{formatearMoneda(porcentajeRealMovistar.totalIncrementos)}
            </small>
          </div>
        </Col>
        
        <Col md={3}>
          <div className="text-center p-3 bg-danger bg-opacity-10 rounded h-100">
            <small className="text-muted d-block mb-2">📉 INVERTIDO</small>
            <h5 className="mb-1 text-danger">
              -{formatearMoneda(porcentajeRealMovistar.totalInvertido)}
            </h5>
            <small className="text-muted d-block">
              {porcentajeRealMovistar.cantidadRecargas} recargas<br/>
              Promedio: {formatearMoneda(porcentajeRealMovistar.promedioComision)}/recarga
            </small>
          </div>
        </Col>
        
        <Col md={3}>
          <div className="text-center p-3 bg-success bg-opacity-10 rounded h-100">
            <small className="text-muted d-block mb-2">✅ COMISIONES</small>
            <h5 className="mb-1 text-success">
              +{formatearMoneda(porcentajeRealMovistar.totalComisionesReales)}
            </h5>
            <small className="text-muted d-block">
              Registradas: {formatearMoneda(porcentajeRealMovistar.comisionesRegistradas)}<br/>
              Calculadas: {formatearMoneda(porcentajeRealMovistar.comisionesCalculadas)}
            </small>
          </div>
        </Col>
        
        <Col md={3}>
          <div className="text-center p-3 bg-info bg-opacity-10 rounded h-100">
            <small className="text-muted d-block mb-2">💎 SALDO FINAL</small>
            <h5 className="mb-1 text-info">
              {formatearMoneda(porcentajeRealMovistar.saldoFinal)}
            </h5>
            <small className="text-muted d-block">
              Después de todas<br/>las operaciones
            </small>
          </div>
        </Col>
      </Row>
      
      {/* ===== FILA 2: MÉTRICAS PRINCIPALES (DESTACADAS) ===== */}
      <Row className="g-3 mb-3">
        <Col md={6}>
          <div className="text-center p-4 bg-gradient rounded shadow-sm" 
               style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <small className="d-block mb-2 text-white opacity-75">
              📊 PORCENTAJE DEL PERIODO
            </small>
            <h2 className="mb-1 fw-bold text-white">
              {porcentajeRealMovistar.porcentajePeriodoRedondeado}%
            </h2>
            <small className="text-white opacity-90 d-block">
              Comisión promedio por recarga<br/>
              <Badge bg="light" className="text-dark mt-1">
                {porcentajeRealMovistar.porcentajePeriodo}% exacto
              </Badge>
            </small>
          </div>
        </Col>
        
        <Col md={6}>
          <div className={`text-center p-4 rounded shadow-sm ${
            parseFloat(porcentajeRealMovistar.roiReal) >= 0 
              ? 'bg-gradient' 
              : 'bg-gradient'
          }`} style={{
            background: parseFloat(porcentajeRealMovistar.roiReal) >= 0 
              ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
              : 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)'
          }}>
            <small className="d-block mb-2 text-white opacity-75">
              🎯 ROI REAL (con reinversión)
            </small>
            <h2 className="mb-1 fw-bold text-white">
              {parseFloat(porcentajeRealMovistar.roiReal) >= 0 ? '+' : ''}
              {porcentajeRealMovistar.roiRealRedondeado}%
            </h2>
            <small className="text-white opacity-90 d-block">
              Ganancia/Pérdida neta:<br/>
              <Badge bg="light" className={`mt-1 ${
                parseFloat(porcentajeRealMovistar.gananciaRealNeta) >= 0 
                  ? 'text-success' 
                  : 'text-danger'
              }`}>
                {parseFloat(porcentajeRealMovistar.gananciaRealNeta) >= 0 ? '+' : ''}
                {formatearMoneda(porcentajeRealMovistar.gananciaRealNeta)}
              </Badge>
            </small>
          </div>
        </Col>
      </Row>
      
      {/* ===== EXPLICACIÓN CLARA ===== */}
      <Alert variant="info" className="mb-3">
        <Row>
          <Col md={12}>
            <h6 className="mb-2">
              <FiInfo className="me-2" />
              Diferencia entre Porcentaje del Periodo y ROI Real:
            </h6>
          </Col>
          <Col md={6}>
            <strong>📊 Porcentaje del Periodo ({porcentajeRealMovistar.porcentajePeriodoRedondeado}%)</strong>
            <p className="mb-0 small">
              Es el porcentaje promedio que ganas por cada recarga. 
              Ejemplo: Si recargas $100, ganas ~${(parseFloat(porcentajeRealMovistar.porcentajePeriodoRedondeado)).toFixed(2)} en comisión.
            </p>
          </Col>
          <Col md={6}>
            <strong>🎯 ROI Real ({porcentajeRealMovistar.roiRealRedondeado}%)</strong>
            <p className="mb-0 small">
              Es tu ganancia/pérdida neta considerando TODO: saldo inicial, incrementos, 
              y el efecto de reinvertir las comisiones. Muestra si realmente ganaste o perdiste dinero.
            </p>
          </Col>
        </Row>
      </Alert>
      
      {/* ===== DESGLOSE POR OPERADORA (DEL PERIODO) ===== */}
      {porcentajeRealMovistar.detallesPorOperadora && 
       porcentajeRealMovistar.detallesPorOperadora.length > 0 && (
        <>
          <hr className="my-3" />
          <div className="d-flex justify-content-between align-items-center mb-2">
            <small className="fw-bold text-muted">
              📊 Desglose por Operadora
            </small>
            <Badge bg="primary">
              Solo periodo: {porcentajeRealMovistar.periodo.inicio} - {porcentajeRealMovistar.periodo.fin}
            </Badge>
          </div>
          <div className="table-responsive">
            <Table size="sm" hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th className="small">Operadora</th>
                  <th className="small text-center">Recargas</th>
                  <th className="small text-end">Invertido</th>
                  <th className="small text-end">Comisiones</th>
                  <th className="small text-end">Promedio</th>
                  <th className="small text-center">% Real</th>
                </tr>
              </thead>
              <tbody>
                {porcentajeRealMovistar.detallesPorOperadora.map((op, idx) => (
                  <tr key={idx}>
                    <td className="small">
                      <Badge bg="primary">{op.operadora}</Badge>
                    </td>
                    <td className="small text-center">
                      <Badge bg="secondary">{op.cantidad}</Badge>
                      {op.cantidadSinComision > 0 && (
                        <Badge bg="warning" className="ms-1" title="Comisiones calculadas">
                          {op.cantidadSinComision} calc
                        </Badge>
                      )}
                    </td>
                    <td className="small text-end text-danger">
                      -{formatearMoneda(op.totalValor)}
                    </td>
                    <td className="small text-end text-success fw-bold">
                      +{formatearMoneda(op.totalComision)}
                    </td>
                    <td className="small text-end">
                      {formatearMoneda(op.promedioComision)}
                    </td>
                    <td className="small text-center">
                      <Badge 
                        bg={parseFloat(op.porcentaje) >= 7 ? 'success' : 
                            parseFloat(op.porcentaje) >= 6 ? 'warning' : 'danger'}
                        className="fw-bold"
                      >
                        {op.porcentaje}%
                      </Badge>
                    </td>
                  </tr>
                ))}
                {/* Fila de totales */}
                <tr className="table-light fw-bold">
                  <td className="small">TOTAL</td>
                  <td className="small text-center">
                    <Badge bg="dark">
                      {porcentajeRealMovistar.cantidadRecargas}
                    </Badge>
                  </td>
                  <td className="small text-end text-danger">
                    -{formatearMoneda(porcentajeRealMovistar.totalInvertido)}
                  </td>
                  <td className="small text-end text-success">
                    +{formatearMoneda(porcentajeRealMovistar.totalComisionesReales)}
                  </td>
                  <td className="small text-end">
                    {formatearMoneda(porcentajeRealMovistar.promedioComision)}
                  </td>
                  <td className="small text-center">
                    <Badge bg="success" className="fw-bold">
                      {porcentajeRealMovistar.porcentajePeriodoRedondeado}%
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </Table>
          </div>
        </>
      )}
      
      {/* ===== EXPLICACIÓN DETALLADA ===== */}
      <div className="mt-3 p-3 bg-light rounded">
        <small className="text-muted">
          <strong>📋 Resumen:</strong>
          <pre className="mb-0 mt-2" style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
{porcentajeRealMovistar?.explicacion}
          </pre>
        </small>
      </div>
    </Card.Body>
  </Card>
)}

{/* Mensaje si no hay datos */}
{proveedor === 'movistar' && porcentajeRealMovistar?.error && (
  <Alert variant="warning" className="mb-3">
    <FiAlertTriangle /> {porcentajeRealMovistar.error}
  </Alert>
)}

{proveedor === 'movistar' && !porcentajeRealMovistar && !cargandoPorcentaje && reporte && (
  <Alert variant="warning" className="mb-3">
    <FiAlertTriangle /> No se pudo cargar el análisis. 
    <Button 
      size="sm" 
      variant="outline-warning" 
      className="ms-2"
      onClick={cargarPorcentajeRealMovistar}
    >
      <FiRefreshCw /> Reintentar
    </Button>
  </Alert>
)}




{/* ============= ANÁLISIS  aterior DETALLADO MOVISTAR ============= */}
{proveedor === 'movistar' && porcentajeRealMovistar && (
  <Card className="mb-3 shadow-sm border-success">
    <Card.Header className="bg-success bg-opacity-10 border-success">
      <h6 className="mb-0 fw-bold text-success d-flex align-items-center">
        <FiTrendingUp className="me-2" /> 
        Análisis del Periodo: {reporte.periodo.fechaInicio.split(' ')[0]} - {reporte.periodo.fechaFin.split(' ')[0]}
      </h6>
    </Card.Header>
    <Card.Body>
      <Row className="g-3">
        {/* Columna 1: Inversión del Periodo */}
        <Col md={4}>
          <div className="text-center p-3 bg-light rounded h-100">
            <div className="mb-2">
              <Badge bg="danger" className="mb-2" style={{ fontSize: '0.75rem' }}>
                INVERSIÓN
              </Badge>
            </div>
            <h4 className="text-danger mb-2 fw-bold">
              -{formatearMoneda(porcentajeRealMovistar.totalInvertido)}
            </h4>
            <div className="small text-muted">
              <div className="mb-1">
                <strong>{porcentajeRealMovistar.cantidadRecargas}</strong> recargas realizadas
              </div>
              <div>
                Promedio: <strong>{formatearMoneda(porcentajeRealMovistar.promedioComision)}</strong>/recarga
              </div>
            </div>
          </div>
        </Col>
        
        {/* Columna 2: Ganancia Real del Periodo */}
        <Col md={4}>
          <div className="text-center p-3 bg-success bg-opacity-10 rounded h-100">
            <div className="mb-2">
              <Badge bg="success" className="mb-2" style={{ fontSize: '0.75rem' }}>
                GANANCIA REAL
              </Badge>
            </div>
            <h4 className="text-success mb-2 fw-bold">
              +{formatearMoneda(porcentajeRealMovistar.totalComisiones)}
            </h4>
            <div className="mb-2">
              <Badge bg="success" className="fs-5 fw-bold px-3 py-2">
                {porcentajeRealMovistar.porcentajePeriodoRedondeado}%
              </Badge>
            </div>
            <small className="text-muted">
              Porcentaje ganado en el periodo
            </small>
          </div>
        </Col>
        
        {/* Columna 3: Potencial de Reinversión */}
        <Col md={4}>
          <div className="text-center p-3 bg-info bg-opacity-10 rounded h-100">
            <div className="mb-2">
              <Badge bg="info" className="mb-2" style={{ fontSize: '0.75rem' }}>
                SI REINVIERTES
              </Badge>
            </div>
            <h4 className="text-info mb-2 fw-bold">
              +{formatearMoneda(porcentajeRealMovistar.gananciaPotencial)}
            </h4>
            <div className="small text-muted">
              <div className="mb-1">
                Total acumulado:
              </div>
              <div>
                <strong className="text-success">
                  {formatearMoneda(porcentajeRealMovistar.totalConReinversion)}
                </strong>
              </div>
            </div>
          </div>
        </Col>
      </Row>
      
      {/* Explicación Clara */}
      <Alert variant="info" className="mt-3 mb-0">
        <Row>
          <Col md={12}>
            <small>
              <strong>💡 {porcentajeRealMovistar?.simulacionReinversion?.explicacion}</strong>
            </small>
          </Col>
        </Row>
      </Alert>
      
      {/* Detalles por Operadora */}
      {porcentajeRealMovistar.detallesPorOperadora && 
       porcentajeRealMovistar.detallesPorOperadora.length > 0 && (
        <>
          <hr className="my-3" />
          <div className="d-flex justify-content-between align-items-center mb-2">
            <small className="fw-bold text-muted">
              📊 Desglose por Operadora
            </small>
            <Badge bg="secondary">
              Periodo Seleccionado
            </Badge>
          </div>
          <div className="table-responsive">
            <Table size="sm" hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th className="small">Operadora</th>
                  <th className="small text-center">Recargas</th>
                  <th className="small text-end">Invertido</th>
                  <th className="small text-end">Comisiones</th>
                  <th className="small text-center">% Real</th>
                </tr>
              </thead>
              <tbody>
                {porcentajeRealMovistar.detallesPorOperadora.map((op, idx) => (
                  <tr key={idx}>
                    <td className="small">
                      <Badge bg="primary">{op.operadora}</Badge>
                    </td>
                    <td className="small text-center">
                      <Badge bg="secondary">{op.cantidad}</Badge>
                    </td>
                    <td className="small text-end">
                      <span className="text-danger">
                        -{formatearMoneda(op.totalValor)}
                      </span>
                    </td>
                    <td className="small text-end">
                      <span className="text-success fw-bold">
                        +{formatearMoneda(op.totalComision)}
                      </span>
                    </td>
                    <td className="small text-center">
                      <Badge 
                        bg={parseFloat(op.porcentaje) >= 7 ? 'success' : 
                            parseFloat(op.porcentaje) >= 6 ? 'warning' : 'danger'}
                        className="fw-bold"
                      >
                        {op.porcentaje}%
                      </Badge>
                    </td>
                  </tr>
                ))}
                {/* Fila de totales */}
                <tr className="table-light fw-bold">
                  <td className="small">TOTAL</td>
                  <td className="small text-center">
                    <Badge bg="dark">
                      {porcentajeRealMovistar.cantidadRecargas}
                    </Badge>
                  </td>
                  <td className="small text-end text-danger">
                    -{formatearMoneda(porcentajeRealMovistar.totalInvertido)}
                  </td>
                  <td className="small text-end text-success">
                    +{formatearMoneda(porcentajeRealMovistar.totalComisiones)}
                  </td>
                  <td className="small text-center">
                    <Badge bg="success" className="fw-bold">
                      {porcentajeRealMovistar.porcentajePeriodoRedondeado}%
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </Table>
          </div>
        </>
      )}
    </Card.Body>
  </Card>
)}

// ============= 3. MENSAJE SI NO HAY DATOS (Mantener después del panel) =============

{proveedor === 'movistar' && !porcentajeRealMovistar && !cargandoPorcentaje && reporte && (
  <Alert variant="warning" className="mb-3">
    <FiAlertTriangle /> No se pudo cargar el análisis del periodo. 
    Puede ser que no haya recargas en el rango seleccionado.
    <Button 
      size="sm" 
      variant="outline-warning" 
      className="ms-2"
      onClick={cargarPorcentajeRealMovistar}
    >
      <FiRefreshCw /> Reintentar
    </Button>
  </Alert>
)}

                    
                    
                    <Row className="small">
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
                          {reporte.totales.incrementos === 0 ? (
                            <span className="fw-bold text-muted">
                              Sin datos
                            </span>
                          ) : (
                            <span className={`fw-bold fs-5 ${
                              reporte.totales.gananciaReal >= 0 ? 'text-success' : 'text-danger'
                            }`}>
                              {formatearMoneda(reporte.totales.gananciaReal)}
                            </span>
                          )}
                        </div>

                        
                        {reporte.totales.incrementos === 0 && (
                          <Alert variant="info" className="mt-3 mb-0 py-2">
                            <small>
                              <FiAlertTriangle /> No hay incrementos detectados en este periodo. 
                              La ganancia solo se calcula cuando hay incrementos de saldo.
                            </small>
                          </Alert>
                        )}
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {/* TABS HORIZONTALES PARA DETALLES */}
                <DetallesReporteTabs reporte={reporte} formatearMoneda={formatearMoneda} />

                {/* FOOTER INFO */}
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
  );
};

export default IncrementosModal;