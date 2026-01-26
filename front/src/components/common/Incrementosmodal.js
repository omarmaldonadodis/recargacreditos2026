import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Tab, Badge, Button, Form, Table, Alert, Spinner, Card, Row, Col, ListGroup } from 'react-bootstrap';
import api from '../../services/axiosConfig';

const IncrementosModal = ({ show, handleClose, proveedor }) => {
  const [activeTab, setActiveTab] = useState('notificaciones');
  const [loading, setLoading] = useState(false);
  
  // Estados para notificaciones
  const [incrementos, setIncrementos] = useState([]);
  const [selectedIncremento, setSelectedIncremento] = useState(null);
  
  // Estados para depósitos
  const [depositos, setDepositos] = useState([]);
  const [nuevoDeposito, setNuevoDeposito] = useState({
    monto: '',
    usuarioId: '',
    notas: ''
  });
  const [usuarios, setUsuarios] = useState([]);
  
  // Estados para asignación
  const [depositosDisponibles, setDepositosDisponibles] = useState([]);
  const [depositosSeleccionados, setDepositosSeleccionados] = useState([]);
  const [notasAsignacion, setNotasAsignacion] = useState('');
  
  // Estados para reportes
  const [reporte, setReporte] = useState(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  
  // Estados para configuración
  const [deteccionHabilitada, setDeteccionHabilitada] = useState(false);
  
  // ✅ NUEVO: Estado para saber el incremento máximo disponible
  const [incrementoMaximo, setIncrementoMaximo] = useState(0);
  
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' });

  useEffect(() => {
    if (show) {
      cargarDatos();
    }
  }, [show, proveedor, activeTab]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      if (activeTab === 'notificaciones') {
        await cargarIncrementos();
      } else if (activeTab === 'depositos') {
        await cargarUsuariosValidos();
        await cargarDepositosDisponibles();
        await cargarIncrementoMaximo(); // ✅ Cargar incremento máximo
      } else if (activeTab === 'asignar') {
        await cargarIncrementos();
        await cargarDepositosDisponibles();
      } else if (activeTab === 'reportes') {
        // Los reportes se cargan bajo demanda
      } else if (activeTab === 'configuracion') {
        await cargarConfiguracion();
      }
    } catch (error) {
      mostrarAlerta('Error al cargar datos', 'danger');
    } finally {
      setLoading(false);
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
      console.error('Error al cargar usuarios válidos:', error);
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

  // ✅ NUEVO: Cargar el incremento máximo disponible
  const cargarIncrementoMaximo = async () => {
    try {
      const response = await api.get('/incrementos/notificaciones', {
        params: { proveedor }
      });
      
      const incrementosPendientes = response.data.incrementos || [];
      
      if (incrementosPendientes.length > 0) {
        // Obtener el incremento mayor
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

  // ============= FUNCIONES DE DEPÓSITOS =============
  const handleRegistrarDeposito = async (e) => {
    e.preventDefault();
    
    const montoIngresado = parseFloat(nuevoDeposito.monto);
    
    // ✅ VALIDACIÓN: No permitir monto mayor al incremento máximo
    if (incrementoMaximo > 0 && montoIngresado > incrementoMaximo) {
      mostrarAlerta(
        `El monto ingresado ($${montoIngresado.toFixed(2)}) supera el incremento máximo disponible ($${incrementoMaximo.toFixed(2)})`,
        'danger'
      );
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/incrementos/depositos', {
        monto: montoIngresado,
        usuarioId: parseInt(nuevoDeposito.usuarioId),
        proveedor: proveedor,
        notas: nuevoDeposito.notas
      });
      
      mostrarAlerta('Depósito registrado exitosamente', 'success');
      setNuevoDeposito({ monto: '', usuarioId: '', notas: '' });
      await cargarDepositosDisponibles();
      await cargarIncrementoMaximo(); // Actualizar máximo
    } catch (error) {
      mostrarAlerta(error.response?.data?.error || 'Error al registrar depósito', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVO: Eliminar depósito
  const handleEliminarDeposito = async (depositoId) => {
    if (!window.confirm('¿Estás seguro de eliminar este depósito?')) return;

    setLoading(true);
    try {
      await api.delete(`/incrementos/depositos/${depositoId}`);
      mostrarAlerta('Depósito eliminado exitosamente', 'success');
      await cargarDepositosDisponibles();
      await cargarIncrementoMaximo(); // Actualizar máximo
    } catch (error) {
      mostrarAlerta(error.response?.data?.error || 'Error al eliminar depósito', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // ============= FUNCIONES DE ASIGNACIÓN =============
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
    // ✅ FIX: Asegurar que diferencia es número
    const diferencia = parseFloat(selectedIncremento.diferencia);

    if (totalSeleccionado > diferencia) {
      mostrarAlerta(`La suma de depósitos ($${totalSeleccionado.toFixed(2)}) supera el incremento ($${diferencia.toFixed(2)})`, 'danger');
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
        `¡Asignación exitosa!\n` +
        `Incremento: $${resumen.incrementoTotal}\n` +
        `Depositado: $${resumen.totalDepositado}\n` +
        `Ganancia: $${resumen.ganancia} (${resumen.porcentajeGanancia})`,
        'success'
      );

      setSelectedIncremento(null);
      setDepositosSeleccionados([]);
      setNotasAsignacion('');
      await cargarIncrementos();
      await cargarDepositosDisponibles();
    } catch (error) {
      mostrarAlerta(error.response?.data?.error || 'Error al asignar depósitos', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleIgnorarIncremento = async (incrementoId) => {
    if (!window.confirm('¿Estás seguro de ignorar este incremento?')) return;

    setLoading(true);
    try {
      await api.post(`/incrementos/incrementos/${incrementoId}/ignorar`, {
        notas: 'Ignorado desde el panel de administración'
      });
      mostrarAlerta('Incremento ignorado', 'success');
      await cargarIncrementos();
    } catch (error) {
      mostrarAlerta('Error al ignorar incremento', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // ============= FUNCIONES DE REPORTES =============
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
      setReporte(response.data);
    } catch (error) {
      mostrarAlerta('Error al generar reporte', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // ============= FUNCIONES DE CONFIGURACIÓN =============
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

  return (
    <Modal show={show} onHide={handleClose} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          Gestión de Incrementos - <Badge bg={proveedor === 'general' ? 'primary' : 'success'}>
            {proveedor === 'general' ? 'General (2611)' : 'Movistar (2612)'}
          </Badge>
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {alert.show && (
          <Alert variant={alert.variant} onClose={() => setAlert({ ...alert, show: false })} dismissible>
            {alert.message}
          </Alert>
        )}

        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
          
          {/* ============= TAB: NOTIFICACIONES ============= */}
          <Tab 
            eventKey="notificaciones" 
            title={
              <span>
                Notificaciones {incrementos.length > 0 && <Badge bg="danger">{incrementos.length}</Badge>}
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
                  // ✅ FIX: Asegurar que son números
                  const saldoAnterior = parseFloat(inc.saldoAnterior);
                  const saldoNuevo = parseFloat(inc.saldoNuevo);
                  const diferencia = parseFloat(inc.diferencia);
                  
                  return (
                    <Card key={inc.id} className="mb-3 shadow-sm">
                      <Card.Body>
                        <Row>
                          <Col md={8}>
                            <h5>
                              <Badge bg="warning" text="dark">Incremento #{inc.id}</Badge>
                              <Badge bg={proveedor === 'general' ? 'primary' : 'success'} className="ms-2">
                                {proveedor === 'general' ? 'General' : 'Movistar'}
                              </Badge>
                              <small className="text-muted ms-2">{new Date(inc.fecha).toLocaleString()}</small>
                            </h5>
                            <p className="mb-1">
                              <strong>Operadora:</strong> {inc.operadora}
                            </p>
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
                                  <small className="text-muted">Diferencia detectada</small>
                                  <h4 className="mb-0 text-success">${diferencia.toFixed(2)}</h4>
                                </Col>
                              </Row>
                            </div>
                          </Col>
                          <Col md={4} className="d-flex flex-column justify-content-center">
                            <Button 
                              variant="success" 
                              className="mb-2"
                              onClick={() => {
                                setSelectedIncremento(inc);
                                setActiveTab('asignar');
                              }}
                            >
                              Asignar Depósitos
                            </Button>
                            <Button 
                              variant="outline-secondary"
                              onClick={() => handleIgnorarIncremento(inc.id)}
                            >
                              Ignorar
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

          {/* ============= TAB: REGISTRAR DEPÓSITOS ============= */}
          <Tab eventKey="depositos" title="Registrar Depósito">
            <Card className="shadow-sm">
              <Card.Body>
                <h5 className="mb-3">
                  Registrar Nuevo Depósito para{' '}
                  <Badge bg={proveedor === 'general' ? 'primary' : 'success'}>
                    {proveedor === 'general' ? 'General' : 'Movistar'}
                  </Badge>
                </h5>
                
                {/* ✅ NUEVO: Mostrar incremento máximo disponible */}
                {incrementoMaximo > 0 && (
                  <Alert variant="info">
                    <strong>Incremento máximo disponible:</strong> ${incrementoMaximo.toFixed(2)}
                    <br />
                    <small>El monto del depósito no puede superar este valor</small>
                  </Alert>
                )}
                
                <Form onSubmit={handleRegistrarDeposito}>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Monto {incrementoMaximo > 0 && <small className="text-muted">(máx: ${incrementoMaximo.toFixed(2)})</small>}
                        </Form.Label>
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
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Usuario/Tienda</Form.Label>
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
                    <Form.Label>Notas (opcional)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={nuevoDeposito.notas}
                      onChange={(e) => setNuevoDeposito({ ...nuevoDeposito, notas: e.target.value })}
                      placeholder="Ej: Depósito en efectivo, transferencia bancaria, etc."
                    />
                  </Form.Group>
                  <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? <Spinner size="sm" /> : 'Registrar Depósito'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>

            <Card className="mt-3 shadow-sm">
              <Card.Body>
                <h5 className="mb-3">
                  Depósitos Disponibles - {proveedor === 'general' ? 'General' : 'Movistar'}
                  {' '}
                  <Badge bg="secondary">{depositosDisponibles.length}</Badge>
                </h5>
                {depositosDisponibles.length === 0 ? (
                  <Alert variant="info">No hay depósitos sin asignar para este proveedor</Alert>
                ) : (
                  <Table striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Monto</th>
                        <th>Usuario</th>
                        <th>Tipo</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {depositosDisponibles.map(dep => (
                        <tr key={dep.id}>
                          <td>{dep.id}</td>
                          <td><strong>${parseFloat(dep.monto).toFixed(2)}</strong></td>
                          <td>{dep.Usuario?.nombres_apellidos || dep.Usuario?.nombre_tienda}</td>
                          <td><Badge bg="secondary">{dep.Usuario?.rol}</Badge></td>
                          <td>{new Date(dep.fecha).toLocaleDateString()}</td>
                          <td>
                            {/* ✅ NUEVO: Botón eliminar */}
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => handleEliminarDeposito(dep.id)}
                              disabled={loading}
                            >
                              🗑️ Eliminar
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

          {/* ============= TAB: ASIGNAR DEPÓSITOS ============= */}
          <Tab eventKey="asignar" title="Asignar Depósitos">
            {!selectedIncremento ? (
              <Alert variant="warning">
                Selecciona un incremento desde la pestaña de Notificaciones
              </Alert>
            ) : (
              <div>
                <Card className="mb-3 shadow-sm border-primary">
                  <Card.Body>
                    <h5>Incremento Seleccionado</h5>
                    <Row className="mt-3">
                      <Col md={3}>
                        <small className="text-muted">ID</small>
                        <p><Badge bg="primary">#{selectedIncremento.id}</Badge></p>
                      </Col>
                      <Col md={3}>
                        <small className="text-muted">Operadora</small>
                        <p><strong>{selectedIncremento.operadora}</strong></p>
                      </Col>
                      <Col md={3}>
                        <small className="text-muted">Fecha</small>
                        <p>{new Date(selectedIncremento.fecha).toLocaleString()}</p>
                      </Col>
                      <Col md={3}>
                        <small className="text-muted">Incremento Total</small>
                        {/* ✅ FIX: parseFloat antes de toFixed */}
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
                        No hay depósitos disponibles para <strong>{proveedor === 'general' ? 'General' : 'Movistar'}</strong>. 
                        Registra depósitos primero en la pestaña "Registrar Depósito".
                      </Alert>
                    ) : (
                      <>
                        <ListGroup className="mb-3">
                          {depositosDisponibles.map(dep => (
                            <ListGroup.Item 
                              key={dep.id}
                              active={depositosSeleccionados.includes(dep.id)}
                              onClick={() => toggleDepositoSeleccionado(dep.id)}
                              style={{ cursor: 'pointer' }}
                            >
                              <Row>
                                <Col md={1}>
                                  <Form.Check
                                    type="checkbox"
                                    checked={depositosSeleccionados.includes(dep.id)}
                                    readOnly
                                  />
                                </Col>
                                <Col md={2}>
                                  <strong>${parseFloat(dep.monto).toFixed(2)}</strong>
                                </Col>
                                <Col md={5}>
                                  {dep.Usuario?.nombres_apellidos || dep.Usuario?.nombre_tienda}
                                  <Badge bg="secondary" className="ms-2">{dep.Usuario?.rol}</Badge>
                                </Col>
                                <Col md={4} className="text-end">
                                  <small className="text-muted">{new Date(dep.fecha).toLocaleDateString()}</small>
                                </Col>
                              </Row>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>

                        <Card className="bg-light">
                          <Card.Body>
                            <Row>
                              <Col md={4}>
                                {/* ✅ FIX: parseFloat */}
                                <p className="mb-1"><strong>Incremento:</strong> ${parseFloat(selectedIncremento.diferencia).toFixed(2)}</p>
                              </Col>
                              <Col md={4}>
                                <p className="mb-1"><strong>Total Seleccionado:</strong> ${calcularTotalSeleccionado().toFixed(2)}</p>
                              </Col>
                              <Col md={4}>
                                <p className="mb-1">
                                  <strong>Ganancia:</strong>{' '}
                                  <span className="text-success">
                                    ${(parseFloat(selectedIncremento.diferencia) - calcularTotalSeleccionado()).toFixed(2)}
                                    {' '}
                                    ({(((parseFloat(selectedIncremento.diferencia) - calcularTotalSeleccionado()) / parseFloat(selectedIncremento.diferencia)) * 100).toFixed(2)}%)
                                  </span>
                                </p>
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>

                        <Form.Group className="mt-3">
                          <Form.Label>Notas de asignación (opcional)</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            value={notasAsignacion}
                            onChange={(e) => setNotasAsignacion(e.target.value)}
                          />
                        </Form.Group>

                        <div className="mt-3 d-flex gap-2">
                          <Button 
                            variant="success" 
                            onClick={handleAsignarDepositos}
                            disabled={loading || depositosSeleccionados.length === 0}
                          >
                            {loading ? <Spinner size="sm" /> : 'Confirmar Asignación'}
                          </Button>
                          <Button 
                            variant="outline-secondary"
                            onClick={() => {
                              setSelectedIncremento(null);
                              setDepositosSeleccionados([]);
                              setNotasAsignacion('');
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </>
                    )}
                  </Card.Body>
                </Card>
              </div>
            )}
          </Tab>

          {/* ============= TAB: REPORTES ============= */}
          <Tab eventKey="reportes" title="Reportes">
            <Card className="shadow-sm mb-3">
              <Card.Body>
                <h5 className="mb-3">
                  Generar Reporte de Ganancias - {' '}
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
                    <Button onClick={handleGenerarReporte} disabled={loading}>
                      {loading ? <Spinner size="sm" /> : 'Generar Reporte'}
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {reporte && (
              <Card className="shadow-sm">
                <Card.Body>
                  <h5 className="mb-3">
                    Resultados - {proveedor === 'general' ? 'General' : 'Movistar'}
                  </h5>
                  <Row className="mb-3">
                    <Col md={3}>
                      <Card className="text-center bg-light">
                        <Card.Body>
                          <small className="text-muted">Total Incrementos</small>
                          <h4 className="text-primary">${reporte.porProveedor[proveedor]?.totalIncrementos}</h4>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="text-center bg-light">
                        <Card.Body>
                          <small className="text-muted">Total Depositado</small>
                          <h4 className="text-info">${reporte.porProveedor[proveedor]?.totalDepositado}</h4>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="text-center bg-light">
                        <Card.Body>
                          <small className="text-muted">Ganancia Total</small>
                          <h4 className="text-success">${reporte.porProveedor[proveedor]?.gananciaTotal}</h4>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="text-center bg-light">
                        <Card.Body>
                          <small className="text-muted">% Ganancia</small>
                          <h4 className="text-warning">{reporte.porProveedor[proveedor]?.porcentajeGanancia}%</h4>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  <h6 className="mt-4">Depósitos por Usuario</h6>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Rol</th>
                        <th className="text-end">Total Depositado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.porProveedor[proveedor]?.depositosPorUsuario.map((dep, idx) => (
                        <tr key={idx}>
                          <td>{dep.usuario}</td>
                          <td><Badge bg="secondary">{dep.rol}</Badge></td>
                          <td className="text-end"><strong>${dep.total}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}
          </Tab>

          {/* ============= TAB: CONFIGURACIÓN ============= */}
          <Tab eventKey="configuracion" title="Configuración">
            <Card className="shadow-sm">
              <Card.Body>
                <h5 className="mb-3">Configuración de Detección</h5>
                <Alert variant="info">
                  La configuración de detección aplica para <strong>ambos proveedores</strong> (General y Movistar).
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
                  <strong>¿Qué hace esto?</strong>
                  <ul className="mb-0 mt-2">
                    <li>Cuando está <strong>activada</strong>, cada recarga compara el saldo anterior vs el saldo nuevo</li>
                    <li>Si detecta una diferencia mayor a $10, crea una notificación automática</li>
                    <li>Las notificaciones aparecen clasificadas por proveedor (General/Movistar)</li>
                    <li>Los badges en el navbar muestran el número de incrementos pendientes por proveedor</li>
                    <li>Puedes asignar depósitos a cada incremento para llevar contabilidad precisa</li>
                  </ul>
                </Alert>
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default IncrementosModal;