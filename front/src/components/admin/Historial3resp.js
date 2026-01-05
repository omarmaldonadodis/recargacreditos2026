import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  DropdownButton,
  Dropdown,
  Button,
  Table,
  Pagination,ButtonGroup,
} from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import ExcelJS from "exceljs";
import FileSaver from "file-saver";
import { isWithinInterval, parseISO } from "date-fns";
import "./Historial.css";
import api from "../../services/axiosConfig";

const Historial = () => {
  const [selectedOption, setSelectedOption] = useState("Aperturas");

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [startDate, setStartDate] = useState(null); // Fecha inicial sin selección
  const [endDate, setEndDate] = useState(null); // Fecha final sin selección
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  useEffect(() => {
    fetchData(selectedOption);
  }, [selectedOption]);

  useEffect(() => {
    applyDateFilter();
  }, [data, startDate, endDate, sortConfig]);

  const fetchData = async (option) => {
    const token = localStorage.getItem("token");
    try {
      const response = await api.get(
        `/admin/historial3/${option.toLowerCase()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setData(response.data);
    } catch (error) {
      console.error("Error al obtener los datos:", error);
    }
  };

  // Definición de columnas dinámicas para la versión móvil
const mobileSortOptions = {
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
    const adjustedEndDate = endDate ? new Date(endDate.setHours(23, 59, 59, 999)) : null;

    const filtered = data.filter((item) => {
      let dateToCheck = null;

      if (selectedOption.toLowerCase() === "saldos") {
        dateToCheck = item.fecha ? parseISO(item.fecha) : null;
      } else if (selectedOption.toLowerCase() === "depositos") {
        dateToCheck = item.fecha ? parseISO(item.fecha) : null;
      } else if (selectedOption.toLowerCase() === "ventas") {
        dateToCheck = item.fecha ? parseISO(item.fecha) : null;
      } else if (selectedOption.toLowerCase() === "recargas") {
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
      } else if (selectedOption.toLowerCase() === "depositos") {
        aDate = a.fecha ? new Date(a.fecha) : null;
        bDate = b.fecha ? new Date(b.fecha) : null;
      } else if (selectedOption.toLowerCase() === "ventas") {
        aDate = a.fecha ? new Date(a.fecha) : null;
        bDate = b.fecha ? new Date(b.fecha) : null;
      } else if (selectedOption.toLowerCase() === "recargas") {
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
        let aValue = getNestedValue(a, sortConfig.key);
        let bValue = getNestedValue(b, sortConfig.key);

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
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
            <th onClick={() => handleSort("vendedor")}>Vendedor</th>
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
    return currentData.map((item, index) => (
      <tr
        key={index}
        style={{
          backgroundColor: item.usuario?.eliminado ? "#ffcccc" : "transparent",
        }}
      >
        {selectedOption.toLowerCase() === "aperturas" && (
          <>
            <td>{item.usuario?.nombres_apellidos || item.usuario?.nombre_tienda}</td>
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
            <td>{item.promedioSemanal}</td>
            <td>
              {item.creador?.nombres_apellidos || item.creador?.correo || "N/A"}
            </td>
          </>
        )}

        {selectedOption.toLowerCase() === "saldos" && (
          <>
            <td>{item.tienda?.usuario?.nombres_apellidos || item.tienda?.usuario?.nombre_tienda || "N/A"}</td>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleDateString() : "N/A"}
            </td>
            <td>
              {item.fecha ? new Date(item.fecha).toLocaleTimeString() : "N/A"}
            </td>
            <td style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>
              {item.valor}
            </td>
            <td>
              {item.tienda?.creador?.nombres_apellidos ||
                item.tienda?.creador?.correo ||
                "N/A"}
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
                ? ` Depósito de ${
                    item.vendedor?.nombres_apellidos ||
                    item.vendedor?.correo ||
                    "N/A"
                  }`
                : ` ${
                    item.tienda?.creador?.nombres_apellidos ||
                    item.tienda?.creador?.correo ||
                    "N/A"
                  } recibió de ${item.tienda?.usuario?.nombres_apellidos || item.tienda?.usuario?.nombre_tienda || "N/A"}`}
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
                item.Tienda?.usuario?.nombre_tienda ||
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
              <div style={{ fontSize: "smaller", color: "gray" }}>
                {`De: ${item.nombres_apellidos || item.correo || "N/A"}`}
              </div>
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
          <div
            key={index}
            className={`mobile-card ${item.usuario?.eliminado ? "deleted-row" : ""}`}
          >
            <div className="mobile-row">
              <div>
                <strong>Nombre:</strong> {item.usuario?.nombres_apellidos ||item.usuario?.nombre_tienda}
              </div>
              <div>
                <strong>Fecha Creación:</strong>{" "}
                {item.createdAt ? new Date(item.createdAt).toLocaleString() : "N/A"}
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
                <strong>Promedio Semanal:</strong> {item.promedioSemanal}
              </div>
            </div>
            <div className="mobile-row">
              {item.usuario?.eliminado && (
                <div>
                  <strong>Fecha De Eliminación:</strong>{" "}
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "N/A"}
                </div>
              )}
            </div>
            <div  className="mobile-row">
            <div>
            <strong>Vendedor:</strong>{" "}


              {item.creador?.nombres_apellidos || item.creador?.correo || "N/A"}
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
                {item.fecha ? new Date(item.fecha).toLocaleDateString() : "N/A"} <br />
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
                {item.tipo ? item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1).toLowerCase() : "N/A"}
              </div>
            </div>
            <div className="mobile-row">
              <div>
                <strong>Vendedor:</strong>{" "}
                {item.Tienda?.usuario?.nombres_apellidos ||
                  item.Tienda?.usuario?.nombre_tienda ||
                  item.Tienda?.usuario?.correo ||
                  "N/A"}
              </div>
            </div>
          </div>
        );
      } else if (selectedOption.toLowerCase() === "saldos") {
        return (
          <div key={index} className="mobile-card">
            <div className="mobile-row">
              <div>
                <strong>Tienda:</strong> {item.tienda?.usuario?.nombres_apellidos ||item.tienda?.usuario?.nombre_tienda || "N/A"}
              </div>
              <div>
                <strong>Fecha:</strong> {item.fecha ? new Date(item.fecha).toLocaleDateString() : "N/A"}
                <br/>

                {item.fecha ? new Date(item.fecha).toLocaleTimeString() : "N/A"}
              </div>

            </div>
            <div className="mobile-row">
              <div>
                <strong>Cantidad:</strong>               <div style={{ color: item.valor < 0 ? "lightcoral" : "black" }}>
                {item.valor}

                </div>
                </div>
              <div>
                <strong>Vendedor:</strong> {item.tienda?.creador?.nombres_apellidos || item.tienda?.creador?.correo || "N/A"}
              </div>

            </div>
          </div>
        );
      } else if (selectedOption.toLowerCase() === "depositos") {
        return (
          <div key={index} className="mobile-card">
            <div className="mobile-row">
              <div>
                <strong>Fecha:</strong> {item.fecha ? new Date(item.fecha).toLocaleDateString() : "N/A"}
              </div>
              <div>
                <strong>Hora:</strong> {item.fecha ? new Date(item.fecha).toLocaleTimeString() : "N/A"}
              </div>
              <div>
                <strong>Cantidad:</strong> {item.valor}
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
                    "N/A"
                  } 
              </div>             
               <div>
                <strong>De:</strong> {item.tienda?.usuario?.nombres_apellidos || item.tienda?.usuario?.nombre_tienda || "N/A"}
              </div>

            </div>
          </div>
        );
      } else if (selectedOption.toLowerCase() === "recargas") {
        return (
          <div key={index} className="mobile-card">
            <div className="mobile-row">
              <div>
                <strong>Fecha:</strong> {item.fecha ? new Date(item.fecha).toLocaleDateString() : "N/A"}
              </div>
              <div>
                <strong>Hora:</strong> {item.fecha ? new Date(item.fecha).toLocaleTimeString() : "N/A"}
              </div>
              <div>
                <strong>Cantidad:</strong> {item.valor}
              </div>
            </div>
            <div className="mobile-row">
              <div>
                <strong>Tipo:</strong> {item.tipoMovimiento}
              </div>
              {item.tipoMovimiento === "Recarga" && item.celular && (
                <div style={{ fontSize: "smaller", color: "gray" }}>
                  <strong>Celular:</strong> {item.celular}
                </div>
              )}
                            <div >
                <strong>De:</strong> {item.nombres_apellidos || item.correo || "N/A"}
              </div>
              <div>
              </div>
            </div>

          </div>
        );
      }
      return null;
    });
  };
  
  const exportToExcel = async () => {
    const optionMap = {
      Aperturas: { internalOption: "aperturas", title: "Aperturas" },
      Saldos: { internalOption: "saldos", title: "Saldos" },
      Depositos: {
        internalOption: "depositos",
        title: "Recibido y Depósitos",
      },
      Ventas: { internalOption: "ventas", title: "Ventas" },
      Recargas: {
        internalOption: "recargas",
        title: "Historial de Recargas",
      },
    };
    const selectedOptionData = optionMap[selectedOption];
    const internalOption = selectedOptionData?.internalOption || "";
    const title = selectedOptionData?.title || selectedOption;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Historial");

    // Definir las columnas basadas en las columnas de la tabla
    const columns = (() => {
      console.log(internalOption)

      switch (internalOption) {
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
        case "depositos":
          return [
            { header: "Fecha", key: "fecha", width: 15 },
            { header: "Hora", key: "hora", width: 15 },
            { header: "Cantidad", key: "valor", width: 15 },
            { header: "Tipo", key: "tipo", width: 50 },
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
            { header: "Tipo", key: "tipo", width: 50 },
          ];
        default:
          return [];
      }

    })();

    const columnCount = columns.length;

    // Agregar encabezado con título y fechas
    worksheet.mergeCells(1, 1, 1, columnCount);
    worksheet.getCell("A1").value = title;
    worksheet.getCell("A1").font = { size: 16, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    // Establecer fechas
    worksheet.mergeCells(2, 1, 2, columnCount);
    worksheet.getCell("A2").value = `Fecha de Inicio: ${
      startDate ? startDate.toLocaleDateString() : "N/A"
    }  |  Fecha de Corte: ${endDate ? endDate.toLocaleDateString() : "N/A"}`;
    worksheet.getCell("A2").font = { size: 12 };
    worksheet.getCell("A2").alignment = { horizontal: "center" };


    // Eliminar 'header' de las columnas al configurar worksheet.columns
    const columnsWithoutHeader = columns.map(({ header, ...rest }) => rest);
    worksheet.columns = columnsWithoutHeader;

    // Aplicar estilo a los encabezados de columna (fila 3)
    worksheet.getRow(3).font = { bold: true, color: { argb: "FF000000" } }; // Negro

    // Agregar los encabezados de columna manualmente
    columns.forEach((column, index) => {
      const cell = worksheet.getCell(3, index + 1);
      cell.value = column.header;
      cell.font = { bold: true, color: { argb: "FF000000" } }; // Negro y negrita
      cell.alignment = { horizontal: "center" };
    });

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
        case "aperturas":
          rowData = {
            nombre: item.usuario?.nombres_apellidos || item.usuario?.nombre_tienda || "N/A",
            createdAt: item.createdAt
              ? new Date(item.createdAt).toLocaleString()
              : "N/A",
            updatedAt: item.usuario?.eliminado
              ? item.updatedAt
                ? new Date(item.updatedAt).toLocaleString()
                : "N/A"
              : "",
            celular: item.usuario?.celular.slice(-10) || "N/A",
            ubicacion:
              item.latitud && item.longitud
                ? `${item.latitud}, ${item.longitud}`
                : "N/A",
            promedioSemanal: item.promedioSemanal || "N/A",
            vendedor:
              item.creador?.nombres_apellidos || item.creador?.correo || "N/A",
          };
          break;
        case "saldos":
          rowData = {
            tienda: item.tienda?.usuario?.nombres_apellidos ||item.tienda?.usuario?.nombre_tienda || "N/A",
            fecha: item.fecha
              ? new Date(item.fecha).toLocaleDateString()
              : "N/A",
            hora: item.fecha
              ? new Date(item.fecha).toLocaleTimeString()
              : "N/A",
            valor: item.valor,
            vendedor:
              item.tienda?.creador?.nombres_apellidos ||
              item.tienda?.creador?.correo ||
              "N/A",
          };
          break;
        case "depositos":
          rowData = {
            fecha: item.fecha
              ? new Date(item.fecha).toLocaleDateString()
              : "N/A",
            hora: item.fecha
              ? new Date(item.fecha).toLocaleTimeString()
              : "N/A",
            valor: item.valor,
            tipo:
              item.tipo === "Deposito"
                ? ` Depósito de ${
                    item.vendedor?.nombres_apellidos ||
                    item.vendedor?.correo ||
                    "N/A"
                  }`
                : ` ${
                    item.tienda?.creador?.nombres_apellidos ||
                    item.tienda?.creador?.correo ||
                    "N/A"
                  } recibió de ${ item.tienda?.usuario?.nombres_apellidos|| item.tienda?.usuario?.nombre_tienda || "N/A"}`,
          };
          break;
        case "ventas":
          rowData = {
            fecha: item.fecha
              ? new Date(item.fecha).toLocaleDateString()
              : "N/A",
            hora: item.fecha
              ? new Date(item.fecha).toLocaleTimeString()
              : "N/A",
            folio: item.folio || "N/A",
            numero: item.celular || "N/A",
            cantidad: item.valor,
            compania: item.operadora || "N/A",
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
            fecha: item.fecha
              ? new Date(item.fecha).toLocaleDateString()
              : "N/A",
            hora: item.fecha
              ? new Date(item.fecha).toLocaleTimeString()
              : "N/A",
            valor: item.valor,
            tipo: `${item.tipoMovimiento} - De: ${
              item.nombres_apellidos || item.correo || "N/A"
            }`,
          };
          break;
        default:
          break;
      }

      // Agregar la fila de datos
      worksheet.addRow(rowData);
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

      <Row className="mb-1 align-items-center">
        <Col xs={12} md={4} className="mb-1">
          <DropdownButton
            title={selectedOption}
            onSelect={(e) => setSelectedOption(e)}
            variant="outline-secondary"
            className="w-100"
          >
            <Dropdown.Item eventKey="Aperturas">Aperturas</Dropdown.Item>
            <Dropdown.Item eventKey="Saldos">Saldos</Dropdown.Item>
            <Dropdown.Item eventKey="Depositos">
              Recibido y depósitos
            </Dropdown.Item>
            <Dropdown.Item eventKey="Ventas">Ventas</Dropdown.Item>
            <Dropdown.Item eventKey="Recargas">
              Historial de recargas
            </Dropdown.Item>
          </DropdownButton>
        </Col>

        <Col xs={6} md="auto" className="mb-2 ml-md-auto">
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            placeholderText="Fecha de inicio"
            dateFormat="dd/MM/yyyy"
            maxDate={endDate || new Date()}
            isClearable
            className="form-control w-100"
            onKeyDown={handleKeyDown}
            popperPlacement="bottom-start"
            portalId="root-portal"
          />
        </Col>
        <Col xs={6} md="auto" className="mb-2">
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
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

      <style>{`
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
