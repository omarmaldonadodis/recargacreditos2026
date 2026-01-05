import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Table,
  InputGroup,
  FormControl,
  Row,
  Col,
  Dropdown,
  DropdownButton,
  Button,
  Pagination,
  ButtonGroup,
} from "react-bootstrap";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import ExcelJS from "exceljs";
import FileSaver from "file-saver";
import { jwtDecode } from "jwt-decode";
import api from "../../services/axiosConfig";

import "react-datepicker/dist/react-datepicker.css";
import es from "date-fns/locale/es";

// Registrar el idioma español y personalizar los meses
const esCustom = {
  ...es,
  localize: {
    ...es.localize,
    month: (n) => {
      const months = [
        "ENERO",
        "FEBRERO",
        "MARZO",
        "ABRIL",
        "MAYO",
        "JUNIO",
        "JULIO",
        "AGOSTO",
        "SEPTIEMBRE",
        "OCTUBRE",
        "NOVIEMBRE",
        "DICIEMBRE",
      ];
      return months[n];
    },
  },
};

registerLocale("es-custom", esCustom);

const ManageVentas = () => {
  const [recargas, setRecargas] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalVentas, setTotalVentas] = useState(0);
  const [weeklyAverage, setWeeklyAverage] = useState(0);
  const [sortOrder, setSortOrder] = useState({
    column: "fecha",
    order: "desc",
  });
  const searchInputRef = useRef(null);

  const token = localStorage.getItem("token");
  const decodedToken = jwtDecode(token);
  const emailUsuario = decodedToken.nombre_tienda || "";

  useEffect(() => {
   // searchInputRef.current.focus();
    fetchRecargas();
  }, [startDate, endDate]);

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
      "ENERO",
      "FEBRERO",
      "MARZO",
      "ABRIL",
      "MAYO",
      "JUNIO",
      "JULIO",
      "AGOSTO",
      "SEPTIEMBRE",
      "OCTUBRE",
      "NOVIEMBRE",
      "DICIEMBRE",
    ];

    return (
      <div
        className="react-datepicker__header-custom"
        style={{ padding: "10px" }}
      >
        <button
          className="react-datepicker__navigation--previous"
          onClick={decreaseMonth}
          disabled={prevMonthButtonDisabled}
          style={{ border: "none", background: "none", cursor: "pointer" }}
        >
          {"<"}
        </button>
        <div style={{ display: "inline-flex", gap: "8px" }}>
          <select
            value={months[date.getMonth()]}
            onChange={({ target: { value } }) =>
              changeMonth(months.indexOf(value))
            }
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px",
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
              border: "none",
              background: "none",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px",
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
          style={{ border: "none", background: "none", cursor: "pointer" }}
        >
          {">"}
        </button>
      </div>
    );
  };
  const handleStartDateChange = (date) => {
    if (!date) {
      setStartDate(null);
      setEndDate(null);
    } else {
      const newStart = new Date(date);
      newStart.setHours(0, 0, 0, 0);
      setStartDate(newStart);
      // Si aún no hay fecha final, se asigna la misma fecha con hora de fin.
      if (!endDate) {
        const newEnd = new Date(date);
        newEnd.setHours(23, 59, 59, 999);
        setEndDate(newEnd);
      }
    }
  };
  
  const handleEndDateChange = (date) => {
    if (!date) {
      setStartDate(null);
      setEndDate(null);
    } else {
      const newEnd = new Date(date);
      newEnd.setHours(23, 59, 59, 999);
      setEndDate(newEnd);
      // Si aún no hay fecha de inicio, se asigna la misma fecha con hora de inicio.
      if (!startDate) {
        const newStart = new Date(date);
        newStart.setHours(0, 0, 0, 0);
        setStartDate(newStart);
      }
    }
  };  
    const fetchRecargas = async () => {
    const token = localStorage.getItem("token");
    try {
      let url = "https://www.recargacreditos.com.mx/api/tiendas/recargas";
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



            const response = await axios.get(url, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
      setRecargas(response.data.recargas);
      setWeeklyAverage(response.data.promedio_semanal);
      setTotalVentas(response.data.total_recargas);

    } catch (error) {
      console.error("Error al obtener las recargas", error);
    }
  };
  // Función para limitar la entrada de caracteres solo a números y "/"
  const handleKeyDown = (e) => {
    const validKeys = ["Backspace", "Tab", "ArrowLeft", "ArrowRight", "/"];
    const isNumber = /^[0-9]$/.test(e.key);

    // Si la tecla presionada no es un número, una tecla de navegación válida o "/"
    if (!isNumber && !validKeys.includes(e.key)) {
      e.preventDefault(); // Prevenir la entrada de cualquier otro carácter
    }
  };

  const handleSearch = (event) => setSearchTerm(event.target.value);

  const calculateTotal = (filteredRecargas) => {
    const total = filteredRecargas.reduce(
      (sum, recarga) => sum + recarga.valor,
      0
    );
    setTotalVentas(total);
  };


  const handleSort = (column) => {
    const newOrder = sortOrder.order === "asc" ? "desc" : "asc";
    setSortOrder({ column, order: newOrder });
  };

  const filteredRecargas = recargas
    .filter(
      (recarga) =>
        recarga.celular.includes(searchTerm) &&
        (!startDate || new Date(recarga.fecha) >= startDate) &&
        (!endDate ||
          new Date(recarga.fecha) <= endDate.setHours(23, 59, 59, 999))
    )
    .sort((a, b) => {
      if (sortOrder.column === "fecha") {
        return sortOrder.order === "asc"
          ? new Date(a.fecha) - new Date(b.fecha)
          : new Date(b.fecha) - new Date(a.fecha);
      } else if (sortOrder.column === "operadora") {
        return sortOrder.order === "asc"
          ? a.operadora.localeCompare(b.operadora)
          : b.operadora.localeCompare(a.operadora);
      } else if (sortOrder.column === "valor") {
        return sortOrder.order === "asc"
          ? a.valor - b.valor
          : b.valor - a.valor;
      } else if (sortOrder.column === "tipo") {
        return sortOrder.order === "asc"
          ? a.tipo.localeCompare(b.tipo)
          : b.tipo.localeCompare(a.tipo);
      }
      return 0;
    });

  useEffect(() => {
    calculateTotal(filteredRecargas);
  }, [filteredRecargas]);

  const totalPages = Math.ceil(filteredRecargas.length / pageSize);
  const paginatedRecargas = filteredRecargas.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Recargas");

    worksheet.addRow([`Tienda: ${emailUsuario}`]);
    worksheet.getRow(1).font = { bold: true, size: 14 };

    worksheet.addRow([
      `Fecha de inicio: `,
      `${startDate ? startDate.toLocaleDateString() : ""}`,
      "",
      "",
      `Fecha de corte:`,
      `${endDate ? endDate.toLocaleDateString() : ""}`,
    ]);
    worksheet.getRow(2).font = { bold: true };

    worksheet.addRow([]); // Espacio entre las filas

    // Cabeceras de la tabla (a partir de la fila 4)
    worksheet.addRow([
      "Fecha",
      "Hora",
      "Folio",
      "Teléfono",
      "Cantidad",
      "Compañía",
      "Clase",
    ]);
    worksheet.getRow(4).font = { bold: true }; // Estilo de negrita para las cabeceras

    // Definir columnas con sus claves y anchos
    worksheet.columns = [
      { key: "fecha", width: 15 },
      { key: "hora", width: 10 },
      { key: "folio", width: 15 },
      { key: "celular", width: 15 },
      { key: "valor", width: 10 },
      { key: "operadora", width: 15 },
      { key: "tipo", width: 15 },
    ];

    // Aplicar estilo gráfico a las cabeceras
    worksheet.columns.forEach((column, index) => {
      const cell = worksheet.getCell(4, index + 1); // Cabeceras están en la fila 4
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; // Letras blancas y en negrita
      cell.alignment = { vertical: "middle", horizontal: "center" }; // Centrado
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF00AAE4" }, // Fondo celeste
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Agregar datos de recargas
    filteredRecargas.forEach((recarga) => {
      const horaObj = new Date(recarga.fecha).toLocaleTimeString("es", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true, // quité los segundos para ahorrar espacio
      });
      const fechaObj = new Date(recarga.fecha).toLocaleDateString("es");

      worksheet.addRow({
        fecha: fechaObj,
        hora: horaObj,
        folio: recarga.folio,
        celular: recarga.celular,
        valor: typeof recarga.valor === "number"
              ? parseFloat(recarga.valor.toFixed(2))
              : 0,  
        operadora: recarga.operadora,
        tipo: recarga.tipo,
      });
    });

    worksheet.addRow([]); // Espacio adicional

    // Fila de total de ventas
    const totalRow = worksheet.addRow([
      "",
      "",
      "",
      "",
      "",
      "Total de ventas:",
      totalVentas.toFixed(2),
    ]);
    totalRow.getCell(6).alignment = { horizontal: "right" }; // Alineación derecha para el total
    totalRow.font = { bold: true }; // Estilo de negrita para el total

    // Aplicar autofiltro a las columnas
    worksheet.autoFilter = {
      from: "A4", // Cabeceras están en la fila 4
      to: "G4", // Hasta la columna G
    };

    // Crear y descargar el archivo Excel
    const buffer = await workbook.xlsx.writeBuffer();
    FileSaver.saveAs(new Blob([buffer]), "Recargas.xlsx");
  };

  return (
    <Container>
      <Row className="my-4">
        <Col xs={6} sm={8} md={8} lg={8}>
          <h3 className="text-left" style={{ color: "#0A74DA" }}>
            Historial de Recargas
          </h3>
        </Col>
        <Col
          xs={6}
          sm={4}
          md={4}
          lg={4}
          className="d-flex justify-content-end align-items-center"
        >
          <Button variant="success" onClick={exportToExcel}>
            Exportar a Excel
          </Button>
        </Col>
      </Row>

      <Row className="mb-3 align-items-center">
        <Col xs={12} md={6}>
          <InputGroup>
            <FormControl
              ref={searchInputRef}
              placeholder="Buscar por celular"
              onChange={handleSearch}
              inputMode="numeric"
              maxLength={10}
              onKeyDown={(e) => {
                if (
                  !/[0-9]/.test(e.key) &&
                  e.key !== "Backspace" &&
                  e.key !== "Delete"
                ) {
                  e.preventDefault();
                }
              }}
            />
          </InputGroup>
        </Col>

        {/* Contenedor para las fechas */}
        <Col xs={12} md={6} className="d-flex justify-content-center">
          {/* Primer DatePicker (Fecha de inicio) */}
          <DatePicker
            selected={startDate}
            onChange={(date) => {
              handleStartDateChange(date);
              // Inmediatamente quitar el foco después de seleccionar
              document.activeElement.blur();
            }}
            placeholderText="Fecha de inicio"
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
            placeholderText="Fecha de fin"
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
        </Col>

        {/* Dropdown para "Mostrar"
  <Col xs={12} md={2} className="mt-2 mt-md-0">
    <DropdownButton
      variant="outline-secondary"
      title={`Mostrar ${pageSize}`}
      id="input-group-dropdown-2"
      onSelect={(e) => {
        if (e === "all") {
          setPageSize(filteredRecargas.length);
        } else {
          setPageSize(parseInt(e));
        }
      }}
      className="w-100"
    >
      <Dropdown.Item eventKey="10">10</Dropdown.Item>
      <Dropdown.Item eventKey="20">20</Dropdown.Item>
      <Dropdown.Item eventKey="50">50</Dropdown.Item>
      <Dropdown.Item eventKey="100">100</Dropdown.Item>
      <Dropdown.Divider />
      <Dropdown.Item eventKey="all">Todo</Dropdown.Item>
    </DropdownButton>
  </Col>*/}
      </Row>

      <Row className="my-4 d-block d-md-none">
        <Col className="d-flex justify-content-center">
          <ButtonGroup>
            <Button
              variant="outline-secondary"
              onClick={() => handleSort("fecha")}
            >
              Ordenar por Fecha
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => handleSort("valor")}
            >
              Ordenar por Cantidad
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => handleSort("operadora")}
            >
              Ordenar por Compañía
            </Button>
          </ButtonGroup>
        </Col>
      </Row>
      {/* Versión de tabla para pantallas grandes */}
      <Table hover className="custom-table d-none d-md-table">
        <thead>
          <tr>
            <th
              onClick={() => handleSort("fecha")}
              style={{ cursor: "pointer" }}
            >
              Fecha{" "}
              {sortOrder.column === "fecha" &&
                (sortOrder.order === "asc" ? "↑" : "↓")}
            </th>
            <th>Hora</th>
            <th>Folio</th>
            <th>Número</th>
            <th
              onClick={() => handleSort("valor")}
              style={{ cursor: "pointer" }}
            >
              Cantidad{" "}
              {sortOrder.column === "valor" &&
                (sortOrder.order === "asc" ? "↑" : "↓")}
            </th>
            <th
              onClick={() => handleSort("operadora")}
              style={{ cursor: "pointer" }}
            >
              Compañía{" "}
              {sortOrder.column === "operadora" &&
                (sortOrder.order === "asc" ? "↑" : "↓")}
            </th>
            <th
              onClick={() => handleSort("tipo")}
              style={{ cursor: "pointer" }}
            >
              Clase{" "}
              {sortOrder.column === "tipo" &&
                (sortOrder.order === "asc" ? "↑" : "↓")}
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedRecargas.map((recarga, index) => (
            <tr key={index}>
              <td>{new Date(recarga.fecha).toLocaleDateString()}</td>
              <td>
                {new Date(recarga.fecha).toLocaleTimeString("es", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </td>{" "}
              <td>{recarga.folio}</td>
              <td>{recarga.celular}</td>
              <td>{recarga.valor.toFixed(2)}</td>
              <td>{recarga.operadora}</td>
              <td>{recarga.tipo}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="d-md-none">
        {paginatedRecargas.map((recarga, index) => (
          <div key={index} className="recarga-info-container">
            <div className="recarga-info">
              <div>
                <strong>Fecha</strong>
                {new Date(recarga.fecha).toLocaleDateString()}
              </div>
              <div>
                <strong>Hora</strong>
                {new Date(recarga.fecha).toLocaleTimeString("es", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true, // quité los segundos para ahorrar espacio
                })}
              </div>
              <div>
                <strong>Folio</strong>
                {recarga.folio}
              </div>
            </div>
            <div className="recarga-info">
              <div>
                <strong>Número</strong>
                {recarga.celular}
              </div>
              <div>
                <strong>Monto</strong>${recarga.valor.toFixed(2)}
              </div>
              <div>
                <strong>Compañía</strong>
                {recarga.operadora}
              </div>
            </div>
            <div className="recarga-info">
              <div>
                <strong>Clase</strong>
                {recarga.tipo.charAt(0).toUpperCase() + recarga.tipo.slice(1)}
              </div>
              <div></div>
              <div></div>
            </div>
          </div>
        ))}
      </div>

      <Pagination className="justify-content-center">
        <ButtonGroup>
          {Array.from({ length: totalPages }, (_, index) => (
            <Button
              key={index + 1}
              variant={
                index + 1 === currentPage ? "primary" : "outline-primary"
              }
              onClick={() => handlePageChange(index + 1)}
            >
              {index + 1}
            </Button>
          ))}
        </ButtonGroup>
      </Pagination>

      <div className="mt-4 text-right">
        <strong>Total de ventas:</strong> ${totalVentas.toFixed(2)}
      </div>

      <div className="mt-4 text-center">
        <strong>Promedio de Ventas Semanal:</strong> $
        { weeklyAverage.toFixed(2)}
      </div>

      <style>{`
        .custom-table {
          border-collapse: collapse;
          width: 100%;
        }
        .custom-table thead th {
          border-bottom: 1px solid #ddd;
        }
        .custom-table tbody tr {
          transition: background-color 0.3s ease;
        }
        .custom-table tbody tr:hover {
          background-color: #f1f1f1;
        }
        .custom-table tbody tr:nth-child(odd) {
          background-color: #f9f9f9;
        }
        .custom-table tbody tr:nth-child(even) {
          background-color: #ffffff;
        }
        .custom-table td, .custom-table th {
          border: none;
          padding: 12px 15px;
        }

        /* Corrección: Atenuar días fuera del mes (se mantienen clicables para cambiar la vista) */
        .react-datepicker__day--outside-month {
          opacity: 0.5;
        }
          
          
        @media (max-width: 768px) {
    .recarga-info-container {
  border-bottom: 1px solid #eee;
  padding: 8px 0;
  margin-bottom: 8px;
}

.recarga-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.9rem; /* Reducir tamaño de fuente */
}

.recarga-info > div {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 4px;
}

.recarga-info > div:first-child {
  align-items: flex-start;
}

.recarga-info > div:nth-child(2) {
  align-items: center;
  text-align: center;
}

.recarga-info > div:last-child {
  align-items: flex-end;
  text-align: right;
}

.recarga-info strong {
  display: block;
  margin-bottom: 2px;

}
        }
        th {
          cursor: pointer;
        }

      `}</style>
    </Container>
  );
};

export default ManageVentas;
