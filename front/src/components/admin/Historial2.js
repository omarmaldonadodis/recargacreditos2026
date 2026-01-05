import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  DropdownButton,
  Dropdown,
  Button,
  Table,
  ButtonGroup
} from "react-bootstrap";
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import ExcelJS from "exceljs";
import FileSaver from "file-saver";
import { startOfWeek, isWithinInterval, parseISO } from "date-fns";
import { useParams } from "react-router-dom"; // Importamos useParams
import "./Historial.css"; // Asegúrate de tener este archivo CSS para los estilos
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

const formatTextByChunks = (text, chunkSize = 15) => {
  return text;
};


registerLocale("es-custom", esCustom);

const Historial = () => {
  const [selectedOption, setSelectedOption] = useState("General");
  const [comision, setComision] = useState(0);
  const [general, setGeneral] = useState(0);

  const [aperturasSemanales, setAperturasSemanales] = useState(0);
  const [pendienteRecargas, setPendienteRecargas] = useState(0);
  const [pendienteDepositar, setPendienteDepositar] = useState(0);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  const [defaultStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [defaultEndDate] = useState(new Date());

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const [searchQuery, setSearchQuery] = useState("");



  const [displayedRecordsCount, setDisplayedRecordsCount] = useState(100);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const { id } = useParams(); // Obtenemos el id de los parámetros de la URL

  useEffect(() => {
    console.log("Disparando peticiones para:", selectedOption);
    fetchSummaryData(startDate, endDate);
    fetchData(selectedOption);
  }, [selectedOption, startDate, endDate]);

  useEffect(() => {
    applyDateFilter();
  }, [data, startDate, endDate, displayedRecordsCount, searchQuery]);


  const isDefaultFilter =
    startDate.getTime() === defaultStartDate.getTime() &&
    endDate.getTime() === defaultEndDate.getTime();

  const fetchSummaryData = async (startDate = null, endDate = null) => {
    const token = localStorage.getItem("token");
    try {
      console.log("Entro al fetchSummaryData")
      // Construir la URL base
      let url = `/admin/comision-semanal/${id}/`;

      // Agregar parámetros de fechas si están definidos
      if (startDate || endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append("fechaInicio", new Date(startDate).toISOString());
        if (endDate) params.append("fechaFin", new Date(endDate).toISOString());
        url += `?${params.toString()}`;
      }

      // Realizar la solicitud
      const response = await api.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Manejo de la respuesta
      const { comision, cantidadTiendas, valor_recarga, valor_adeudado } = response.data;
      setComision(parseFloat(comision).toFixed(2));
      setAperturasSemanales(cantidadTiendas);
      setPendienteRecargas(valor_recarga);
      setPendienteDepositar(valor_adeudado);
    } catch (error) {
      console.error("Error al obtener los datos de resumen:", error);
      if (error.response?.status === 401) {
        alert("Sesión expirada. Por favor, inicie sesión nuevamente.");
        window.location.href = "/login";
      }
    }
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
const fetchData = async (option) => {
  console.log("Ejecutando fetchData con opción:", option);
  const token = localStorage.getItem("token");
  try {
    // Construir la URL base con el id y la opción seleccionada
    let url = `/admin/historial2/${id}/${option.toLowerCase()}`;

    // Si el usuario cambió manualmente alguna fecha, se envían en la query
    if (!isDefaultFilter) {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", new Date(startDate).toISOString().split('T')[0]);
      if (endDate) params.append("endDate", new Date(endDate).toISOString().split('T')[0]);
      
      url += `?${params.toString()}`;
    }

    const response = await api.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Ordenamos los datos por createdAt (o se puede ajustar según la opción)
    const sortedData = response.data.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    setData(sortedData);
  } catch (error) {
    console.error("Error al obtener los datos:", error);
  }
};
  // Definición de columnas dinámicas para la versión móvil
  const mobileSortOptions = {
    general: [
      { label: "Autor", value: "nombre_tienda" },
      { label: "Timestamp", value: "fecha" },
      { label: "Movimiento", value: "tipoMovimiento" },
      { label: "Cantidad", value: "valor" },
      
    ],
    aperturas: [
      { label: "Nombre", value: "usuario.nombre_tienda" },
      { label: "Fecha Creación", value: "createdAt" },
      { label: "Promedio", value: "promedioSemanal" },
      
    ],
    saldos: [
      { label: "Tienda", value: "tienda.usuario.nombre_tienda" },
      { label: "Fecha", value: "fecha" },
      { label: "Cantidad", value: "valor" },
    ],
    depositos: [
      { label: "Fecha", value: "fecha" },
      { label: "Cantidad", value: "valor" },
      { label: "Tienda", value: "tienda.usuario.nombre_tienda" },


    ],
    ventas: [
      { label: "Fecha", value: "fecha" },
      { label: "Cantidad", value: "valor" },
      { label: "Compañia", value: "operadora" },
    ],
    recargas: [
      { label: "Fecha", value: "fecha" },
      { label: "Cantidad", value: "valor" },
      { label: "Tipo", value: "tipoMovimiento" },
    ],
  };
  const sortOptions = mobileSortOptions[selectedOption.toLowerCase()] || [];


  const applyDateFilter = () => {
    let filtered = [];

    // Caso default: fechas por defecto
    if (isDefaultFilter) {
      filtered = data;
      // Si la opción es "saldos" y hay búsqueda, filtrar por el nombre de la tienda (ignorar mayúsculas/minúsculas)
      if (selectedOption.toLowerCase() === "saldos" && searchQuery.trim() !== "") {
        filtered = filtered.filter(item => {
          const nombreTienda = item.tienda?.usuario?.nombre_tienda || "";
          return nombreTienda.toLowerCase().includes(searchQuery.toLowerCase());
        });
      }
      filtered = filtered.slice(0, displayedRecordsCount);
      setFilteredData(filtered);
      return;
    }

    // Si se ha aplicado un filtro personalizado, aplicar el filtrado por fechas
    const adjustedEndDate = endDate
      ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
      : null;

    filtered = data.filter((item) => {
      let dateToCheck = null;

      if (
        selectedOption.toLowerCase() === "general" ||

        selectedOption.toLowerCase() === "saldos" ||
        selectedOption.toLowerCase() === "depositos" ||
        selectedOption.toLowerCase() === "ventas" ||
        selectedOption.toLowerCase() === "recargas"
      ) {
        dateToCheck = item.fecha ? parseISO(item.fecha) : null;
      } else {
        dateToCheck = item.createdAt ? parseISO(item.createdAt) : null;
      }
      if (dateToCheck) {
        if (startDate && adjustedEndDate) {
          return dateToCheck >= startDate && dateToCheck <= adjustedEndDate;
        }
        return true;
      }
      return false;
    });

    // Si la opción es "saldos" y se ingresó texto de búsqueda, aplicar filtrado por nombre de tienda
    if (selectedOption.toLowerCase() === "saldos" && searchQuery.trim() !== "") {
      filtered = filtered.filter(item => {
        const nombreTienda = item.tienda?.usuario?.nombre_tienda || "";
        return nombreTienda.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    setFilteredData(filtered);
  };



  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    const sorted = [...filteredData].sort((a, b) => {
      let aValue = getNestedValue(a, key);
      let bValue = getNestedValue(b, key);

      if (aValue < bValue) {
        return direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    setFilteredData(sorted);
  };

  const getNestedValue = (obj, path) => {
    return path.split(".").reduce((o, p) => (o ? o[p] : null), obj);
  };

  const renderTableColumns = () => {
    switch (selectedOption.toLowerCase()) {
      case "general":
        return (
            
          <>
          
            <th onClick={() => handleSort("fecha")}>Fecha</th>
            <th onClick={() => handleSort("fecha")}>Hora</th>
            <th onClick={() => handleSort("tipoMovimiento")}>
              Movimiento
            </th>
               <th onClick={() => handleSort("nombre_tienda")}>
              Autor
            </th>
            
            <th onClick={() => handleSort("valor")}>Cantidad</th>
          </>
        
        );
      case "aperturas":
        return (
          <>
            <th onClick={() => handleSort("usuario.nombre_tienda")}>Nombre</th>
            <th onClick={() => handleSort("createdAt")}>Fecha Creación</th>
            <th onClick={() => handleSort("updatedAt")}>
              Fecha De Eliminación
            </th>
            <th onClick={() => handleSort("usuario.celular")}>Celular</th>
            <th onClick={() => handleSort("ubicacion")}>Ubicación</th>
            <th onClick={() => handleSort("promedioSemanal")}>
              Promedio Semanal
            </th>
          </>
        );
      case "saldos":
        return (
          <>
            <th onClick={() => handleSort("tienda.usuario.nombre_tienda")}>
              Tienda
            </th>
            <th onClick={() => handleSort("fecha")}>Fecha</th>
            <th onClick={() => handleSort("hora")}>Hora</th>
            <th onClick={() => handleSort("valor")}>Cantidad</th>
          </>
        );
      case "depositos":
        return (
          <>
            <th onClick={() => handleSort("fecha")}>Fecha</th>
            <th onClick={() => handleSort("hora")}>Hora</th>
            <th onClick={() => handleSort("valor")}>Cantidad</th>
            <th onClick={() => handleSort("tipo")}>Tipo</th>
          </>
        );
      case "ventas":
        return (
          <>
            <th onClick={() => handleSort("fecha")}>Fecha</th>
            <th onClick={() => handleSort("hora")}>Hora</th>
            <th onClick={() => handleSort("folio")}>Folio</th>
            <th onClick={() => handleSort("celular")}>Número</th>
            <th onClick={() => handleSort("valor")}>Cantidad</th>
            <th onClick={() => handleSort("operadora")}>Compañía</th>
            <th onClick={() => handleSort("clase")}>Clase</th>
            <th onClick={() => handleSort("vendedor")}>Tienda</th>

          </>
        );
      case "recargas":
        return (
          <>
            <th onClick={() => handleSort("fecha")}>Fecha</th>
            <th onClick={() => handleSort("hora")}>Hora</th>
            <th onClick={() => handleSort("valor")}>Cantidad</th>
            <th onClick={() => handleSort("tipoMovimiento")}>Tipo</th>
          </>
        );
      default:
        return <></>;
    }
  };

  const renderTableRows = () => {
    return filteredData.map((item, index) => (
      <tr
        key={index}
        style={{
          backgroundColor: item.usuario?.eliminado ? "#ffcccc" : "transparent",
        }}
      >
          {selectedOption.toLowerCase() === "general" && (
          <>
            <td>  {item.fecha ? new Date(item.fecha).toLocaleDateString() : ""}</td>
            <td>  {item.fecha ? new Date(item.fecha).toLocaleTimeString() : ""}</td>

            <td>{formatTextByChunks(item.tipoMovimiento )|| ""}</td>
            <td>{formatTextByChunks(item.nombre_tienda )|| ""}</td>
   

            <td>
                <div style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>
                  {item.valor}
                </div>
            </td>
           
          </>
        )}

        {selectedOption.toLowerCase() === "aperturas" && (
          <>
            <td>{formatTextByChunks(item.usuario?.nombre_tienda)}</td>

            <td>
              {item.createdAt
                ? new Date(item.createdAt).toLocaleString()
                : "N/A"}
            </td>
            <td>
              {item.usuario?.eliminado
                ? item.updatedAt
                  ? new Date(item.updatedAt).toLocaleString()
                  : "N/A"
                : ""}
            </td>
            <td>{item.usuario?.celular.slice(-10)}</td>
            <td>
              <a
                href={`https://www.google.com/maps?q=${item.latitud},${item.longitud}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {`${item.latitud}, ${item.longitud}`}
              </a>
            </td>
            <td>
              {item.promedioSemanal != null
                ? Number(item.promedioSemanal).toFixed(2)
                : "N/A"
              }
            </td>
          </>
        )}

        {selectedOption.toLowerCase() === "saldos" && (
          <>
            <td>{formatTextByChunks(item.tienda?.usuario?.nombre_tienda) || "N/A"}</td>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleDateString() : "N/A"}
            </td>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleTimeString() : "N/A"}
            </td>
            <td style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>
              {item.valor}
            </td>
          </>
        )}

        {selectedOption.toLowerCase() === "depositos" && (
          <>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleDateString() : "N/A"}
            </td>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleTimeString() : "N/A"}
            </td>
            <td>{item.valor}</td>
            <td style={{ color: item.tipo === "Deposito" ? "green" : "black" }}>
              {item.tipo === "Deposito"
                ? "Depósito"
                : `Recibido - ${formatTextByChunks(item.tienda?.usuario?.nombre_tienda) || "N/A"}`}
            </td>
          </>
        )}

        {selectedOption.toLowerCase() === "ventas" && (
          <>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleDateString() : "N/A"}
            </td>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleTimeString() : "N/A"}
            </td>
            <td>{item.folio || "N/A"}</td>
            <td>{item.celular || "N/A"}</td>
            <td>{item.valor}</td>
            <td>{item.operadora || "N/A"}</td>
            <td>
              {item.tipo
                ? item.tipo.charAt(0).toUpperCase() +
                item.tipo.slice(1).toLowerCase()
                : "N/A"}
            </td>
            <td>
              {item.Tienda?.usuario?.nombres_apellidos ||
                formatTextByChunks(item.Tienda?.usuario?.nombre_tienda) ||
                item.Tienda?.usuario?.correo ||
                "N/A"}
            </td>
          </>
        )}

        {selectedOption.toLowerCase() === "recargas" && (
          <>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleDateString() : "N/A"}
            </td>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleTimeString() : "N/A"}
            </td>
            <td>{item.valor}</td>
            <td>
              {item.tipoMovimiento}
              {item.tipoMovimiento === "Recarga" && item.celular && (
                <div style={{ fontSize: "smaller", color: "gray" }}>
                  {`Celular: ${item.celular}`}
                  {` Operadora: ${item.operadora}`}
                  <br />

                  {`Tipo: ${item.tipoRecarga
                    .charAt(0)
                    .toUpperCase()}${item.tipoRecarga.slice(1)}`}
                  {` Folio: ${item.folio}`}
                </div>
              )}
            </td>
          </>
        )}
      </tr>
    ));
  };

  const renderMobileRows = () => {
    return filteredData.map((item, index) => {
      if (selectedOption.toLowerCase() === "aperturas") {
        return (
          <div
            key={index}
            className={`mobile-card ${item.usuario?.eliminado ? "deleted-row" : ""}`}
          >
            <div className="mobile-row">
              <div>
                <strong>Nombre:</strong> {formatTextByChunks(item.usuario?.nombre_tienda)}
              </div>
              <div>
                <strong>Fecha Creación:</strong>{" "}
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString()
                  : "N/A"}
              </div>
            </div>
            <div className="mobile-row">
              <div>
                <strong>Ubicación:</strong>{" "}
                <a
                  href={`https://www.google.com/maps?q=${item.latitud},${item.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {`${item.latitud}, ${item.longitud}`}
                </a>
              </div>
              <div>
              <strong>Promedio Semanal:</strong> {item.promedioSemanal != null ? item.promedioSemanal.toFixed(2) : "N/A"}
              </div>
            </div>
            <div className="mobile-row">
              {item.usuario?.eliminado && (
                <div>
                  <strong>Fecha De Eliminación:</strong>{" "}
                  {item.updatedAt
                    ? new Date(item.updatedAt).toLocaleString()
                    : "N/A"}
                </div>
              )}
            </div>
          </div>
        );
      } else if (selectedOption.toLowerCase() === "saldos") {
        return (
          <div key={index} className="mobile-card">
            <div className="mobile-row">
              <div>
                <strong>Tienda:</strong>{" "}
                {formatTextByChunks(item.tienda?.usuario?.nombre_tienda )|| "N/A"}
              </div>
              <div>
                <strong>Fecha:</strong>{" "}
                {item.fecha ? new Date(item.fecha).toLocaleDateString() : "N/A"}
              </div>
            </div>
            <div className="mobile-row">
              <div>
                <strong>Hora:</strong>{" "}
                {item.fecha ? new Date(item.fecha).toLocaleTimeString() : "N/A"}
              </div>
              <div>

                <strong>Cantidad:</strong>
                <div style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>
                  {item.valor}
                </div>
              </div>

            </div>
          </div>
        );
          } else if (selectedOption.toLowerCase() === "general") {
        return (
          <div key={index} className="mobile-card">
            <div className="mobile-row">
               <div>
                <strong>Fecha:</strong>{" "}
                {item.fecha ? new Date(item.fecha).toLocaleDateString() : ""}
                <br/>
                {item.fecha ? new Date(item.fecha).toLocaleTimeString() : ""}

              </div>
              <div>
                <strong>Movimiento:</strong>{" "}
                {formatTextByChunks(item.tipoMovimiento )|| ""}
              </div>
       
            </div>
            <div className="mobile-row">
                <div>
                <strong>Autor:</strong>{" "}
                {formatTextByChunks(item.nombre_tienda )|| ""}
              </div>
              <div>

                <strong>Cantidad:</strong>
                <div style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>
                  {item.valor}
                </div>
              </div>

            </div>
          </div>
        );
      } else if (selectedOption.toLowerCase() === "depositos") {
        return (
          <div key={index} className="mobile-card">
            <div className="mobile-row">
              <div>
                <strong>Fecha:</strong>{" "}
                {item.fecha ? new Date(item.fecha).toLocaleDateString() : "N/A"}
              </div>
              <div>
                <strong>Hora:</strong>{" "}
                {item.fecha ? new Date(item.fecha).toLocaleTimeString() : "N/A"}
              </div>
            </div>
            <div className="mobile-row">
              <div>
                <strong>Cantidad:</strong> {item.valor}
              </div>
              <div>

                <strong>Tipo:</strong>{" "}
                <div style={{ color: item.tipo === "Deposito" ? "green" : "black" }}>

                  {item.tipo === "Deposito"
                    ? "Depósito"
                    : `Recibido - ${formatTextByChunks(item.tienda?.usuario?.nombre_tienda )|| "N/A"}`}
                </div>
              </div>

            </div>
          </div>
        );
      } else if (selectedOption.toLowerCase() === "ventas") {
        return (
          <div key={index} className="mobile-card">
            <div className="mobile-row">
              <div>
                <strong>Fecha:</strong>{" "}
                {item.fecha ? new Date(item.fecha).toLocaleDateString() : "N/A"}
                <br />
                {item.fecha ? new Date(item.fecha).toLocaleTimeString() : "N/A"}
              </div>
              <div>
                <strong>Folio:</strong> {item.folio || "N/A"}
              </div>
              <div>
                <strong>Número:</strong> {item.celular || "N/A"}
              </div>
            </div>
            <div className="mobile-row">
              <div>
                <strong>Cantidad:</strong> {item.valor}
              </div>
              <div>
                <strong>Compañía:</strong> {item.operadora || "N/A"}
              </div>
              <div>
                <strong>Clase:</strong>{" "}
                {item.tipo
                  ? item.tipo.charAt(0).toUpperCase() +
                  item.tipo.slice(1).toLowerCase()
                  : "N/A"}
              </div>
            </div>
            <div className="mobile-row">
              <div>
                <strong>Tienda:</strong>{" "}
                {item.Tienda?.usuario?.nombres_apellidos ||
                  formatTextByChunks(item.Tienda?.usuario?.nombre_tienda) ||
                  item.Tienda?.usuario?.correo ||
                  "N/A"}
              </div>
            </div>
          </div>
        );
      } else if (selectedOption.toLowerCase() === "recargas") {
        return (
          <div key={index} className="mobile-card">
            <div className="mobile-row">
              <div>
                <strong>Fecha:</strong>{" "}
                {item.fecha ? new Date(item.fecha).toLocaleDateString() : "N/A"}
              </div>
              <div>
                <strong>Hora:</strong>{" "}
                {item.fecha ? new Date(item.fecha).toLocaleTimeString() : "N/A"}
              </div>
            </div>
            <div className="mobile-row">
              <div>
                <strong>Valor:</strong> {item.valor}
              </div>
              <div>
                <strong>Movimiento:</strong> {item.tipoMovimiento}
              </div>
            </div>
            {item.tipoMovimiento === "Recarga" && item.celular && (
              <div className="mobile-row">
                <div>
                  <strong>Celular:</strong> {item.celular}
                </div>
                <div>
                  <strong>Operadora:</strong> {item.operadora}
                </div>
              </div>
            )}
            {item.tipoMovimiento === "Recarga" && item.celular && (
              <div className="mobile-row">
                <div>
                  <strong>Tipo:</strong>{" "}
                  {item.tipoRecarga.charAt(0).toUpperCase()}
                  {item.tipoRecarga.slice(1)}
                </div>
                <div>
                  <strong>Folio:</strong> {item.folio}
                </div>
              </div>
            )}
          </div>
        );
      }
      return null;
    });
  };

  const handleStartDateChange = (date) => {
    // Cierra el calendario y previene la interacción del teclado
    setTimeout(() => {
      // Quitar el foco de manera más agresiva
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // Cerrar el calendario simulando un toque fuera
      const touchEvent = new TouchEvent("touchstart", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      document.body.dispatchEvent(touchEvent);

      // También disparar evento de mouse para compatibilidad con escritorio
      const mouseEvent = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      document.body.dispatchEvent(mouseEvent);
    }, 1);

    if (date === null) {
      // Si se borra, establece la fecha predeterminada
      setStartDate(null);
    } else {
      setStartDate(date);
    }
  };

  const handleEndDateChange = (date) => {
    // Cierra el calendario y previene la interacción del teclado
    setTimeout(() => {
      // Quitar el foco de manera más agresiva
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // Cerrar el calendario simulando un toque fuera
      const touchEvent = new TouchEvent("touchstart", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      document.body.dispatchEvent(touchEvent);

      // También disparar evento de mouse para compatibilidad con escritorio
      const mouseEvent = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      document.body.dispatchEvent(mouseEvent);
    }, 1);
    if (date === null) {
      // Si se borra, establece la fecha predeterminada
      setEndDate(null);
    } else {
      date.setHours(23, 59, 59, 999);
      setEndDate(date);
    }
  };

const formatDateGTM6 = (dateString) => {
  if (!dateString) return "N/A";
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(dateString));
};


  const exportToExcel = async () => {
    // Capturar el estado actual al inicio de la función
    const selectedOptionSnapshot = selectedOption;
    const startDateSnapshot = startDate;
    const endDateSnapshot = endDate;

    // Verificar si se están usando las fechas por defecto
    const isDefaultFilter =
      startDateSnapshot.getTime() === defaultStartDate.getTime() &&
      endDateSnapshot.getTime() === defaultEndDate.getTime();

    // Obtener la clave interna y el título basado en el mapeo
    const optionMap = {
      General: { internalOption: "general", title: "General" },

      Aperturas: { internalOption: "aperturas", title: "Aperturas" },
      Saldos: { internalOption: "saldos", title: "Saldos" },
      Depositos: { internalOption: "depositos", title: "Recibido y Depósitos" },
      Ventas: { internalOption: "ventas", title: "Ventas" },
      Recargas: { internalOption: "recargas", title: "Recargas Personales" },
    };
    const selectedOptionData = optionMap[selectedOptionSnapshot];
    const internalOption = selectedOptionData?.internalOption || "";
    const title = selectedOptionData?.title || selectedOptionSnapshot;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Historial");

    // Determinar las columnas basadas en la clave interna
    const columns = (() => {
      switch (internalOption) {
        case "general":
          return [
            { header: "Fecha", key: "fecha", width: 20 },
            { header: "Hora", key: "hora", width: 20 },
            { header: "Movimiento", key: "movimiento", width: 25 },
            { header: "Autor", key: "autor", width: 30 },
            { header: "Cantidad", key: "cantidad", width: 20 },
          ];
        case "aperturas":
          return [
            { header: "Nombre", key: "nombre", width: 25 },
            { header: "Fecha Creación", key: "createdAt", width: 20 },
            { header: "Fecha De Eliminación", key: "updatedAt", width: 20 },
            { header: "Celular", key: "celular", width: 15 },
            { header: "Ubicación", key: "ubicacion", width: 30 },
            { header: "Promedio Semanal", key: "promedioSemanal", width: 20 },
          ];
        case "saldos":
          return [
            { header: "Tienda", key: "tienda", width: 25 },
            { header: "Fecha", key: "fecha", width: 15 },
            { header: "Hora", key: "hora", width: 15 },
            { header: "Cantidad", key: "valor", width: 15 },
          ];
        case "depositos":
          return [
            { header: "Fecha", key: "fecha", width: 15 },
            { header: "Hora", key: "hora", width: 15 },
            { header: "Cantidad", key: "valor", width: 15 },
            { header: "Tipo", key: "tipo", width: 30 },
          ];
        case "ventas":
          return [
            { header: "Fecha", key: "fecha", width: 15 },
            { header: "Hora", key: "hora", width: 15 },
            { header: "Folio", key: "folio", width: 15 },
            { header: "Número", key: "numero", width: 20 },
            { header: "Cantidad", key: "cantidad", width: 15 },
            { header: "Compañía", key: "compania", width: 20 },
            { header: "Clase", key: "clase", width: 15 },
            { header: "Vendedor", key: "vendedor", width: 25 },
          ];
        case "recargas":
          return [
            { header: "Fecha", key: "fecha", width: 15 },
            { header: "Hora", key: "hora", width: 15 },
            { header: "Cantidad", key: "valor", width: 15 },
            { header: "Tipo", key: "tipo", width: 15 },
            { header: "Celular", key: "celular", width: 15 },
            { header: "Operadora", key: "operadora", width: 15 },
            { header: "Tipo recarga", key: "tipor", width: 15 },
            { header: "Folio", key: "folio", width: 15 },
          ];
        default:
          return [];
      }
    })();

    // Número de columnas
    const columnCount = columns.length;

    // Agregar encabezado con título
    worksheet.mergeCells(1, 1, 1, columnCount);
    worksheet.getCell("A1").value = title;
    worksheet.getCell("A1").font = { size: 16, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    // Establecer fechas: si se usan las fechas por defecto, se dejan vacías
    let dateHeader = "";
    if (isDefaultFilter) {
      dateHeader = `Fecha de Inicio:  |  Fecha de Corte: `;
    } else {
      dateHeader = `Fecha de Inicio: ${startDateSnapshot.toLocaleDateString()}  |  Fecha de Corte: ${endDateSnapshot.toLocaleDateString()}`;
    }
    worksheet.mergeCells(2, 1, 2, columnCount);
    worksheet.getCell("A2").value = dateHeader;
    worksheet.getCell("A2").font = { size: 12 };
    worksheet.getCell("A2").alignment = { horizontal: "center" };

    // Eliminar 'header' de las columnas al configurar worksheet.columns
    const columnsWithoutHeader = columns.map(({ header, ...rest }) => rest);
    worksheet.columns = columnsWithoutHeader;

    // Estilo de fondo celeste y letras blancas para los encabezados de columna (fila 3)
    worksheet.getRow(3).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(3).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "00aae4" },
    };

    // Agregar los encabezados de columna manualmente con filtro automático
    columns.forEach((column, index) => {
      const cell = worksheet.getCell(3, index + 1);
      cell.value = column.header;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: "center" };
    });

    worksheet.autoFilter = {
      from: "A3",
      to: `${String.fromCharCode(64 + columnCount)}3`,
    };

    // Iniciar desde la fila 4 para dejar espacio al encabezado
    const startingRow = 4;

    // Agregar datos según la opción seleccionada
    filteredData.forEach((item, dataIndex) => {
      let rowData = {};

      switch (internalOption) {
        case "general":
          rowData = {
            fecha: formatDateGTM6(item.fecha).split(",")[0],
            hora: formatDateGTM6(item.fecha).split(",")[1]?.trim() || "",            createdAt: formatDateGTM6(item.createdAt),

            movimiento: item.tipoMovimiento || "",
            autor: item.nombre_tienda || "",
            cantidad: typeof item.valor === "number"
              ? parseFloat(item.valor.toFixed(2))
              : 0,


          };
          break;
        case "aperturas":
          rowData = {
            nombre: item.usuario?.nombre_tienda || "N/A",
            createdAt: formatDateGTM6(item.createdAt),
            updatedAt: item.usuario?.eliminado
              ? formatDateGTM6(item.updatedAt) 
              : "",
            celular: item.usuario?.celular.slice(-10) || "N/A",
            ubicacion:
              item.latitud && item.longitud
                ? `${item.latitud}, ${item.longitud}`
                : "N/A",
            promedioSemanal: typeof item.promedioSemanal === "number"
              ? parseFloat(item.promedioSemanal.toFixed(2))
              : 0,
          };
          break;
        case "saldos":
          rowData = {
            tienda: item.tienda?.usuario?.nombre_tienda || "N/A",
            fecha: formatDateGTM6(item.fecha).split(",")[0],
            hora: formatDateGTM6(item.fecha).split(",")[1]?.trim() || "",
            valor: typeof item.valor === "number"
              ? parseFloat(item.valor.toFixed(2))
              : 0,
          };
          break;
        case "depositos":
          rowData = {
            fecha: formatDateGTM6(item.fecha).split(",")[0],
            hora: formatDateGTM6(item.fecha).split(",")[1]?.trim() || "",
            valor: typeof item.valor === "number"
              ? parseFloat(item.valor.toFixed(2))
              : 0,
            tipo:
              item.tipo === "Deposito"
                ? "Depósito"
                : `Recibido - ${item.tienda?.usuario?.nombre_tienda || "N/A"}`,
          };
          break;
        case "ventas":
          rowData = {
            fecha: formatDateGTM6(item.fecha).split(",")[0],
            hora: formatDateGTM6(item.fecha).split(",")[1]?.trim() || "",      folio: item.folio || "",
            numero: item.celular || "",
            cantidad: typeof item.valor === "number"
              ? parseFloat(item.valor.toFixed(2))
              : 0,
            compania: item.operadora || "",
            clase: item.tipo
              ? item.tipo.charAt(0).toUpperCase() +
              item.tipo.slice(1).toLowerCase()
              : "N/A",
            vendedor:
              item.Tienda?.usuario?.nombres_apellidos ||
              item.Tienda?.usuario?.nombre_tienda ||
              item.Tienda?.usuario?.correo ||
              "N/A",
          };
          break;
        case "recargas":
          rowData = {
            fecha: formatDateGTM6(item.fecha).split(",")[0],
            hora: formatDateGTM6(item.fecha).split(",")[1]?.trim() || "",
            valor: typeof item.valor === "number"
              ? parseFloat(item.valor.toFixed(2))
              : 0,
            tipo: item.tipoMovimiento,
            celular: item?.celular || "",
            operadora: item?.operadora || "",
            tipor: item?.tipoRecarga
              ? item.tipoRecarga.charAt(0).toUpperCase() +
              item.tipoRecarga.slice(1)
              : "",
            folio: item?.folio || "",
          };
          break;
        default:
          break;
      }

      // Agregar la fila de datos
      const rowIndex = startingRow + dataIndex;
      worksheet.addRow(rowData);

      // Aplicar formato a las celdas si es necesario
      const row = worksheet.getRow(rowIndex);
      row.eachCell((cell) => {
        cell.font = { color: { argb: "FF000000" } };
      });
    });

    // Ajustar el ancho de las columnas si es necesario
    worksheet.columns.forEach((column) => {
      column.width = column.width < 20 ? 20 : column.width;
    });

    // Guardar el workbook
    const filename = `${title}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    FileSaver.saveAs(new Blob([buffer]), filename);
  };
  const handleKeyDown = (e) => {
    const validKeys = ["Backspace", "Tab", "ArrowLeft", "ArrowRight", "/"];
    const isNumber = /^[0-9]$/.test(e.key);

    // Si la tecla presionada no es un número, una tecla de navegación válida o "/"
    if (!isNumber && !validKeys.includes(e.key)) {
      e.preventDefault(); // Prevenir la entrada de cualquier otro carácter
    }
  };


  return (
    <Container>
      <br />
      <Row>
        <Col md={12} className="d-flex justify-content-between mb-3">
          <h1 className="text-left" style={{ color: "#0A74DA" }}>
            Historial
          </h1>
          <Button variant="success" onClick={exportToExcel}>
            Descargar
          </Button>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={3}>
          <div>
            <strong>Comisión:</strong> ${comision}
          </div>
        </Col>
        <Col md={3}>
          <div>
            <strong>Aperturas semanales:</strong> {aperturasSemanales}
          </div>
        </Col>
        <Col md={3}>
          <div>
            <strong>Pendiente de recargas:</strong> ${pendienteRecargas}
          </div>
        </Col>
        <Col md={3}>
          <div>
            <strong>Pendiente de depositar:</strong> ${pendienteDepositar}
          </div>
        </Col>
      </Row>
      <Row className="mb-1 align-items-center">
        <Col xs={12} md={3} className="mb-3">
          <DropdownButton
            title={selectedOption}
            onSelect={(e) => {
              console.log("Opción seleccionada:", e);
              setSelectedOption(e);
            }}
            variant="outline-secondary"
            className="w-100"
          >
           <Dropdown.Item eventKey="General">General</Dropdown.Item>

            <Dropdown.Item eventKey="Aperturas">Aperturas</Dropdown.Item>
            <Dropdown.Item eventKey="Saldos">Saldos</Dropdown.Item>
            <Dropdown.Item eventKey="Depositos">
              Recibido y depósitos
            </Dropdown.Item>
            <Dropdown.Item eventKey="Ventas">Ventas</Dropdown.Item>
            <Dropdown.Item eventKey="Recargas">
              Recargas personales
            </Dropdown.Item>
          </DropdownButton>
        </Col>

        {selectedOption.toLowerCase() === "saldos" && (
          <Col xs={12} md={3} className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Buscar Tienda"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Col>
        )}


        <Col xs={6} md={3} className="mb-2 ml-md-auto">
          <DatePicker
            selected={startDate}
            onChange={handleStartDateChange}
            placeholderText="Fecha de inicio"
            dateFormat="dd/MM/yyyy"
            maxDate={endDate || new Date()}
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
        </Col>
        <Col xs={6} md={3} className="mb-2">
          <DatePicker
            selected={endDate}
            onChange={handleEndDateChange}
            placeholderText="Fecha de fin"
            dateFormat="dd/MM/yyyy"
            minDate={startDate}
            maxDate={new Date()}
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
      </Row>

      <Row className="my-1 d-block d-md-none">
        <Col className="d-flex justify-content-center">
          Ordenar por:
        </Col>
        <Col className="d-flex justify-content-center">
          <ButtonGroup className="mb-2">

            {sortOptions.map((option, index) => (
              <Button
                key={index}
                variant="outline-secondary"
                onClick={() => handleSort(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </ButtonGroup>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          {/* Versión de escritorio */}
          <div className="d-none d-md-block">
            <Table hover className="custom-table">
              <thead>
                <tr>{renderTableColumns()}</tr>
              </thead>
              <tbody>{renderTableRows()}</tbody>
            </Table>
          </div>

          {/* Versión móvil */}
          <div className="d-md-none mobile-cards">
            {renderMobileRows()}
          </div>
        </Col>
      </Row>

      {/* Botón "Mostrar más" solo en el filtro por defecto y si hay más datos */}
      {isDefaultFilter && data.length > displayedRecordsCount && (
        <Row className="my-3">
          <Col className="text-center">
            <Button variant="primary" onClick={() => setDisplayedRecordsCount(prev => prev + 0)}>
              Mostrar más
            </Button>
          </Col>
        </Row>
      )}




      <style>{`
             .react-datepicker__day--outside-month {
          opacity: 0.5;
        }
        .custom-table {
          border-collapse: collapse;
          width: 100%;
          min-height: 150px;

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
        .custom-table td,
        .custom-table th {
          border: none;
          padding: 12px 15px;
        }
        .mobile-cards {
          display: flex;
          flex-direction: column;
          gap: 0;
          min-height: 200px;

        }
        .mobile-card {
          padding: 10px 0;
          border-bottom: 1px solid #ddd;
          background-color: #fff;
          transition: background-color 0.3s ease;
        }
        .deleted-row {
          background-color: #ffcccc;
        }
        .mobile-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          padding: 5px 0;
        }
        .mobile-row > div {
          flex: 1 1 30%;
          margin-bottom: 5px;
        }
        .mobile-row strong {
          display: block;
        }
        @media (min-width: 768px) {
          .mobile-cards {
            display: none;
          }
        }
      `}</style>
    </Container>
  );
};

export default Historial;
