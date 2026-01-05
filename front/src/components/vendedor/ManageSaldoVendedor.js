import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Table, Row, Col, Dropdown, DropdownButton, Button, Pagination } from 'react-bootstrap';
import DatePicker, { registerLocale } from 'react-datepicker';
import axios from 'axios';
import ExcelJS from 'exceljs';
import FileSaver from 'file-saver';
import { ButtonGroup} from 'react-bootstrap';
import api from '../../services/axiosConfig';


import "react-datepicker/dist/react-datepicker.css";
import es from 'date-fns/locale/es';


// Registrar el idioma español y personalizar los meses
const esCustom = {
  ...es,
  localize: {
    ...es.localize,
    month: (n) => {
      const months = [
        'ENERO',
        'FEBRERO',
        'MARZO',
        'ABRIL',
        'MAYO',
        'JUNIO',
        'JULIO',
        'AGOSTO',
        'SEPTIEMBRE',
        'OCTUBRE',
        'NOVIEMBRE',
        'DICIEMBRE'
      ];
      return months[n];
    }
  }
};

registerLocale('es-custom', esCustom);

const ManageSaldoVendedor = () => {
  const [saldosAcreditados, setSaldosAcreditados] = useState([]);
  const [saldoDisponible, setSaldoDisponible] = useState(0);
  const [credito, setCredito] = useState(0);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState({ column: 'fecha', order: 'desc' });
  const [showPagados, setShowPagados] = useState(false);

  useEffect(() => {
    fetchSaldos();
    // Reiniciamos la página en caso de que se modifique el filtro
    setCurrentPage(1);
  }, [startDate, endDate]);

  const fetchSaldos = async () => {
    const token = localStorage.getItem('token');
    try {
      let url = 'https://www.recargacreditos.com.mx/api/tiendas/saldo2';
      const params = new URLSearchParams();

      // Si se seleccionó un rango de fechas se envían en el query
      if (startDate || endDate) {
        if (startDate) {
          // Enviar solo la parte de la fecha: YYYY-MM-DD
          params.append("startDate", startDate.toISOString().split('T')[0]);
        }
        if (endDate) {
          params.append("endDate", endDate.toISOString().split('T')[0]);
        }
      } else {
        // Si no hay filtro de fechas se limita a los últimos 50 registros
        params.append("limit", "100");
      }

      // Se obtiene el timezone del navegador para enviarlo (por ejemplo: "America/Mexico_City")
      const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      params.append("timezone", clientTimeZone);

      // Si hay parámetros se concatenan a la URL
      url += `?${params.toString()}`;

      // Realizar el GET con axios (puedes utilizar también el objeto api si ya tienes configurada la instancia)
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSaldoDisponible(response.data.saldo_disponible || 0);
      setSaldosAcreditados(response.data.saldos_acreditados || []);
      setCredito(response.data.credito || 0);
    } catch (error) {
      console.error('Error al obtener los saldos', error);
    }
  };

  const handleSort = (column) => {
    const newOrder = sortOrder.order === 'asc' ? 'desc' : 'asc';
    setSortOrder({ column, order: newOrder });
  };

  const handleCreditoFilter = () => {
    setShowPagados(!showPagados);
  };

  const formatValue = (value) => (typeof value === 'number' ? value.toFixed(2) : '');

  const filteredSaldos = saldosAcreditados
    .filter(saldo => 
      (!startDate || new Date(saldo.fecha) >= startDate) &&
      (!endDate || new Date(saldo.fecha) <= endDate) &&
      (!showPagados || !saldo.credito)
    )
    .sort((a, b) => {
      if (sortOrder.column === 'fecha') {
        return sortOrder.order === 'asc' ? new Date(a.fecha) - new Date(b.fecha) : new Date(b.fecha) - new Date(a.fecha);
      }
      return 0;
    });

  const totalPages = Math.ceil(filteredSaldos.length / pageSize);
  const paginatedSaldos = filteredSaldos.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Saldos Acreditados');
  
    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 20 },

      { header: 'Cantidad', key: 'valor', width: 15 },
      { header: 'Acreditado', key: 'acreditado', width: 15 },
      //{ header: 'Crédito', key: 'restante', width: 15 },
      { header: 'Estado', key: 'estado', width: 20 }
    ];
  
    // Aplicar estilo a los encabezados
    worksheet.columns.forEach((column, index) => {
      const cell = worksheet.getCell(1, index + 1); // Encabezados en la primera fila
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; // Letras en blanco y en negrita
      cell.alignment = { vertical: 'middle', horizontal: 'center' }; // Centrado
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF00AAE4' } // Fondo celeste
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  
    // Aplicar autofiltros a las columnas
    worksheet.autoFilter = {
      from: 'A1', // Celda inicial para el autofiltro
      to: 'E1' // Celda final para el autofiltro
    };
  
    // Agregar las filas de datos
    filteredSaldos.forEach((saldo) => {
      let estadoTransaccion;
  
      if (saldo.valor < 0) {
        estadoTransaccion = 'Corrección de Saldo';
      } else if (saldo.credito) {
        estadoTransaccion = 'Saldo pagado';
      } else {
        estadoTransaccion = 'Saldo puesto';
      }
  
      worksheet.addRow({
        fecha: saldo.fecha ? new Date(saldo.fecha).toLocaleString() : '',

        valor: typeof saldo.valor === "number"
              ? parseFloat(saldo.valor.toFixed(2))
              : 0,
        acreditado: typeof saldo.valor_con_porcentaje === "number"
              ? parseFloat(saldo.valor_con_porcentaje.toFixed(2))
              : 0,
        //restante: typeof saldo.valor_restante === "number" ? parseFloat(saldo.valor_restante.toFixed(2)): 0,
        estado: estadoTransaccion,
      });
    });
  
    // Crear y descargar el archivo Excel
    const buffer = await workbook.xlsx.writeBuffer();
    FileSaver.saveAs(new Blob([buffer]), 'SaldosAcreditados.xlsx');
  };
  
   
  // Componente personalizado para el header del calendario
  const CustomHeader = ({
    date,
    decreaseMonth,
    increaseMonth,
    prevMonthButtonDisabled,
    nextMonthButtonDisabled,
    changeYear,
    changeMonth,
    decreaseYear,
    increaseYear,
  }) => {
    const years = [];
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 10; year <= currentYear; year++) {
      years.push(year);
    }

    const months = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];

    return (
      <div className="react-datepicker__header-custom" style={{ padding: '10px' }}>
        <button
          className="react-datepicker__navigation--previous"
          onClick={decreaseMonth}
          disabled={prevMonthButtonDisabled}
          style={{ border: 'none', background: 'none', cursor: 'pointer' }}
        >
          {'<'}
        </button>
        <div style={{ display: 'inline-flex', gap: '8px' }}>
          <select
            value={months[date.getMonth()]}
            onChange={({ target: { value } }) => changeMonth(months.indexOf(value))}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={date.getFullYear()}
            onChange={({ target: { value } }) => changeYear(value)}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <button
          className="react-datepicker__navigation--next"
          onClick={increaseMonth}
          disabled={nextMonthButtonDisabled}
          style={{ border: 'none', background: 'none', cursor: 'pointer' }}
        >
          {'>'}
        </button>
      </div>
    );
  };
  

  const handleKeyDown = (e) => {
    const validKeys = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', '/'];
    const isNumber = /^[0-9]$/.test(e.key);

    // Si la tecla presionada no es un número, una tecla de navegación válida o "/"
    if (!isNumber && !validKeys.includes(e.key)) {
      e.preventDefault(); // Prevenir la entrada de cualquier otro carácter
    }
  };
  const handleStartDateChange = (date) => {
    // Cerrar el calendario y prevenir interacción innecesaria (se mantiene tu lógica existente)
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const touchEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      document.body.dispatchEvent(touchEvent);
      const mouseEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      document.body.dispatchEvent(mouseEvent);
    }, 1);
  
    if (!date) {
      // Si se borra la fecha, se limpia el estado
      setStartDate(null);
      setEndDate(null);
    } else {
      // Crear un nuevo objeto Date para establecer la hora de inicio (00:00:00.000)
      const newStart = new Date(date);
      newStart.setHours(0, 0, 0, 0);
      setStartDate(newStart);
  
      // Si la fecha final no está definida, se autocompleta con la misma fecha (a las 23:59:59.999)
      if (!endDate) {
        const newEnd = new Date(date);
        newEnd.setHours(23, 59, 59, 999);
        setEndDate(newEnd);
      }
    }
  };
  
  const handleEndDateChange = (date) => {
    // Cerrar el calendario y prevenir interacción innecesaria (se mantiene tu lógica existente)
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const touchEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      document.body.dispatchEvent(touchEvent);
      const mouseEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      document.body.dispatchEvent(mouseEvent);
    }, 1);
  
    if (!date) {
      // Si se borra la fecha, se limpia el estado
      setStartDate(null);
      setEndDate(null);
    } else {
      // Crear un nuevo objeto Date para establecer la hora de fin (23:59:59.999)
      const newEnd = new Date(date);
      newEnd.setHours(23, 59, 59, 999);
      setEndDate(newEnd);
  
      // Si la fecha de inicio no está definida, se autocompleta con la misma fecha (a las 00:00:00.000)
      if (!startDate) {
        const newStart = new Date(date);
        newStart.setHours(0, 0, 0, 0);
        setStartDate(newStart);
      }
    }
  };
  
  
  return (
    <Container>
      {/* UI Elements */}
      <Row className="my-4">
        <Col xs={6} sm={8} md={8} lg={8}>
          <h1 className="text-left" style={{ color: '#0A74DA' }}>Pagos</h1>
        </Col>
        <Col   xs={6}
          sm={4}
          md={4}
          lg={4}
          className="d-flex justify-content-end align-items-center">
          <Button variant="success" onClick={exportToExcel}>Exportar a Excel</Button>
        </Col>
      </Row>
      {/* Filters and Dropdowns */}
      <Row className="mb-3">
        <Col className="d-flex justify-content-between align-items-center" style={{ gap: '10px', flexWrap: 'nowrap', width: '100%' }}>
         <DatePicker
      selected={startDate}
      onChange={(date) => {
        handleStartDateChange(date);
        // Inmediatamente quitar el foco después de seleccionar
        document.activeElement.blur();
      }}
      placeholderText="Fecha inicio"
      dateFormat="dd/MM/yyyy"
      maxDate={endDate || new Date()}
      isClearable
      className="form-control w-100" 
      onKeyDown={handleKeyDown}
      popperPlacement="bottom-start"
      portalId="root-portal"
      inputMode="none" // Desactiva el teclado en dispositivos móviles
      //onFocus={(e) => e.target.blur()} // Evita el teclado pero permite abrir el calendario
    
      locale="es-custom"
      renderCustomHeader={CustomHeader}

      calendarStartDay={1} 
         // Propiedades para prevenir edición
// readOnly={true}
onFocus={(e) => {
e.target.blur(); // Previene el teclado
}}
onClick={(e) => {
e.target.focus(); // Permite abrir el calendario
}}
    />
    {/* Segundo DatePicker (Fecha de fin) */}
    <DatePicker
      selected={endDate}
      onChange={(date) => {
        handleEndDateChange(date);
        // Inmediatamente quitar el foco después de seleccionar
        document.activeElement.blur();
      }}    
      placeholderText="Fecha fin"
      dateFormat="dd/MM/yyyy"
      minDate={startDate}
      maxDate={new Date()}
      isClearable
      className="form-control w-100" 
      onKeyDown={handleKeyDown}
      inputReadOnly
      popperPlacement="bottom-end"
      portalId="root-portal"
      inputMode="none" // Desactiva el teclado en dispositivos móviles
      //onFocus={(e) => e.target.blur()} // Evita el teclado pero permite abrir el calendario
    
      locale="es-custom"
      renderCustomHeader={CustomHeader}

      calendarStartDay={1} 
         // Propiedades para prevenir edición
// readOnly={true}
onFocus={(e) => {
e.target.blur(); // Previene el teclado
}}
onClick={(e) => {
e.target.focus(); // Permite abrir el calendario
}}
    />
          <DropdownButton
            variant="outline-secondary"
            title={`Mostrar ${pageSize}`}
            id="input-group-dropdown-2"
            onSelect={(e) => setPageSize(e === 'all' ? filteredSaldos.length : parseInt(e))}
            style={{ flex: 1 }}
          >
            <Dropdown.Item eventKey="10">10</Dropdown.Item>
            <Dropdown.Item eventKey="20">20</Dropdown.Item>
            <Dropdown.Item eventKey="50">50</Dropdown.Item>
            <Dropdown.Item eventKey="100">100</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item eventKey="all">Todo</Dropdown.Item>
          </DropdownButton>
        </Col>
      </Row>
      {/* Tabla para pantallas grandes */}
<Table hover className="custom-table d-none d-md-table">
  <thead>
    <tr>
      <th onClick={() => handleSort('fecha')} style={{ cursor: 'pointer' }}>
        Fecha {sortOrder.column === 'fecha' && (sortOrder.order === 'asc' ? '↑' : '↓')}
      </th>
      <th>Cantidad</th>
      <th>Acreditado</th>
      {/* <th>Crédito</th> */}
      <th onClick={handleCreditoFilter} style={{ cursor: 'pointer' }}>
        Tipo de transacción
      </th>
    </tr>
  </thead>
  <tbody>
    {paginatedSaldos.map((saldo, index) => {
      // Verificación del estado de la transacción
      let estadoTransaccion;
      let estadoColor;

      if (saldo.valor < 0) {
        if (saldo.credito) {
          estadoTransaccion = 'Corrección de Credito';
          estadoColor = 'red';
        }  else {
          estadoTransaccion = 'Corrección de Saldo';
          estadoColor = 'red';
        }
       
      } else if (saldo.credito) {
        estadoTransaccion = 'Saldo pagado';
        estadoColor = 'green';
      } else {
        estadoTransaccion = 'Saldo puesto';
        estadoColor = 'orange';
      }

      // Formateo de valores
      const formatValue = (value) => (typeof value === 'number' ? value.toFixed(2) : '');

      return (
        <tr key={index}>
<td>{saldo.fecha ? new Date(saldo.fecha).toLocaleString('es-ES', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}) : ''}   </td>       <td>{formatValue(saldo.valor)}</td>
          <td>{formatValue(saldo.valor_con_porcentaje)}</td>
          {/* <td>{formatValue(saldo.valor_restante)}</td> */}
          <td style={{ color: estadoColor }}>{estadoTransaccion}</td>
        </tr>
      );
    })}
  </tbody>
</Table>
{/* Tarjetas para pantallas pequeñas */}
<div className="d-md-none">
  {paginatedSaldos.map((saldo, index) => {
    // Verificación del estado de la transacción
    let estadoTransaccion;
    let estadoColor;

    if (saldo.valor < 0) {
      if (saldo.credito) {
        estadoTransaccion = 'Corrección de Credito';
        estadoColor = 'red';
      }  else {
        estadoTransaccion = 'Corrección de Saldo';
        estadoColor = 'red';
      }
    } else if (saldo.credito) {
      estadoTransaccion = 'Saldo pagado';
      estadoColor = 'green';
    } else {
      estadoTransaccion = 'Saldo puesto';
      estadoColor = 'orange';
    }

    // Formateo de valores
    const formatValue = (value) => (typeof value === 'number' ? value.toFixed(2) : '');

    return (
      <div key={index} className="saldo-card">
        <div className="saldo-info">
          <div className="info-item">
          <strong>Fecha:</strong> {saldo.fecha ? new Date(saldo.fecha).toLocaleString('es-ES', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}) : ''}          </div>
          <div className="info-item">
            <strong>Cantidad:</strong> {formatValue(saldo.valor)}
          </div>
          <div className="info-item">
            <strong>Acreditado:</strong> {formatValue(saldo.valor_con_porcentaje)}
          </div>
        </div>
        <div className="saldo-info">
          {/* <div className="info-item">
            <strong>Crédito:</strong> {formatValue(saldo.valor_restante)}
          </div> */}
          <div className="info-item double-space">
            <strong>Tipo de transacción:</strong> 
            <span style={{ color: estadoColor }}>{estadoTransaccion}</span>
          </div>
        </div>
      </div>
    );
  })}
</div>

      {/* Pagination */}
      <Pagination className="justify-content-center">
        <ButtonGroup>
          {Array.from({ length: totalPages }, (_, index) => (
            <Button
              key={index + 1}
              variant={index + 1 === currentPage ? 'primary' : 'outline-primary'}
              onClick={() => handlePageChange(index + 1)}
            >
              {index + 1}
            </Button>
          ))}
        </ButtonGroup>
      </Pagination>
      {/* Balance Info */}
      <div className="mt-4 text-right">
        <strong>Saldo Disponible:</strong> ${formatValue(saldoDisponible)}
      </div>
      <div className="mt-4 text-right">
        <strong>Credito:</strong> ${formatValue(credito)}
      </div>
      {/* Styles */}

{/* Estilos ajustados para la versión móvil */}
{/* Estilos ajustados para la versión móvil */}
<style>{`
    /* Corrección: Atenuar días fuera del mes (se mantienen clicables para cambiar la vista) */
        .react-datepicker__day--outside-month {
          opacity: 0.5;
        }
  .saldo-card {
    border: 1px solid #ddd;
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 8px;
    background-color: #fff;
  }
  .saldo-info {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    padding-bottom: 8px;
  }
  .info-item {
    flex: 1 1 30%; /* Cada elemento ocupa aproximadamente un tercio del ancho */
    display: flex;
    flex-direction: column;
    margin-bottom: 5px;
    padding: 5px;
  }
  .info-item.double-space {
    flex: 2 1 60%; /* Este elemento ocupa el doble de espacio */
  }
  .info-item strong {
    text-align: left;
    margin-bottom: 4px;
  }
  @media (max-width: 768px) {
    .saldo-info {
      align-items: flex-start;
    }
  }
`}</style>

    </Container>
  );
};

export default ManageSaldoVendedor;
