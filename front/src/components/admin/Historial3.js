import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  DropdownButton,
  Dropdown,
  Button,
  Table,
  Pagination, ButtonGroup,
} from "react-bootstrap";
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import ExcelJS from "exceljs";
import FileSaver from "file-saver";
import { isWithinInterval, parseISO } from "date-fns";
import "./Historial.css";
import api from "../../services/axiosConfig";


import "react-datepicker/dist/react-datepicker.css";
import es from "date-fns/locale/es";
import { formatInTimeZone } from "date-fns-tz";
import { isMobile } from "react-device-detect";


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
  
  const formatTextByChunks = (text) => {
  if (!text) return "";
  
  const cleanText = String(text).trim();
  const chunkSize = isMobile ? 16 : 40;
  
  // 🔥 NUEVO: Detectar y separar "vendedor" al inicio
  const vendedorRegex = /^(vendedor)/i;
  const match = cleanText.match(vendedorRegex);
  
  let textToProcess = cleanText;
  let vendedorPart = null;
  
  if (match) {
    vendedorPart = match[1]; // Preserva mayúsculas originales
    textToProcess = cleanText.substring(vendedorPart.length).trim();
  }
  
  // Procesar el texto restante (o todo el texto si no hay "vendedor")
  const words = textToProcess.split(' ');
  let lines = [];
  let currentLine = '';
  
  for (const word of words) {
    // 🚨 palabra más larga que el límite → forzar corte
    if (word.length > chunkSize) {
      // guardar lo que ya había
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      
      for (let i = 0; i < word.length; i += chunkSize) {
        const part = word.slice(i, i + chunkSize);
        const isLast = i + chunkSize >= word.length;
        lines.push(part + (isLast ? '' : '-'));
      }
      continue;
    }
    
    // ¿Cabe la palabra en la línea actual?
    const testLine = currentLine
      ? currentLine + ' ' + word
      : word;
      
    if (testLine.length <= chunkSize) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  // 🔥 NUEVO: Si había "vendedor", agregarlo al inicio
  if (vendedorPart) {
    lines.unshift(vendedorPart); // Agregar "vendedor" como primera línea
  }
  
  return lines.join('\n');
};




const Historial = () => {
  const [selectedOption, setSelectedOption] = useState("General");

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [startDate, setStartDate] = useState(null); // Fecha inicial sin selección
  const [endDate, setEndDate] = useState(null); // Fecha final sin selección
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Actualiza la obtención de datos cuando cambia la opción o las fechas
  useEffect(() => {
    fetchData(selectedOption, startDate, endDate);
  }, [selectedOption, startDate, endDate]);

  useEffect(() => {
    applyDateFilter();
  }, [data, startDate, endDate, sortConfig]);

  const fetchData = async (option, startDate, endDate) => {
    const token = localStorage.getItem("token");
    let queryParams = "";

    if (startDate) {
      const formattedStart = `${startDate.getFullYear()}-${('0' + (startDate.getMonth() + 1)).slice(-2)}-${('0' + startDate.getDate()).slice(-2)}`;
      queryParams += `startDate=${formattedStart}`;
    }
    if (endDate) {
      const formattedEnd = `${endDate.getFullYear()}-${('0' + (endDate.getMonth() + 1)).slice(-2)}-${('0' + endDate.getDate()).slice(-2)}`;
      queryParams += (queryParams ? "&" : "") + `endDate=${formattedEnd}`;
    }
    const url = `/admin/historial4p2/${option.toLowerCase()}${queryParams ? "?" + queryParams : ""}`;
    try {
      const response = await api.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(response.data);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error al obtener los datos:", error);
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

  const handleStartDateChange = (date) => {
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const touchEvent = new TouchEvent("touchstart", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      document.body.dispatchEvent(touchEvent);

      const mouseEvent = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      document.body.dispatchEvent(mouseEvent);
    }, 1);

    if (date === null) {
      setStartDate(null);
      setEndDate(null);

    } else {
      // Crear una copia del objeto date para startDate
      setStartDate(new Date(date));
      if (endDate === null) {
        // Crear otra copia para modificar el endDate sin alterar el original
        const newEndDate = new Date(date);
        newEndDate.setHours(23, 59, 59, 999);
        setEndDate(newEndDate);
      }
    }
  };

  const handleEndDateChange = (date) => {
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const touchEvent = new TouchEvent("touchstart", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      document.body.dispatchEvent(touchEvent);

      const mouseEvent = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      document.body.dispatchEvent(mouseEvent);
    }, 1);

    if (date === null) {
      setStartDate(null);
      setEndDate(null);
    } else {
      // Crear una copia del objeto date para modificarlo
      const newEndDate = new Date(date);
      newEndDate.setHours(23, 59, 59, 999);
      setEndDate(newEndDate);
      if (startDate === null) {
        // Otra copia para startDate
        const newStartDate = new Date(date);
        newStartDate.setHours(0, 0, 0, 0);
        setStartDate(newStartDate);
      }
    }
  };


  // Definición de columnas dinámicas para la versión móvil
  const mobileSortOptions = {
    general: [
      { label: "Timestamp", value: "fecha" },

      { label: "Movimiento", value: "titulo" },
      { label: "Autor", value: "autor" },

      { label: "Usuario", value: "usuario" },
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

    ],
    recargas: [
      { label: "Fecha", value: "fecha" },
      { label: "Cantidad", value: "valor" },
      { label: "Compañia", value: "operadora" },
    ],
    abonos: [
      { label: "Fecha", value: "fecha" },
      { label: "Cantidad", value: "valor" },
      { label: "Vendedor", value: "tienda.creador.nombres_apellidos" },


    ],
    "depósitos": [
      { label: "Fecha", value: "fecha" },
      { label: "Cantidad", value: "valor" },
      { label: "Vendedor", value: "vendedor.nombres_apellidos" },


    ],
    "recepción de saldo": [
      { label: "Fecha", value: "fecha" },
      { label: "Cantidad", value: "valor" },
      { label: "Usuario", value: "tienda.usuario.nombres_apellidos" },

    ]


  };

  const sortOptions = mobileSortOptions[selectedOption.toLowerCase()] || [];


  const applyDateFilter = () => {
    const adjustedEndDate = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;

    const filtered = data.filter((item) => {
      let dateToCheck = null;

      if (selectedOption.toLowerCase() === "saldos") {
        dateToCheck = item.fecha ? parseISO(item.fecha) : null;
      } else if (selectedOption.toLowerCase() === "abonos") {
        dateToCheck = item.fecha ? parseISO(item.fecha) : null;
      } else if (selectedOption.toLowerCase() === "depósitos") {
        dateToCheck = item.fecha ? parseISO(item.fecha) : null;
      } else if (selectedOption.toLowerCase() === "recepción de saldo") {
        dateToCheck = item.fecha ? parseISO(item.fecha) : null;
      } else if (selectedOption.toLowerCase() === "recargas") {
        dateToCheck = item.fecha ? parseISO(item.fecha) : null;
      } else if (selectedOption.toLowerCase() === "general") {
        dateToCheck = item.fecha ? parseISO(item.fecha) : null;
      } else {
        dateToCheck = item.createdAt ? parseISO(item.createdAt) : null;
      }

      if (dateToCheck) {

        if (startDate && adjustedEndDate) {
          return (
            dateToCheck >= startDate && dateToCheck <= adjustedEndDate
          );

        } else {
          // Incluir todos los datos si no hay filtro de fecha
          return true;
        }
      }
      return false; // Excluir elementos sin fecha
    });

    // Ordenar en orden cronológico descendente por defecto
    let sorted = filtered.sort((a, b) => {
      let aDate = null;
      let bDate = null;

      if (selectedOption.toLowerCase() === "saldos") {
        aDate = a.fecha ? new Date(a.fecha) : null;
        bDate = b.fecha ? new Date(b.fecha) : null;
      } else if (selectedOption.toLowerCase() === "abonos") {
        aDate = a.fecha ? new Date(a.fecha) : null;
        bDate = b.fecha ? new Date(b.fecha) : null;
      } else if (selectedOption.toLowerCase() === "depósitos") {
        aDate = a.fecha ? new Date(a.fecha) : null;
        bDate = b.fecha ? new Date(b.fecha) : null;
      } else if (selectedOption.toLowerCase() === "recepción de saldo") {
        aDate = a.fecha ? new Date(a.fecha) : null;
        bDate = b.fecha ? new Date(b.fecha) : null;
      } else if (selectedOption.toLowerCase() === "recargas") {
        aDate = a.fecha ? new Date(a.fecha) : null;
        bDate = b.fecha ? new Date(b.fecha) : null;
      } else if (selectedOption.toLowerCase() === "general") {
        aDate = a.fecha ? new Date(a.fecha) : null;
        bDate = b.fecha ? new Date(b.fecha) : null;


      } else {
        aDate = a.createdAt ? new Date(a.createdAt) : null;
        bDate = b.createdAt ? new Date(b.createdAt) : null;
      }

      if (aDate && bDate) {
        return bDate - aDate;
      } else {
        return 0;
      }
    });

    // Aplicar ordenamiento si se ha seleccionado
if (sortConfig.key) {
  sorted = [...sorted].sort((a, b) => {
    const aValue = getNestedValue(a, sortConfig.key);
    const bValue = getNestedValue(b, sortConfig.key);

    const isEmpty = (val) => val === null || val === undefined || val === "";

    // Enviar vacíos al final
    if (isEmpty(aValue) && !isEmpty(bValue)) return 1;
    if (!isEmpty(aValue) && isEmpty(bValue)) return -1;
    if (isEmpty(aValue) && isEmpty(bValue)) return 0;

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortConfig.direction === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortConfig.direction === "asc"
      ? aValue - bValue
      : bValue - aValue;
  });
}


    setFilteredData(sorted);
    setCurrentPage(1); // Reiniciar a la primera página al aplicar filtros
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  

  const getNestedValue = (obj, path) => {
    return path.split(".").reduce((o, p) => (o ? o[p] : null), obj);
  };

  // Paginación
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Función para generar los elementos de paginación
  const getPaginationItems = () => {
    const pageNumbers = [];
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      pageNumbers.push(<Pagination.Ellipsis disabled key="start-ellipsis" />);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <Pagination.Item
          key={i}
          active={i === currentPage}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    if (endPage < totalPages) {
      pageNumbers.push(<Pagination.Ellipsis disabled key="end-ellipsis" />);
    }

    return pageNumbers;
  };

  const renderTableColumns = () => {
    switch (selectedOption.toLowerCase()) {
      case "general":
        return (
          <>
            <th onClick={() => handleSort("fecha")}>Fecha</th>
            <th onClick={() => handleSort("fecha")}>Hora</th>
            <th onClick={() => handleSort("titulo")}>Tipo de Movimiento</th>
            <th onClick={() => handleSort("autor")}> Autor </th>
            <th onClick={() => handleSort("usuario")}> Usuario </th>

            <th onClick={() => handleSort("valor")}> Cantidad
            </th>
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
            <th onClick={() => handleSort("creador")}>Vendedor</th>
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
            <th onClick={() => handleSort("vendedor")}>Vendedor</th>
          </>
        );
      case "abonos":
        return (
          <>
            <th onClick={() => handleSort("fecha")}>Fecha</th>
            <th onClick={() => handleSort("hora")}>Hora</th>
            <th onClick={() => handleSort("valor")}>Cantidad</th>
            <th onClick={() => handleSort("tipo")}>Tipo</th>
          </>
        );
      case "depósitos":
        return (
          <>
            <th onClick={() => handleSort("fecha")}>Fecha</th>
            <th onClick={() => handleSort("hora")}>Hora</th>
            <th onClick={() => handleSort("valor")}>Cantidad</th>
            <th onClick={() => handleSort("tipo")}>Tipo</th>
          </>
        );
      case "recepción de saldo":
        return (
          <>
            <th onClick={() => handleSort("fecha")}>Fecha</th>
            <th onClick={() => handleSort("hora")}>Hora</th>
            <th onClick={() => handleSort("valor")}>Cantidad</th>
            <th onClick={() => handleSort("tipo")}>Tipo</th>
          </>
        );
      case "recargas":
        return (
          <>
            <th onClick={() => handleSort("fecha")}>Fecha</th>
            <th onClick={() => handleSort("hora")}>Hora</th>
            <th onClick={() => handleSort("folio")}>Folio</th>
            <th onClick={() => handleSort("celular")}>Número</th>
            <th onClick={() => handleSort("valor")}>Cantidad</th>
            <th onClick={() => handleSort("operadora")}>Compañía</th>
            <th onClick={() => handleSort("clase")}>Clase</th>
             <th onClick={() => handleSort("exitoso")}>Estado</th>
            <th onClick={() => handleSort("mensajeError")}>Mensaje</th>
          
            <th onClick={() => handleSort("vendedor")}>Vendedor</th>
           </>
        );

      default:
        return <></>;
    }
  };

  const renderTableRows = () => {
    return currentData.map((item, index) => (
      <tr
        key={index}
        style={{
          backgroundColor: item.usuario?.eliminado ? "#ffcccc" : "transparent",
        }}
      >

{selectedOption.toLowerCase() === "general" && (
  <>
    <td>
      {item.fecha ? new Date(item.fecha).toLocaleDateString() : ""}
    </td>
    <td>
      {item.fecha ? new Date(item.fecha).toLocaleTimeString() : ""}
    </td>
            <td>{formatTextByChunks(
              (item.titulo === "Recarga" || item.titulo === "Venta") && 
              item.exitoso === false
                ? `${item.titulo} no exitosa`
                : item.titulo
            ) || ""}</td>
    <td>{formatTextByChunks(item.autor)}</td>
    <td>
      {typeof item.usuario === "object"
        ? (formatTextByChunks(item.usuario.nombres_apellidos) ||
           formatTextByChunks(item.usuario.nombre_tienda) ||
           "N/A")
        : formatTextByChunks(item.usuario)}
    </td>
    <td style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>{Number(item.valor).toFixed(2)}</td>
  </>
)}



{selectedOption.toLowerCase() === "aperturas" && (
  <>
    {/* Columna "Nombre": se usa usuario.nombres_apellidos si existe; sino, se usa usuario.nombre_tienda */}
    <td>{item.usuario?.nombres_apellidos || formatTextByChunks(item.usuario?.nombre_tienda) || "N/A"}</td>
    {/* Fecha de creación */}
    <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "N/A"}</td>
    {/* Fecha de eliminación solo si el usuario fue marcado como eliminado */}
    <td>
      {item.usuario?.eliminado && item.updatedAt
        ? new Date(item.updatedAt).toLocaleString()
        : ""}
    </td>
    {/* Celular: puedes mostrar los últimos 10 dígitos */}
    <td>{item.usuario?.celular ? item.usuario.celular.slice(-10) : "N/A"}</td>
    {/* Ubicación: formatea latitud y longitud */}
    <td>
      {item.latitud && item.longitud
        ? `${Number(item.latitud).toFixed(6)}, ${Number(item.longitud).toFixed(6)}`
        : "N/A"}
    </td>
    {/* Promedio semanal */}
    <td>
      {item.promedioSemanal != null
        ? Number(item.promedioSemanal).toFixed(2)
        : "0.00"}
    </td>
    {/* Vendedor: el dato viene en el objeto creador */}
    <td>
      {item.creador?.nombres_apellidos || item.creador?.correo || "N/A"}
    </td>
  </>
)}

        {selectedOption.toLowerCase() === "saldos" && (
          <>
            <td>{item.tienda?.usuario?.nombres_apellidos || formatTextByChunks(item.tienda?.usuario?.nombre_tienda) || ""}</td>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleDateString() : ""}
            </td>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleTimeString() : ""}
            </td>
            <td style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>
              {Number(item.valor).toFixed(2)}

            </td>
            <td>
              {item.tienda?.creador?.nombres_apellidos ||
                item.tienda?.creador?.correo ||
                ""}
            </td>
          </>
        )}

        {selectedOption.toLowerCase() === "abonos" && (
          <>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleDateString() : ""}
            </td>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleTimeString() : ""}
            </td>
            <td style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>{Number(item.valor).toFixed(2)}</td>
            <td style={{ color: item.tipo === "Deposito" ? "green" : "black" }}>
              {item.tipo === "Deposito"
                ? ` Depósito de ${item.vendedor?.nombres_apellidos ||
                item.vendedor?.correo ||
                ""
                }`
                : ` ${item.tienda?.creador?.nombres_apellidos ||
                item.tienda?.creador?.correo ||
                ""
                } recibió de ${item.tienda?.usuario?.nombres_apellidos || formatTextByChunks(item.tienda?.usuario?.nombre_tienda) || ""}`}
            </td>
          </>
        )}

        {selectedOption.toLowerCase() === "depósitos" && (
          <>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleDateString() : ""}
            </td>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleTimeString() : ""}
            </td>
            <td style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>{Number(item.valor).toFixed(2)}</td>
            <td style={{ color: item.tipo === "Deposito" ? "green" : "black" }}>
              {item.tipo === "Deposito"
                ? ` Depósito de ${item.vendedor?.nombres_apellidos ||
                item.vendedor?.correo ||
                ""
                }`
                : ` ${item.tienda?.creador?.nombres_apellidos ||
                item.tienda?.creador?.correo ||
                ""
                } recibió de ${item.tienda?.usuario?.nombres_apellidos || formatTextByChunks(item.tienda?.usuario?.nombre_tienda) || ""}`}
            </td>
          </>
        )}
        {selectedOption.toLowerCase() === "recepción de saldo" && (
          <>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleDateString() : ""}
            </td>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleTimeString() : ""}
            </td>
            <td style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>{Number(item.valor).toFixed(2)}</td>
            <td style={{ color: item.tipo === "Deposito" ? "green" : "black" }}>
              {item.tipo === "Deposito"
                ? ` Depósito de ${item.vendedor?.nombres_apellidos ||
                item.vendedor?.correo ||
                ""
                }`
                : ` ${item.tienda?.creador?.nombres_apellidos ||
                item.tienda?.creador?.correo ||
                ""
                } recibió de ${item.tienda?.usuario?.nombres_apellidos || formatTextByChunks(item.tienda?.usuario?.nombre_tienda) || ""}`}
            </td>
          </>
        )}

        {selectedOption.toLowerCase() === "recargas" && (
          <>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleDateString() : ""}

            </td>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleTimeString() : ""}
            </td>
            <td>{item.folio || ""}</td>
            <td>{item.celular || ""}</td>
            <td style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>{Number(item.valor).toFixed(2)}</td>
            <td>{item.operadora || ""}</td>
            <td>
              {item.tipo
                ? item.tipo.charAt(0).toUpperCase() +
                item.tipo.slice(1).toLowerCase()
                : ""}
            </td>
            <td>{item.exitoso ? 'Exitosa ' : 'Fallida '}</td>
            <td>{item.mensajeError || ""}</td>


            <td>
              {item.Tienda?.usuario?.nombres_apellidos ||
               formatTextByChunks(item.Tienda?.usuario?.nombre_tienda) ||
                item.Tienda?.usuario?.correo ||
                ""}
            </td>
          </>
        )}


      </tr>
    ));
  };
  const renderMobileRows = () => {
    return currentData.map((item, index) => {
      if (selectedOption.toLowerCase() === "aperturas") {
        return (
          <div key={index} className="mobile-card">
            <div className="mobile-row">
              <div>
                <strong>Nombre:</strong> {item.usuario?.nombres_apellidos || formatTextByChunks(item.usuario?.nombre_tienda )|| "N/A"}
              </div>
              <div>
                <strong>Fecha Creación:</strong>{" "}
                {item.createdAt ? new Date(item.createdAt).toLocaleString() : "N/A"}
              </div>
            </div>
            <div className="mobile-row">
              <div>
                <strong>Ubicación:</strong>{" "}
                <a href={`https://www.google.com/maps?q=${item.latitud},${item.longitud}`} target="_blank" rel="noopener noreferrer">
                  {item.latitud && item.longitud ? `${Number(item.latitud).toFixed(6)}, ${Number(item.longitud).toFixed(6)}` : "N/A"}
                </a>
              </div>
              <div>
                <strong>Promedio Semanal:</strong> {item.promedioSemanal != null ? Number(item.promedioSemanal).toFixed(2) : "0.00"}
              </div>
            </div>
            <div className="mobile-row">
              {item.usuario?.eliminado && (
                <div>
                  <strong>Fecha De Eliminación:</strong>{" "}
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "N/A"}
                </div>
              )}
              <div>
                <strong>Vendedor:</strong>{" "}
                {item.creador?.nombres_apellidos || item.creador?.correo || "N/A"}
              </div>
            </div>
          </div>
        );
      }
       else if (selectedOption.toLowerCase() === "recargas") {
        return (
          <div key={index} className="mobile-card">
            <div className="mobile-row">
              <div>
                <strong>Fecha:</strong>{" "}
                {item.fecha ? new Date(item.fecha).toLocaleDateString() : ""} <br />
                {item.fecha ? new Date(item.fecha).toLocaleTimeString() : ""}
              </div>
              <div>
                <strong>Folio:</strong> {item.folio || ""}
              </div>
              <div>
                <strong>Número:</strong> {item.celular || ""}
              </div>
            </div>
            <div className="mobile-row">
              <div>
                <strong>Cantidad:</strong> <div style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>{Number(item.valor).toFixed(2)}</div>  
              </div>
              <div>
                <strong>Compañía:</strong> {item.operadora || ""}
              </div>
              <div>
                <strong>Clase:</strong>{" "}
                {item.tipo ? item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1).toLowerCase() : ""}
              </div>
            </div>
            <div className="mobile-row">
              <div>
                <strong>Estado:</strong>{" "}
                {item.exitoso ? 'Exitosa ' : 'Fallida '}
              </div>
              <div>
                <strong>Mensaje:</strong>{" "}
                {item.mensajeError || ""}
              </div>
              <div>
                <strong>Vendedor:</strong>{" "}
                {item.Tienda?.usuario?.nombres_apellidos ||
                  formatTextByChunks(item.Tienda?.usuario?.nombre_tienda) ||
                  item.Tienda?.usuario?.correo ||
                  ""}
              </div>
            </div>
          </div>
        );
      } else if (selectedOption.toLowerCase() === "general") {
        return (
          <div key={index} className="mobile-card">
    <div className="mobile-row">
      <div>
        <strong>Fecha:</strong> {item.fecha ? new Date(item.fecha).toLocaleDateString() : ""}
        <br />
        {item.fecha ? new Date(item.fecha).toLocaleTimeString() : ""}
      </div>
      <div>
        <strong>Movimiento:</strong> 


                     {formatTextByChunks(
              (item.titulo=== "Recarga") && 
              item.exitoso === false
                ? `${item.titulo} no exitosa`
                : item.titulo
            ) || ""}
      </div>
    </div>
    <div className="mobile-row">
      <div>
        <strong>Autor:</strong> {formatTextByChunks(item.autor) || ""}
      </div>
      <div>
        <strong>Usuario:</strong>{" "}
        {typeof item.usuario === "object"
          ? (formatTextByChunks(item.usuario.nombres_apellidos) || formatTextByChunks(item.usuario.nombre_tienda) || "N/A")
          : formatTextByChunks(item.usuario)}
      </div>
    </div>
    <div className="mobile-row">
      <div>
        <strong>Cantidad:</strong><div style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>{Number(item.valor).toFixed(2)}</div>
      </div>
    </div>
  </div>)
      } else if (selectedOption.toLowerCase() === "saldos") {
        return (
          <div key={index} className="mobile-card">
            <div className="mobile-row">
              <div>
                <strong>Tienda:</strong> {item.tienda?.usuario?.nombres_apellidos || formatTextByChunks(item.tienda?.usuario?.nombre_tienda )|| ""}
              </div>
              <div>
                <strong>Fecha:</strong> {item.fecha ? new Date(item.fecha).toLocaleDateString() : ""}
                <br />

              </div>

            </div>
            <div className="mobile-row">
              <div>
                <strong>Cantidad:</strong>               <div style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>
                  {Number(item.valor).toFixed(2)}


                </div>
              </div>
              <div>
                <strong>Vendedor:</strong> {item.tienda?.creador?.nombres_apellidos || item.tienda?.creador?.correo || ""}
              </div>

            </div>
          </div>
        );

      } else if (selectedOption.toLowerCase() === "abonos") {
        return (
          <div key={index} className="mobile-card">
            <div className="mobile-row">
              <div>
                <strong>Fecha:</strong> {item.fecha ? new Date(item.fecha).toLocaleDateString() : ""}
              </div>
              <div>
                <strong>Hora:</strong> {item.fecha ? new Date(item.fecha).toLocaleTimeString() : ""}
              </div>
              <div>
                <strong>Cantidad:</strong> <div style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>{Number(item.valor).toFixed(2)}</div>

              </div>
            </div>
            <div className="mobile-row">
              <div>
                <strong>Tipo:</strong> {item.tipo === "Deposito" ? "Depósito" : "Recibido"}
              </div>
              <div>
                <strong>Vendedor:</strong>{
                  item.tienda?.creador?.nombres_apellidos ||
                  item.tienda?.creador?.correo ||
                  ""
                }
              </div>
              <div>
                <strong>De:</strong> {item.tienda?.usuario?.nombres_apellidos || formatTextByChunks(item.tienda?.usuario?.nombre_tienda) || ""}
              </div>

            </div>
          </div>
        );
      } else if (selectedOption.toLowerCase() === "depósitos") {
        return (
          <div key={index} className="mobile-card">
            <div className="mobile-row">
              <div>
                <strong>Fecha:</strong> {item.fecha ? new Date(item.fecha).toLocaleDateString() : ""}
              </div>
              <div>
                <strong>Hora:</strong> {item.fecha ? new Date(item.fecha).toLocaleTimeString() : ""}
              </div>
              <div>
                <strong>Cantidad:</strong>  <div style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>{Number(item.valor).toFixed(2)}</div>

              </div>
            </div>
            <div className="mobile-row">
              <div>
                <strong>Tipo:</strong> {item.tipo === "Deposito" ? "Depósito" : "Recibido"}
              </div>
              <div>
                <strong>Vendedor:</strong>{
                  item.vendedor?.nombres_apellidos ||
                  item.vendedor?.correo ||
                  ""
                }
              </div>
              <div>
              </div>

            </div>
          </div>
        );

      } else if (selectedOption.toLowerCase() === "recepción de saldo") {
        return (
          <div key={index} className="mobile-card">
            <div className="mobile-row">
              <div>
                <strong>Fecha:</strong> {item.fecha ? new Date(item.fecha).toLocaleDateString() : ""}
              </div>
              <div>
                <strong>Hora:</strong> {item.fecha ? new Date(item.fecha).toLocaleTimeString() : ""}
              </div>
              <div>
                <strong>Cantidad:</strong> <div style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>{Number(item.valor).toFixed(2)}</div>

              </div>
            </div>
            <div className="mobile-row">
              <div>
                <strong>Tipo:</strong> {item.tipo === "Deposito" ? "Depósito" : "Recibido"}
              </div>
              <div>
                <strong>Vendedor:</strong>{
                  item.tienda?.creador?.nombres_apellidos ||
                  item.tienda?.creador?.correo ||
                  ""
                }
              </div>
              <div>
                <strong>De:</strong> {item.tienda?.usuario?.nombres_apellidos || item.tienda?.usuario?.nombre_tienda || ""}
              </div>

            </div>
          </div>
        );
      }

      return null;
    });
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
    const startDateSnapshot = startDate || new Date('2024-10-01'); // 1/10/2024
    const endDateSnapshot = endDate || new Date(); // Fecha actual
    // Obtener la clave interna y el título basado en el mapeo
    const optionMap = {
      General: { internalOption: "general", title: "General" },
      Aperturas: { internalOption: "aperturas", title: "Aperturas" },
      Saldos: { internalOption: "saldos", title: "Saldos" },
      Abonos: { internalOption: "abonos", title: "Abonos" },
      "Depósitos": { internalOption: "depósitos", title: "Depósitos" },
      "Recepción de saldo": { internalOption: "recepción de saldo", title: "Recepción de saldo" },
      Recargas: { internalOption: "recargas", title: "Recargas" },
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
            { header: "Timestamp", key: "fecha", width: 25 },
            { header: "Movimiento", key: "titulo", width: 20 },

            { header: "Autor", key: "autor", width: 25 },
            { header: "Usuario", key: "usuario", width: 25 },
            { header: "Cantidad", key: "valor", width: 25 },
          ];
        case "aperturas":
          return [
            { header: "Nombre", key: "nombre", width: 25 },
            { header: "Fecha Creación", key: "createdAt", width: 20 },
            { header: "Fecha De Eliminación", key: "updatedAt", width: 20 },
            { header: "Celular", key: "celular", width: 15 },
            { header: "Ubicación", key: "ubicacion", width: 30 },
            { header: "Promedio Semanal", key: "promedioSemanal", width: 20 },
            { header: "Vendedor", key: "vendedor", width: 25 },
          ];
        case "saldos":
          return [
            { header: "Tienda", key: "tienda", width: 25 },
            { header: "Fecha", key: "fecha", width: 15 },
            { header: "Hora", key: "hora", width: 15 },
            { header: "Cantidad", key: "valor", width: 15 },
            { header: "Vendedor", key: "vendedor", width: 25 },
          ];
        case "abonos":
          return [
            { header: "Fecha", key: "fecha", width: 15 },
            { header: "Hora", key: "hora", width: 15 },
            { header: "Cantidad", key: "valor", width: 15 },
            { header: "Tipo", key: "tipo", width: 50 },
          ];
        case "depósitos":
          return [
            { header: "Fecha", key: "fecha", width: 15 },
            { header: "Hora", key: "hora", width: 15 },
            { header: "Cantidad", key: "valor", width: 15 },
            { header: "Tipo", key: "tipo", width: 50 },
          ];
        case "recepción de saldo":
          return [
            { header: "Fecha", key: "fecha", width: 15 },
            { header: "Hora", key: "hora", width: 15 },
            { header: "Cantidad", key: "valor", width: 15 },
            { header: "Tipo", key: "tipo", width: 50 },
          ];
        case "recargas":
          return [
            { header: "Fecha", key: "fecha", width: 15 },
            { header: "Hora", key: "hora", width: 15 },
            { header: "Folio", key: "folio", width: 15 },
            { header: "Número", key: "numero", width: 20 },
            { header: "Cantidad", key: "cantidad", width: 15 },
            { header: "Compañía", key: "compania", width: 20 },
            { header: "Clase", key: "clase", width: 15 },
            { header: "Estado", key: "exitoso", width: 15 },
            { header: "Mensaje", key: "mensajeError", width: 30 },
            { header: "Vendedor", key: "vendedor", width: 25 },
          ];
        default:
          return [];
      }
    })();

    // Número de columnas
    const columnCount = columns.length;

    // Agregar encabezado con título y fechas
    worksheet.mergeCells(1, 1, 1, columnCount);
    worksheet.getCell("A1").value = title;
    worksheet.getCell("A1").font = { size: 16, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    // Establecer fechas
    worksheet.mergeCells(2, 1, 2, columnCount);
    worksheet.getCell(
      "A2"
    ).value = `Fecha de Inicio: ${startDateSnapshot.toLocaleDateString()}  |  Fecha de Corte: ${endDateSnapshot.toLocaleDateString()}`;
    worksheet.getCell("A2").font = { size: 12 };
    worksheet.getCell("A2").alignment = { horizontal: "center" };

    // Eliminar 'header' de las columnas al configurar worksheet.columns
    const columnsWithoutHeader = columns.map(({ header, ...rest }) => rest);
    worksheet.columns = columnsWithoutHeader;

    // Estilo de fondo celeste y letras blancas para los encabezados de columna (fila 3)
    worksheet.getRow(3).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "00aae4" } };

    // Agregar los encabezados de columna manualmente con filtro automático
    columns.forEach((column, index) => {
      const cell = worksheet.getCell(3, index + 1);
      cell.value = column.header;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; // Blanco y negrita
      cell.alignment = { horizontal: "center" };
    });

    worksheet.autoFilter = { from: "A3", to: `${String.fromCharCode(64 + columnCount)}3` }; // Aplicar filtro automático

    // Iniciar desde la fila 4 para dejar espacio al encabezado
    const startingRow = 4;

    // Crear un formateador de moneda
    const currencyFormatter = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    });

    // Agregar datos
    filteredData.forEach((item, dataIndex) => {
      let rowData = {};
      switch (internalOption) {
        case "general":
          rowData = {
            fecha: formatDateGTM6(item.fecha),
            titulo: 

            ((item.titulo === "Recarga") && 
              item.exitoso === false
                ? `${item.titulo} no exitosa`
                : item.titulo
            ) || "",

            autor: item.autor || "",
            usuario: item.usuario || "",

            valor: typeof item.valor === "number"
              ? parseFloat(item.valor.toFixed(2))
              : 0,
            // Convertir y formatear solo si el valor existe
          };
          break;
        case "aperturas":
          rowData = {
            nombre: item.usuario?.nombres_apellidos || item.usuario?.nombre_tienda || "",
            createdAt: formatDateGTM6(item.createdAt),
            updatedAt: item.usuario?.eliminado
              ? formatDateGTM6(item.updatedAt) 
              : "",
            celular: item.usuario?.celular ? item.usuario.celular.slice(-10) : "",
            ubicacion:
              item.latitud != null && item.longitud != null
                ? `${Number(item.latitud).toFixed(5)}, ${Number(item.longitud).toFixed(5)}`
                : "",
            // Se formatea el promedio solo si no es nulo; en caso contrario se pone "0.00"
            promedioSemanal: typeof item.promedioSemanal === "number"
              ? parseFloat(item.promedioSemanal.toFixed(2))
              : 0,
            vendedor: item.creador?.nombres_apellidos || item.creador?.correo || "",
          };
          break;
        case "saldos":
          rowData = {
            tienda: item.tienda?.usuario?.nombres_apellidos || item.tienda?.usuario?.nombre_tienda || "",
            fecha: formatDateGTM6(item.fecha).split(",")[0],
            hora: formatDateGTM6(item.fecha).split(",")[1]?.trim() || "",
            valor: typeof item.valor === "number"
              ? parseFloat(item.valor.toFixed(2))
              : 0,
            vendedor: item.tienda?.creador?.nombres_apellidos || item.tienda?.creador?.correo || "",
          };
          break;
        case "abonos":
          rowData = {
            fecha: formatDateGTM6(item.fecha).split(",")[0],
            hora: formatDateGTM6(item.fecha).split(",")[1]?.trim() || "",
            valor: typeof item.valor === "number"
              ? parseFloat(item.valor.toFixed(2))
              : 0,
            tipo: item.tipo === "Deposito"
              ? ` Depósito de ${item.vendedor?.nombres_apellidos || item.vendedor?.correo || ""}`
              : ` ${item.tienda?.creador?.nombres_apellidos || item.tienda?.creador?.correo || ""} recibió de ${item.tienda?.usuario?.nombres_apellidos || item.tienda?.usuario?.nombre_tienda || ""}`,
          };
          break;
        case "depósitos":
          rowData = {
            fecha: formatDateGTM6(item.fecha).split(",")[0],
            hora: formatDateGTM6(item.fecha).split(",")[1]?.trim() || "",
            valor: typeof item.valor === "number"
              ? parseFloat(item.valor.toFixed(2))
              : 0,
            tipo: item.tipo === "Deposito"
              ? ` Depósito de ${item.vendedor?.nombres_apellidos || item.vendedor?.correo || ""}`
              : ` ${item.tienda?.creador?.nombres_apellidos || item.tienda?.creador?.correo || ""} recibió de ${item.tienda?.usuario?.nombres_apellidos || item.tienda?.usuario?.nombre_tienda || ""}`,
          };
          break;
        case "recepción de saldo":
          rowData = {
            fecha: formatDateGTM6(item.fecha).split(",")[0],
            hora: formatDateGTM6(item.fecha).split(",")[1]?.trim() || "",
            valor: typeof item.valor === "number"
              ? parseFloat(item.valor.toFixed(2))
              : 0,
            tipo: item.tipo === "Deposito"
              ? ` Depósito de ${item.vendedor?.nombres_apellidos || item.vendedor?.correo || ""}`
              : ` ${item.tienda?.creador?.nombres_apellidos || item.tienda?.creador?.correo || ""} recibió de ${item.tienda?.usuario?.nombres_apellidos || item.tienda?.usuario?.nombre_tienda || ""}`,
          };
          break;
        case "recargas":
          rowData = {
            fecha: formatDateGTM6(item.fecha).split(",")[0],
            hora: formatDateGTM6(item.fecha).split(",")[1]?.trim() || "",
            folio: item.folio || "",
            numero: item.celular || "",
            cantidad: typeof item.valor === "number"
              ? parseFloat(item.valor.toFixed(2))
              : 0,
            compania: item.operadora || "",
            clase: item.tipo ? item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1).toLowerCase() : "",
            exitoso: item.exitoso ? "Exitosa" : "Fallida",
            mensajeError: item.mensajeError || "",
            vendedor: item.Tienda?.usuario?.nombres_apellidos || item.Tienda?.usuario?.nombre_tienda || item.Tienda?.usuario?.correo || "",
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
        cell.font = { color: { argb: "FF000000" } }; // Negro
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

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
<Container fluid="xxl" className="px-3">
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

      <Row className="mb-1 align-items-center">
        <Col xs={12} md={4} className="mb-1">
          <DropdownButton
            title={selectedOption}
            onSelect={(e) => setSelectedOption(e)}
            variant="outline-secondary"
            className="w-100"
          >
            <Dropdown.Item eventKey="General">General</Dropdown.Item>

            <Dropdown.Item eventKey="Aperturas">Aperturas</Dropdown.Item>
            <Dropdown.Item eventKey="Recargas">Recargas</Dropdown.Item>

            <Dropdown.Item eventKey="Abonos">Abonos</Dropdown.Item>
            <Dropdown.Item eventKey="Saldos">Saldos</Dropdown.Item>

            <Dropdown.Item eventKey="Depósitos">Depósitos</Dropdown.Item>


            <Dropdown.Item eventKey="Recepción de saldo">
              Recepción de saldo
            </Dropdown.Item>

          </DropdownButton>
        </Col>

        <Col xs={6} md="auto" className="mb-2 ml-md-auto">
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
        </Col>
        <Col xs={6} md="auto" className="mb-2">
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
      </Row>
<Row className="my-2 d-block d-md-none text-center">
  <Col xs={12} className="fw-bold mb-2">Ordenar por:</Col>

  <Col xs={12}>
    <div className="d-flex flex-wrap justify-content-center gap-2">
      {sortOptions.map((option, index) => (
        <Button
          key={index}
          variant="outline-secondary"
          className="rounded-0"

          onClick={() => handleSort(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
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



      <Pagination className="justify-content-center">
        {[...Array(Math.ceil(totalPages)).keys()].map(
          (number) => (
            <Pagination.Item
              key={number + 1}
              className={number + 1 === currentPage ? "active" : ""} // Añade la clase "active"
              onClick={() => handlePageChange(number + 1)}
            >
              {number + 1}
            </Pagination.Item>
          )
        )}
      </Pagination>
      <br />
      <br />
      <br />

      <style>{`
                    /* Corrección: Atenuar días fuera del mes (se mantienen clicables para cambiar la vista) */
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
          cursor: pointer;
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
          text-align: left;
        }
        .mobile-cards {
          display: flex;
          flex-direction: column;
          gap: 0;
          min-height: 150px;

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
          .two-spaces {
  grid-column: span 2; /* Este div ocupa dos columnas */
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
