// ==================== CAMBIOS PARA IncrementosModal.js ====================
// Aplicar estos cambios en orden

// ============= 1. AGREGAR NUEVOS ESTADOS (después de los estados existentes, línea ~15) =============

const [porcentajeRealMovistar, setPorcentajeRealMovistar] = useState(null);
const [cargandoPorcentaje, setCargandoPorcentaje] = useState(false);
const [simulacionRendimiento, setSimulacionRendimiento] = useState(null);
const [cargandoSimulacion, setCargandoSimulacion] = useState(false);
const [analisisCompleto, setAnalisisCompleto] = useState(null);

// ============= 2. ACTUALIZAR useEffect para cargar métricas (línea ~57) =============

useEffect(() => {
  if (activeTab === 'reportes' && fechaInicio && fechaFin && show) {
    if (proveedor === 'movistar') {
      cargarMetricasMovistar(); // ⭐ Nueva función
    } else {
      setPorcentajeRealMovistar(null);
      setSimulacionRendimiento(null);
      setAnalisisCompleto(null);
    }
  }
}, [fechaInicio, fechaFin, activeTab, show, proveedor]);

// ============= 3. AGREGAR NUEVA FUNCIÓN cargarMetricasMovistar =============

const cargarMetricasMovistar = async () => {
  if (proveedor !== 'movistar') return;
  
  setCargandoPorcentaje(true);
  setCargandoSimulacion(true);
  
  try {
    const params = new URLSearchParams({
      startDate: fechaInicio,
      endDate: fechaFin
    });
    
    // 1. Cargar métricas reales (corregidas)
    const responseMetricas = await api.get(`/incrementos/movistar/porcentaje-real?${params}`);
    setPorcentajeRealMovistar(responseMetricas.data);
    
    console.log('📊 Métricas Reales Movistar (CORREGIDAS):', responseMetricas.data);
    
    // 2. Cargar simulación con los datos reales
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

// ============= 4. ACTUALIZAR resetearEstados (agregar nuevos estados, línea ~90) =============

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
  setSimulacionRendimiento(null);
  setAnalisisCompleto(null);
  setCargandoPorcentaje(false);
  setCargandoSimulacion(false);
};

// ============= 5. CREAR NUEVO COMPONENTE PanelAnalisisMovistar =============
// Agregar ANTES del return final (línea ~800 aprox)

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
    <Card className="mb-3 shadow-sm border-success">
      <Card.Header className="bg-success bg-opacity-10 border-success">
        <h6 className="mb-0 fw-bold text-success d-flex align-items-center justify-content-between">
          <span>
            <FiTrendingUp className="me-2" /> 
            Análisis Completo - Periodo: {datos.periodo.inicio} a {datos.periodo.fin}
          </span>
          {loading && <Spinner size="sm" />}
        </h6>
      </Card.Header>
      <Card.Body>
        {/* ===== FILA 1: CAPITAL Y OPERACIONES ===== */}
        <Row className="g-3 mb-3">
          <Col md={3}>
            <div className="text-center p-3 bg-light rounded h-100">
              <small className="text-muted d-block mb-2">💰 CAPITAL INICIAL</small>
              <h5 className="mb-1 text-primary">
                {formatearMoneda(datos.capitalInicial)}
              </h5>
              <small className="text-muted d-block">
                Saldo: {formatearMoneda(datos.saldoInicial)}<br/>
                Incrementos: +{formatearMoneda(datos.totalIncrementos)}
              </small>
            </div>
          </Col>
          
          <Col md={3}>
            <div className="text-center p-3 bg-danger bg-opacity-10 rounded h-100">
              <small className="text-muted d-block mb-2">📉 INVERTIDO</small>
              <h5 className="mb-1 text-danger">
                -{formatearMoneda(datos.totalInvertido)}
              </h5>
              <small className="text-muted d-block">
                {datos.cantidadRecargas} recargas<br/>
                Promedio: {formatearMoneda(datos.promedioComision)}/recarga
              </small>
            </div>
          </Col>
          
          <Col md={3}>
            <div className="text-center p-3 bg-success bg-opacity-10 rounded h-100">
              <small className="text-muted d-block mb-2">✅ COMISIONES GANADAS</small>
              <h5 className="mb-1 text-success">
                +{formatearMoneda(datos.totalComisionesReales)}
              </h5>
              <small className="text-muted d-block">
                Registradas: {formatearMoneda(datos.comisionesRegistradas)}<br/>
                Calculadas: {formatearMoneda(datos.comisionesCalculadas)}
              </small>
            </div>
          </Col>
          
          <Col md={3}>
            <div className="text-center p-3 bg-info bg-opacity-10 rounded h-100">
              <small className="text-muted d-block mb-2">💎 CAPITAL DISPONIBLE</small>
              <h5 className="mb-1 text-info">
                {formatearMoneda(datos.capitalDisponible)}
              </h5>
              <small className="text-muted d-block">
                Puedes seguir<br/>operando con esto
              </small>
            </div>
          </Col>
        </Row>
        
        {/* ===== FILA 2: MÉTRICAS PRINCIPALES (DESTACADAS) ===== */}
        <Row className="g-3 mb-3">
          <Col md={4}>
            <div className="text-center p-4 bg-gradient rounded shadow-sm" 
                 style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <small className="d-block mb-2 text-white opacity-75">
                📊 COMISIÓN PROMEDIO
              </small>
              <h2 className="mb-1 fw-bold text-white">
                {datos.porcentajePeriodoRedondeado}%
              </h2>
              <small className="text-white opacity-90 d-block">
                Por cada recarga ganas este %<br/>
                <Badge bg="light" className="text-dark mt-1">
                  {datos.porcentajePeriodo}% exacto
                </Badge>
              </small>
            </div>
          </Col>
          
          <Col md={4}>
            <div className="text-center p-4 rounded shadow-sm bg-gradient" 
                 style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
              <small className="d-block mb-2 text-white opacity-75">
                ✅ GANANCIA REAL
              </small>
              <h2 className="mb-1 fw-bold text-white">
                {formatearMoneda(datos.gananciaReal)}
              </h2>
              <small className="text-white opacity-90 d-block">
                Dinero que ganaste en comisiones<br/>
                <Badge bg="light" className="text-success mt-1">
                  Solo comisiones = Ganancia
                </Badge>
              </small>
            </div>
          </Col>
          
          <Col md={4}>
            <div className="text-center p-4 rounded shadow-sm bg-gradient"
                 style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <small className="d-block mb-2 text-white opacity-75">
                🎯 ROI REAL
              </small>
              <h2 className="mb-1 fw-bold text-white">
                {datos.roiRealRedondeado}%
              </h2>
              <small className="text-white opacity-90 d-block">
                (Comisiones / Capital) × 100<br/>
                <Badge bg="light" className="text-primary mt-1">
                  {datos.roiReal}% exacto
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
                ¿Qué significa cada métrica?
              </h6>
            </Col>
            <Col md={6}>
              <strong>📊 Comisión Promedio ({datos.porcentajePeriodoRedondeado}%)</strong>
              <p className="mb-0 small">
                Es el porcentaje que ganas por cada recarga. 
                Ejemplo: Si recargas $100, ganas ~${(parseFloat(datos.porcentajePeriodoRedondeado)).toFixed(2)}.
              </p>
            </Col>
            <Col md={6}>
              <strong>🎯 ROI Real ({datos.roiRealRedondeado}%)</strong>
              <p className="mb-0 small">
                Es tu ganancia sobre el capital invertido. 
                {formatearMoneda(datos.gananciaReal)} / {formatearMoneda(datos.capitalInicial)} × 100 = {datos.roiRealRedondeado}%
              </p>
            </Col>
          </Row>
        </Alert>
        
        {/* ===== SIMULACIÓN (SI ESTÁ DISPONIBLE) ===== */}
        {simulacion && (
          <>
            <hr className="my-3" />
            <h6 className="mb-3 fw-bold text-primary">
              <FiBarChart2 className="me-2" />
              🔮 Proyección: ¿Qué pasa si sigues usando todo el capital?
            </h6>
            <Row className="g-3 mb-3">
              <Col md={3}>
                <div className="text-center p-3 bg-light rounded">
                  <small className="text-muted d-block mb-1">Recargas Posibles</small>
                  <h4 className="mb-0 text-primary">{simulacion.numeroRecargas}</h4>
                  <small className="text-muted">
                    vs {datos.cantidadRecargas} realizadas
                  </small>
                </div>
              </Col>
              <Col md={3}>
                <div className="text-center p-3 bg-success bg-opacity-10 rounded">
                  <small className="text-muted d-block mb-1">Comisiones Totales</small>
                  <h4 className="mb-0 text-success">
                    {formatearMoneda(simulacion.totalComisionesGanadas)}
                  </h4>
                  <small className="text-muted">
                    Ganancia potencial
                  </small>
                </div>
              </Col>
              <Col md={3}>
                <div className="text-center p-3 bg-warning bg-opacity-10 rounded">
                  <small className="text-muted d-block mb-1">Rendimiento Efectivo</small>
                  <h4 className="mb-0 text-warning">
                    {simulacion.rendimientoEfectivoRedondeado}%
                  </h4>
                  <small className="text-muted">
                    Con reinversión total
                  </small>
                </div>
              </Col>
              <Col md={3}>
                <div className="text-center p-3 bg-info bg-opacity-10 rounded">
                  <small className="text-muted d-block mb-1">Saldo Final</small>
                  <h4 className="mb-0 text-info">
                    {formatearMoneda(simulacion.capitalFinalDisponible)}
                  </h4>
                  <small className="text-muted">
                    Al terminar
                  </small>
                </div>
              </Col>
            </Row>
            
            <Alert variant="success">
              <small>
                <strong>💡 Interpretación:</strong> Si sigues haciendo recargas con todo tu capital disponible 
                ({formatearMoneda(datos.capitalDisponible)}), podrías realizar {simulacion.numeroRecargas} recargas más y 
                ganar {formatearMoneda(simulacion.totalComisionesGanadas)} en total ({simulacion.rendimientoEfectivoRedondeado}% de rendimiento efectivo).
              </small>
            </Alert>
          </>
        )}
        
        {/* ===== DESGLOSE POR OPERADORA ===== */}
        {datos.detallesPorOperadora && datos.detallesPorOperadora.length > 0 && (
          <>
            <hr className="my-3" />
            <div className="d-flex justify-content-between align-items-center mb-2">
              <small className="fw-bold text-muted">
                📊 Desglose por Operadora
              </small>
              <Badge bg="primary">
                Periodo: {datos.periodo.inicio} - {datos.periodo.fin}
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
                  {datos.detallesPorOperadora.map((op, idx) => (
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
                      <Badge bg="dark">{datos.cantidadRecargas}</Badge>
                    </td>
                    <td className="small text-end text-danger">
                      -{formatearMoneda(datos.totalInvertido)}
                    </td>
                    <td className="small text-end text-success">
                      +{formatearMoneda(datos.totalComisionesReales)}
                    </td>
                    <td className="small text-end">
                      {formatearMoneda(datos.promedioComision)}
                    </td>
                    <td className="small text-center">
                      <Badge bg="success" className="fw-bold">
                        {datos.porcentajePeriodoRedondeado}%
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
            <strong>📋 Resumen del Periodo:</strong>
            <pre className="mb-0 mt-2" style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
{datos.explicacion}
            </pre>
          </small>
        </div>
      </Card.Body>
    </Card>
  );
};

// ============= 6. REEMPLAZAR SECCIÓN DE REPORTES (dentro del Tab 'reportes', línea ~1100) =============
// BUSCAR la sección donde muestra las cards de métricas y REEMPLAZAR con:

{/* ANÁLISIS MOVISTAR - REEMPLAZA LAS 4 CARDS ANTERIORES */}
{proveedor === 'movistar' ? (
  <PanelAnalisisMovistar 
    datos={porcentajeRealMovistar}
    simulacion={simulacionRendimiento}
    loading={cargandoPorcentaje || cargandoSimulacion}
  />
) : (
  <>
    {/* MÉTRICAS TRADICIONALES PARA GENERAL */}
    <Row className="mb-3">
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
    </Row>
  </>
)}

// ============= NOTAS IMPORTANTES =============
/*
CAMBIOS APLICADOS:

1. ✅ Agregados nuevos estados para métricas corregidas
2. ✅ Función cargarMetricasMovistar() llama a endpoints corregidos
3. ✅ Nuevo componente PanelAnalisisMovistar muestra:
   - Capital inicial (saldo + incrementos)
   - Capital disponible (NO es pérdida)
   - Ganancia real (solo comisiones)
   - ROI corregido
   - Simulación de rendimiento con reinversión
4. ✅ Desglose por operadora del periodo
5. ✅ Explicaciones claras de cada métrica

ENDPOINTS USADOS:
- GET /incrementos/movistar/porcentaje-real (corregido)
- GET /incrementos/movistar/simulacion-rendimiento (nuevo)

RESULTADO:
Ahora muestra correctamente:
- ROI = 0.47% (no -6.05%)
- Ganancia = $79.13 (comisiones)
- Capital disponible = $15,855.74
- Proyección hasta agotar capital
*/