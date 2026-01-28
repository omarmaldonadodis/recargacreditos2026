// front/src/components/common/IncrementosModal.js - VERSIÓN COMPLETA
import React, { useState, useEffect } from 'react';
import { 
  Modal, Tabs, Tab, Badge, Button, Form, Table, Alert, 
  Spinner, Card, Row, Col, ListGroup, ProgressBar 
} from 'react-bootstrap';
import api from '../../services/axiosConfig';
import './IncrementosModal.css';

const IncrementosModal = ({ show, handleClose, proveedor }) => {
  const [activeTab, setActiveTab] = useState('alertas');
  const [loading, setLoading] = useState(false);
  
  // ============= ESTADOS EXISTENTES =============
  const [incrementos, setIncrementos] = useState([]);
  const [selectedIncremento, setSelectedIncremento] = useState(null);
  const [depositos, setDepositos] = useState([]);
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
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [deteccionHabilitada, setDeteccionHabilitada] = useState(false);
  const [incrementoMaximo, setIncrementoMaximo] = useState(0);
  
  // ============= NUEVOS ESTADOS =============
  // Alertas
  const [alertas, setAlertas] = useState([]);
  const [estadisticasAlertas, setEstadisticasAlertas] = useState(null);
  
  // Reportes mejorados
  const [reporteGanancias, setReporteGanancias] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  
  // Ajustes
  const [ajustes, setAjustes] = useState([]);
  const [nuevoAjuste, setNuevoAjuste] = useState({
    tipoAjuste: 'correccion_saldo',
    saldoNuevo: '',
    motivo: '',
    detalles: ''
  });
  
  // Verificación
  const [verificacionConsistencia, setVerificacionConsistencia] = useState(null);
  const [historialEventos, setHistorialEventos] = useState([]);
  
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' });

  // ============= EFECTOS =============
  useEffect(() => {
    if (show) {
      cargarDatos();
    }
  }, [show, proveedor, activeTab]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'alertas':
          await cargarAlertas();
          await cargarEstadisticasAlertas();
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
          await cargarDashboard();
          break;
        case 'ajustes':
          await cargarAjustes();
          break;
        case 'verificacion':
          await cargarVerificacionConsistencia();
          await cargarHistorialEventos();
          break;
        case 'configuracion':
          await cargarConfiguracion();
          break;
      }
    } catch (error) {
      mostrarAlerta('Error al cargar datos', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // ============= FUNCIONES DE CARGA - NUEVAS =============
  
  const cargarAlertas = async () => {
    try {
      const response = await api.get('/alertas');
      
      // Filtrar alertas por proveedor
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
      setEstadisticasAlertas(response.data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const cargarDashboard = async () => {
    try {
      const response = await api.get('/incrementos/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
    }
  };

  const cargarAjustes = async () => {
    try {
      const response = await api.get('/incrementos/ajustes', {
        params: { proveedor }
      });
      setAjustes(response.data);
    } catch (error) {
      console.error('Error al cargar ajustes:', error);
    }
  };

  const cargarVerificacionConsistencia = async () => {
    try {
      const response = await api.get(`/incrementos/verificar-consistencia/${proveedor}`);
      setVerificacionConsistencia(response.data);
    } catch (error) {
      console.error('Error al verificar consistencia:', error);
    }
  };

  const cargarHistorialEventos = async () => {
    try {
      const response = await api.get(`/incrementos/historial-eventos/${proveedor}`, {
        params: { limite: 20 }
      });
      setHistorialEventos(response.data);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  };

  // ============= FUNCIONES EXISTENTES =============
  
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

  const cargarConfiguracion = async () => {
    try {
      const response = await api.get('/incrementos/configuracion/deteccion');
      setDeteccionHabilitada(response.data.habilitada || false);
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    }
  };

  const mostrarAlerta = (message, variant = 'success') => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: '' }), 5000);
  };

  // ============= HANDLERS - DEPÓSITOS =============
  
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

  // ============= HANDLERS - ASIGNACIÓN =============
  
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

  const handleVerificarIncremento = async (incrementoId) => {
    setLoading(true);
    try {
      await api.post(`/incrementos/incrementos/${incrementoId}/verificar`, {
        notas: 'Verificado desde el panel'
      });
      mostrarAlerta('Incremento verificado', 'success');
      await cargarIncrementos();
      await cargarAlertas();
    } catch (error) {
      mostrarAlerta('Error al verificar', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // ============= HANDLERS - REPORTES =============
  
  const handleGenerarReporte = async () => {
    if (!fechaInicio || !fechaFin) {
      mostrarAlerta('Selecciona ambas fechas', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/incrementos/reportes/ganancias', {
        params: {
          proveedor,
          startDate: fechaInicio,
          endDate: fechaFin
        }
      });
      setReporteGanancias(response.data[proveedor]);
    } catch (error) {
      mostrarAlerta('Error al generar reporte', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // ============= HANDLERS - AJUSTES =============
  
  const handleCrearAjuste = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      await api.post('/incrementos/ajustes', {
        proveedor,
        ...nuevoAjuste,
        saldoNuevo: parseFloat(nuevoAjuste.saldoNuevo)
      });
      
      mostrarAlerta('Ajuste creado exitosamente', 'success');
      setNuevoAjuste({
        tipoAjuste: 'correccion_saldo',
        saldoNuevo: '',
        motivo: '',
        detalles: ''
      });
      await cargarAjustes();
    } catch (error) {
      mostrarAlerta('Error al crear ajuste', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobarAjuste = async (ajusteId) => {
    if (!window.confirm('¿Aprobar este ajuste?')) return;
    
    setLoading(true);
    try {
      await api.put(`/incrementos/ajustes/${ajusteId}/aprobar`);
      mostrarAlerta('Ajuste aprobado', 'success');
      await cargarAjustes();
      await cargarVerificacionConsistencia();
    } catch (error) {
      mostrarAlerta('Error al aprobar ajuste', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // ============= HANDLERS - VERIFICACIÓN =============
  
  const handleVerificarSaldo = async () => {
    setLoading(true);
    try {
      await api.post(`/incrementos/verificar-saldo/${proveedor}`);
      mostrarAlerta('Saldo verificado', 'success');
      await cargarVerificacionConsistencia();
      await cargarHistorialEventos();
    } catch (error) {
      mostrarAlerta('Error al verificar saldo', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // ============= HANDLERS - CONFIGURACIÓN =============
  
  const handleToggleDeteccion = async () => {
    setLoading(true);
    try {
      await api.post('/incrementos/configuracion/deteccion', {
        habilitada: !deteccionHabilitada
      });
      setDeteccionHabilitada(!deteccionHabilitada);
      mostrarAlerta(
        `Detección ${!deteccionHabilitada ? 'activada' : 'desactivada'}`,
        'success'
      );
    } catch (error) {
      mostrarAlerta('Error al cambiar configuración', 'danger');
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

  // ============= RENDER =============
  
  return (
    <Modal show={show} onHide={handleClose} size="xl" centered className="incrementos-modal">
      <Modal.Header closeButton>
        <Modal.Title>
          Gestión Completa de Contabilidad -{' '}
          <Badge bg={proveedor === 'general' ? 'primary' : 'success'}>
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
                🔔 Alertas {alertas.length > 0 && <Badge bg="danger">{alertas.length}</Badge>}
              </span>
            }
          >
            {loading ? (
              <div className="text-center p-5">
                <Spinner animation="border" />
              </div>
            ) : (
              <>
                {/* Estadísticas de Alertas */}
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

                {/* Lista de Alertas */}
                {alertas.length === 0 ? (
                  <Alert variant="success">
                    ✅ No hay alertas pendientes para <strong>{proveedor === 'general' ? 'General' : 'Movistar'}</strong>
                  </Alert>
                ) : (
                  <div>
                    {alertas.map((alerta, idx) => (
                      <Card key={idx} className="mb-3 shadow-sm incremento-card">
                        <Card.Body>
                          <Row className="align-items-center">
                            <Col md={1}>
                              <Badge bg={getUrgenciaColor(alerta.urgencia)} pill style={{ fontSize: '1.2rem' }}>
                                {alerta.urgencia === 'alta' ? '🔴' : alerta.urgencia === 'media' ? '🟡' : '🟢'}
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
                                {alerta.horasTranscurridas > 0 && `Hace ${alerta.horasTranscurridas}h`}
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
                                  onClick={() => {
                                    const inc = incrementos.find(i => i.id === alerta.id);
                                    if (inc) {
                                      setSelectedIncremento(inc);
                                      setActiveTab('asignar');
                                    }
                                  }}
                                >
                                  Asignar
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

          {/* ============= TAB: NOTIFICACIONES (EXISTENTE MEJORADO) ============= */}
          <Tab 
            eventKey="notificaciones" 
            title={
              <span>
                📋 Incrementos {incrementos.length > 0 && <Badge bg="danger">{incrementos.length}</Badge>}
              </span>
            }
          >
            {loading ? (
              <div className="text-center p-5">
                <Spinner animation="border" />
              </div>
            ) : incrementos.length === 0 ? (
              <Alert variant="info">
                No hay incrementos pendientes para <strong>{proveedor === 'general' ? 'General' : 'Movistar'}</strong>
              </Alert>
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
                          <Col md={8}>
                            <h5>
                              <Badge bg="warning" text="dark">#{inc.id}</Badge>
                              <Badge bg={proveedor === 'general' ? 'primary' : 'success'} className="ms-2">
                                {getTipoIncrementoLabel(inc.tipoIncremento)}
                              </Badge>
                              <small className="text-muted ms-2">{new Date(inc.fecha).toLocaleString()}</small>
                            </h5>
                            <p className="mb-1">
                              <strong>Operadora:</strong> {inc.operadora}
                            </p>
                            
                            {/* Mostrar comisiones si es Movistar */}
                            {inc.comisionAcumulada && (
                              <Alert variant="info" className="mt-2 mb-2 py-2">
                                💰 Comisiones acumuladas: <strong>${parseFloat(inc.comisionAcumulada).toFixed(2)}</strong>
                                {' '}({inc.cantidadRecargasComision} recargas)
                              </Alert>
                            )}
                            
                            <div className="mt-2 p-2 bg-light rounded">
                              <Row>
                                <Col md={4}>
                                  <small className="text-muted">Saldo anterior</small>
                                  <p className="mb-0"><strong>${saldoAnterior.toFixed(2)}</strong></p>
                                </Col>
                                <Col md={4}>
                                  <small className="text-muted">Saldo nuevo</small>
                                  <p className="mb-0"><strong>${saldoNuevo.toFixed(2)}</strong></p>
                                </Col>
                                <Col md={4}>
                                  <small className="text-muted">Diferencia</small>
                                  <h4 className="mb-0 text-success">${diferencia.toFixed(2)}</h4>
                                </Col>
                              </Row>
                            </div>
                          </Col>
                          <Col md={4} className="d-flex flex-column justify-content-center gap-2">
                            <Button 
                              variant="success" 
                              size="sm"
                              onClick={() => {
                                setSelectedIncremento(inc);
                                setActiveTab('asignar');
                              }}
                            >
                              ✅ Asignar Depósitos
                            </Button>
                            {/* <Button 
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleVerificarIncremento(inc.id)}
                            >
                              ✓ Verificar
                            </Button>
                             */}
                            <Button 
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleIgnorarIncremento(inc.id)}
                            >
                              ✕ Ignorar
                            </Button>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  );
                })}
              </div>
            )}
          </Tab>

          {/* ============= TAB: DEPÓSITOS (EXISTENTE MEJORADO) ============= */}
          <Tab eventKey="depositos" title="💵 Depósitos">
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
                    <strong>💡 Incremento máximo disponible:</strong> ${incrementoMaximo.toFixed(2)}
                  </Alert>
                )}
                
                <Form onSubmit={handleRegistrarDeposito}>
                  <Row>
                    <Col md={3}>
                      <Form.Group className="mb-3">
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
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
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
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
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
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Referencia</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Ej: TRANS-123"
                          value={nuevoDeposito.referencia}
                          onChange={(e) => setNuevoDeposito({ ...nuevoDeposito, referencia: e.target.value })}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
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
                    {loading ? <Spinner size="sm" /> : '💾 Registrar Depósito'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>

            <Card className="mt-3 shadow-sm">
              <Card.Body>
                <h5 className="mb-3">
                  📋 Depósitos Disponibles{' '}
                  <Badge bg="secondary">{depositosDisponibles.length}</Badge>
                </h5>
                {depositosDisponibles.length === 0 ? (
                  <Alert variant="info">No hay depósitos sin asignar</Alert>
                ) : (
                  <Table striped bordered hover responsive>
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
                          <td>{dep.id}</td>
                          <td><strong className="text-success">${parseFloat(dep.monto).toFixed(2)}</strong></td>
                          <td>{dep.Usuario?.nombres_apellidos || dep.Usuario?.nombre_tienda}</td>
                          <td><Badge bg="info">{dep.tipoDeposito}</Badge></td>
                          <td>{dep.referencia || '-'}</td>
                          <td>{new Date(dep.fecha).toLocaleDateString()}</td>
                          <td>
                            <Badge bg={dep.verificado ? 'success' : 'warning'}>
                              {dep.verificado ? '✓ Verificado' : 'Pendiente'}
                            </Badge>
                          </td>
                          <td>
                            {!dep.verificado && (
                              <Button 
                                variant="outline-success" 
                                size="sm"
                                className="me-1"
                                onClick={() => handleVerificarDeposito(dep.id)}
                              >
                                ✓
                              </Button>
                            )}
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => handleEliminarDeposito(dep.id)}
                              disabled={loading}
                            >
                              🗑️
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Tab>

          {/* ============= TAB: ASIGNAR (EXISTENTE) ============= */}
          <Tab eventKey="asignar" title="🔗 Asignar">
            {!selectedIncremento ? (
              <Alert variant="warning">
                ⚠️ Selecciona un incremento desde la pestaña de Incrementos
              </Alert>
            ) : (
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
                                      ({(((parseFloat(selectedIncremento.diferencia) - calcularTotalSeleccionado()) / parseFloat(selectedIncremento.diferencia)) * 100).toFixed(1)}%)
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

                        <div className="d-flex gap-2">
                          <Button 
                            variant="success" 
                            onClick={handleAsignarDepositos}
                            disabled={loading || depositosSeleccionados.length === 0}
                            className="btn-incrementos btn-success-gradient"
                          >
                            {loading ? <Spinner size="sm" /> : '✅ Confirmar Asignación'}
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
                            ✕ Cancelar
                          </Button>
                        </div>
                      </>
                    )}
                  </Card.Body>
                </Card>
              </div>
            )}
          </Tab>

          {/* ============= TAB: REPORTES (MEJORADO) ============= */}
          <Tab eventKey="reportes" title="📊 Reportes">
            {/* Dashboard */}
            {dashboard && dashboard[proveedor] && (
              <Row className="mb-4">
                <Col md={3}>
                  <Card className="stat-card stat-card-primary text-center">
                    <Card.Body>
                      <div className="stat-icon">💰</div>
                      <h3>${dashboard[proveedor].saldoActual}</h3>
                      <small>Saldo Actual</small>
                      <div className="mt-2">
                        <small className="text-white-50">
                          {dashboard[proveedor].ultimaActualizacion 
                            ? new Date(dashboard[proveedor].ultimaActualizacion).toLocaleString()
                            : '-'}
                        </small>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="stat-card stat-card-warning text-center">
                    <Card.Body>
                      <div className="stat-icon">⏳</div>
                      <h3>${dashboard[proveedor].depositosPendientes}</h3>
                      <small>Depósitos Pendientes</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="stat-card stat-card-info text-center">
                    <Card.Body>
                      <div className="stat-icon">🔔</div>
                      <h3>{dashboard[proveedor].incrementosPendientes}</h3>
                      <small>Incrementos Pendientes</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="stat-card stat-card-success text-center">
                    <Card.Body>
                      <div className="stat-icon">💵</div>
                      <h3>
                        {dashboard[proveedor].comisionesHoy 
                          ? `$${dashboard[proveedor].comisionesHoy}`
                          : '-'}
                      </h3>
                      <small>Comisiones Hoy</small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            {/* Generador de Reportes */}
            <Card className="shadow-sm reporte-card mb-3">
              <Card.Body>
                <h5 className="mb-3">
                  Generar Reporte de Ganancias Reales -{' '}
                  <Badge bg={proveedor === 'general' ? 'primary' : 'success'}>
                    {proveedor === 'general' ? 'General' : 'Movistar'}
                  </Badge>
                </h5>
                <Row>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Fecha Inicio</Form.Label>
                      <Form.Control
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Fecha Fin</Form.Label>
                      <Form.Control
                        type="date"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4} className="d-flex align-items-end">
                    <Button 
                      onClick={handleGenerarReporte} 
                      disabled={loading}
                      className="btn-incrementos btn-primary-gradient w-100"
                    >
                      {loading ? <Spinner size="sm" /> : '📊 Generar Reporte'}
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Resultados del Reporte */}
            {reporteGanancias && (
              <Card className="shadow-sm">
                <Card.Body>
                  <h5 className="mb-4 text-gradient">
                    📈 Resultados - {proveedor === 'general' ? 'General' : 'Movistar'}
                  </h5>
                  
                  {/* Resumen Financiero */}
                  <div className="resumen-financiero mb-4">
                    <Row className="text-center">
                      <Col md={2}>
                        <div className="resumen-item">
                          <div className="resumen-label">Saldo Inicial</div>
                          <div className="resumen-valor">${reporteGanancias.saldoInicial}</div>
                        </div>
                      </Col>
                      <Col md={2}>
                        <div className="resumen-item">
                          <div className="resumen-label">Depositado</div>
                          <div className="resumen-valor">${reporteGanancias.totalDepositado}</div>
                        </div>
                      </Col>
                      <Col md={2}>
                        <div className="resumen-item">
                          <div className="resumen-label">Recargado</div>
                          <div className="resumen-valor">${reporteGanancias.totalRecargado}</div>
                        </div>
                      </Col>
                      <Col md={2}>
                        <div className="resumen-item">
                          <div className="resumen-label">Saldo Actual</div>
                          <div className="resumen-valor">${reporteGanancias.saldoActual}</div>
                        </div>
                      </Col>
                      <Col md={2}>
                        <div className="resumen-item">
                          <div className="resumen-label">Comisiones</div>
                          <div className="resumen-valor">${reporteGanancias.totalComisiones}</div>
                        </div>
                      </Col>
                      <Col md={2}>
                        <div className="resumen-item resumen-ganancia">
                          <div className="resumen-label">Ganancia Real</div>
                          <div className="resumen-valor">
                            ${reporteGanancias.gananciaReal}
                            <small className="d-block" style={{ fontSize: '0.7rem' }}>
                              {reporteGanancias.porcentajeGanancia}
                            </small>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>

                  {/* Fórmula */}
                  <Alert variant="info">
                    <strong>📐 Fórmula aplicada:</strong> {reporteGanancias.formula}
                  </Alert>
                </Card.Body>
              </Card>
            )}
          </Tab>

          {/* ============= TAB: AJUSTES (NUEVO) ============= 
          <Tab eventKey="ajustes" title="🔧 Ajustes">
            <Card className="shadow-sm mb-3">
              <Card.Body>
                <h5 className="mb-3">Crear Ajuste Manual de Saldo</h5>
                <Form onSubmit={handleCrearAjuste}>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Tipo de Ajuste *</Form.Label>
                        <Form.Select
                          value={nuevoAjuste.tipoAjuste}
                          onChange={(e) => setNuevoAjuste({ ...nuevoAjuste, tipoAjuste: e.target.value })}
                          required
                        >
                          <option value="correccion_saldo">Corrección de Saldo</option>
                          <option value="conciliacion">Conciliación</option>
                          <option value="ajuste_deposito">Ajuste de Depósito</option>
                          <option value="ajuste_comision">Ajuste de Comisión</option>
                          <option value="otro">Otro</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Saldo Nuevo *</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={nuevoAjuste.saldoNuevo}
                          onChange={(e) => setNuevoAjuste({ ...nuevoAjuste, saldoNuevo: e.target.value })}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Proveedor</Form.Label>
                        <Form.Control 
                          type="text" 
                          value={proveedor === 'general' ? 'General (2611)' : 'Movistar (2612)'} 
                          disabled 
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>Motivo *</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={nuevoAjuste.motivo}
                      onChange={(e) => setNuevoAjuste({ ...nuevoAjuste, motivo: e.target.value })}
                      placeholder="Explica el motivo del ajuste..."
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Detalles adicionales</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={nuevoAjuste.detalles}
                      onChange={(e) => setNuevoAjuste({ ...nuevoAjuste, detalles: e.target.value })}
                      placeholder="Información adicional..."
                    />
                  </Form.Group>
                  <Button type="submit" variant="warning" disabled={loading} className="btn-incrementos">
                    {loading ? <Spinner size="sm" /> : '🔧 Crear Ajuste'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>

            {/* Lista de Ajustes 
            <Card className="shadow-sm">
              <Card.Body>
                <h5 className="mb-3">
                  Historial de Ajustes{' '}
                  <Badge bg="secondary">{ajustes.length}</Badge>
                </h5>
                {ajustes.length === 0 ? (
                  <Alert variant="info">No hay ajustes registrados</Alert>
                ) : (
                  <Table striped bordered hover responsive className="reporte-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Tipo</th>
                        <th>Saldo Anterior</th>
                        <th>Saldo Nuevo</th>
                        <th>Diferencia</th>
                        <th>Motivo</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ajustes.map(ajuste => (
                        <tr key={ajuste.id}>
                          <td>{ajuste.id}</td>
                          <td><Badge bg="info">{ajuste.tipoAjuste}</Badge></td>
                          <td>${parseFloat(ajuste.saldoAnterior).toFixed(2)}</td>
                          <td>${parseFloat(ajuste.saldoNuevo).toFixed(2)}</td>
                          <td>
                            <strong className={parseFloat(ajuste.diferencia) >= 0 ? 'text-success' : 'text-danger'}>
                              {parseFloat(ajuste.diferencia) >= 0 ? '+' : ''}${parseFloat(ajuste.diferencia).toFixed(2)}
                            </strong>
                          </td>
                          <td>{ajuste.motivo}</td>
                          <td>
                            <Badge bg={
                              ajuste.estado === 'aprobado' ? 'success' : 
                              ajuste.estado === 'rechazado' ? 'danger' : 'warning'
                            }>
                              {ajuste.estado}
                            </Badge>
                          </td>
                          <td>{new Date(ajuste.fecha).toLocaleDateString()}</td>
                          <td>
                            {ajuste.estado === 'pendiente' && (
                              <Button 
                                variant="success" 
                                size="sm"
                                onClick={() => handleAprobarAjuste(ajuste.id)}
                                disabled={loading}
                              >
                                ✓ Aprobar
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Tab>
*/}
          {/* ============= TAB: VERIFICACIÓN (NUEVO) ============= */}
          <Tab eventKey="verificacion" title="✓ Verificación">
            {/* Verificación de Consistencia */}
            <Card className="shadow-sm mb-3">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Verificación de Consistencia de Saldos</h5>
                  <Button 
                    variant="primary" 
                    onClick={handleVerificarSaldo}
                    disabled={loading}
                    className="btn-incrementos btn-primary-gradient"
                  >
                    {loading ? <Spinner size="sm" /> : '🔄 Verificar Ahora'}
                  </Button>
                </div>

                {verificacionConsistencia && (
                  <div>
                    <Alert variant={verificacionConsistencia.consistente ? 'success' : 'danger'}>
                      <Row className="align-items-center">
                        <Col md={2}>
                          <div className="text-center">
                            <div style={{ fontSize: '3rem' }}>
                              {verificacionConsistencia.consistente ? '✅' : '⚠️'}
                            </div>
                          </div>
                        </Col>
                        <Col md={10}>
                          <h5>
                            {verificacionConsistencia.consistente 
                              ? '✓ Saldos Consistentes' 
                              : '⚠ Inconsistencia Detectada'}
                          </h5>
                          <Row className="mt-3">
                            <Col md={4}>
                              <small className="text-muted">Saldo Registrado</small>
                              <h4>${verificacionConsistencia.saldoRegistrado}</h4>
                            </Col>
                            <Col md={4}>
                              <small className="text-muted">Saldo Esperado</small>
                              <h4>${verificacionConsistencia.saldoEsperado}</h4>
                            </Col>
                            <Col md={4}>
                              <small className="text-muted">Diferencia</small>
                              <h4 className={parseFloat(verificacionConsistencia.diferencia) >= 0 ? 'text-success' : 'text-danger'}>
                                {parseFloat(verificacionConsistencia.diferencia) >= 0 ? '+' : ''}${verificacionConsistencia.diferencia}
                              </h4>
                            </Col>
                          </Row>
                        </Col>
                      </Row>
                    </Alert>

                    {verificacionConsistencia.detalles && (
                      <Card className="bg-light">
                        <Card.Body>
                          <h6>Detalles del Cálculo</h6>
                          <Row>
                            <Col md={4}>
                              <p className="mb-1"><strong>Saldo Inicial:</strong> ${verificacionConsistencia.detalles.saldoInicial}</p>
                            </Col>
                            <Col md={4}>
                              <p className="mb-1"><strong>Total Depositado:</strong> ${verificacionConsistencia.detalles.depositosTotales}</p>
                            </Col>
                            <Col md={4}>
                              <p className="mb-1"><strong>Total Recargado:</strong> ${verificacionConsistencia.detalles.recargasTotales}</p>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    )}
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Historial de Eventos */}
            <Card className="shadow-sm">
              <Card.Body>
                <h5 className="mb-3">
                  📜 Historial de Eventos de Saldo{' '}
                  <Badge bg="secondary">{historialEventos.length}</Badge>
                </h5>
                {historialEventos.length === 0 ? (
                  <Alert variant="info">No hay eventos registrados</Alert>
                ) : (
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {historialEventos.map((evento, idx) => (
                      <Card key={idx} className="mb-2 shadow-sm">
                        <Card.Body className="py-2">
                          <Row className="align-items-center">
                            <Col md={2}>
                              <Badge bg={
                                evento.tipoEvento === 'recarga' ? 'primary' :
                                evento.tipoEvento === 'deposito_detectado' ? 'success' :
                                evento.tipoEvento === 'comision_acumulada' ? 'info' :
                                'secondary'
                              }>
                                {evento.tipoEvento}
                              </Badge>
                            </Col>
                            <Col md={6}>
                              <small className="text-muted">
                                {new Date(evento.fecha).toLocaleString()}
                              </small>
                              {evento.detalles && (
                                <div className="mt-1">
                                  <small>
                                    {evento.detalles.valor && `Valor: $${evento.detalles.valor}`}
                                    {evento.detalles.comision && ` | Comisión: $${evento.detalles.comision}`}
                                  </small>
                                </div>
                              )}
                            </Col>
                            <Col md={2} className="text-end">
                              {evento.saldoAnterior && (
                                <small className="text-muted">
                                  ${parseFloat(evento.saldoAnterior).toFixed(2)}
                                </small>
                              )}
                            </Col>
                            <Col md={2} className="text-end">
                              <strong>${parseFloat(evento.saldo).toFixed(2)}</strong>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Tab>

          {/* ============= TAB: CONFIGURACIÓN (EXISTENTE) ============= 
          <Tab eventKey="configuracion" title="⚙️ Configuración">
            <Card className="shadow-sm">
              <Card.Body>
                <h5 className="mb-3">Configuración del Sistema</h5>
                <Alert variant="info">
                  La configuración aplica para <strong>ambos proveedores</strong> (General y Movistar).
                </Alert>
                <Form>
                  <Form.Check
                    type="switch"
                    id="deteccion-switch"
                    label={
                      <span>
                        Detección automática de incrementos{' '}
                        <Badge bg={deteccionHabilitada ? 'success' : 'secondary'}>
                          {deteccionHabilitada ? 'Activada' : 'Desactivada'}
                        </Badge>
                      </span>
                    }
                    checked={deteccionHabilitada}
                    onChange={handleToggleDeteccion}
                    disabled={loading}
                  />
                </Form>
                <Alert variant="info" className="mt-3">
                  <strong>💡 ¿Cómo funciona?</strong>
                  <ul className="mb-0 mt-2">
                    <li>Cada recarga compara saldo anterior vs saldo nuevo</li>
                    <li><strong>General:</strong> Detecta depósitos instantáneos (ganancia 2%)</li>
                    <li><strong>Movistar:</strong> Detecta comisiones acumuladas por recargas</li>
                    <li>Crea notificaciones automáticas clasificadas por tipo</li>
                    <li>Las alertas aparecen en el navbar con badges</li>
                    <li>Sistema de prioridades (alta/media/baja) según tiempo transcurrido</li>
                  </ul>
                </Alert>
              </Card.Body>
            </Card>
          </Tab>*/}

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