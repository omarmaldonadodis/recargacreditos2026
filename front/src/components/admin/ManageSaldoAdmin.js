import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Table, Row, Col, Dropdown, DropdownButton, Button, Pagination } from 'react-bootstrap';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import es from 'date-fns/locale/es';
import axios from 'axios';
import ExcelJS from 'exceljs';
import FileSaver from 'file-saver';
import { ButtonGroup} from 'react-bootstrap';
import api from '../../services/axiosConfig';

registerLocale('es', es);

const ManageSaldoAdmin = () => {
  const { correo } = useParams(); // Obteniendo el correo desde los parámetros de la URL
  const [saldosAcreditados, setSaldosAcreditados] = useState([]);
  const [saldoDisponible, setSaldoDisponible] = useState(0);
  const [cupo, setCupo] = useState(0);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalAcreditado, setTotalAcreditado] = useState(0);
  const [totalPorcentajes, setTotalPorcentajes] = useState(0);
  const [sortOrder, setSortOrder] = useState('desc'); // Ordenamiento por defecto descendente

  useEffect(() => {
    fetchSaldos();
  }, [correo]); // Se ejecuta nuevamente cuando el correo cambia

  const fetchSaldos = async () => {
    const token = localStorage.getItem('token');

    try {
      const response = await api.get(`/admin/saldo?correo=${correo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSaldoDisponible(response.data.saldo_disponible);
      setSaldosAcreditados(response.data.saldos_acreditados);
      setCupo(response.data.cupo);
      calculateTotals(response.data.saldos_acreditados);
    } catch (error) {
      console.error('Error al obtener los saldos', error);
    }
  };

  const calculateTotals = (saldos) => {
    let totalAcreditado = 0;
    let totalPorcentajes = 0;
    saldos.forEach(saldo => {
      const acreditado = saldo.valor + (saldo.valor * saldo.porcentaje / 100);
      totalAcreditado += acreditado;
      totalPorcentajes += (saldo.valor * saldo.porcentaje / 100);
    });
    setTotalAcreditado(totalAcreditado);
    setTotalPorcentajes(totalPorcentajes);
  };

  const handleSortByDate = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
  };

  const sortedSaldos = saldosAcreditados
    .filter(saldo => 
      (!startDate || new Date(saldo.fecha) >= startDate) &&
      (!endDate || new Date(saldo.fecha) <= endDate)
    )
    .sort((a, b) => sortOrder === 'asc'
      ? new Date(a.fecha) - new Date(b.fecha)
      : new Date(b.fecha) - new Date(a.fecha)
    );

  const totalPages = Math.ceil(sortedSaldos.length / pageSize);
  const paginatedSaldos = sortedSaldos.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Saldos Acreditados');

    worksheet.columns = [
      { header: 'Valor', key: 'valor', width: 15 },
      { header: 'Porcentaje', key: 'porcentaje', width: 15 },
      { header: 'Acreditado', key: 'acreditado', width: 15 },
      { header: 'Fecha', key: 'fecha', width: 20 }
    ];

    sortedSaldos.forEach((saldo) => {
      const acreditado = saldo.valor + (saldo.valor * saldo.porcentaje / 100);
      worksheet.addRow({
        valor: saldo.valor.toFixed(2),
        porcentaje: saldo.porcentaje.toFixed(2),
        acreditado: acreditado.toFixed(2),
        fecha: new Date(saldo.fecha).toLocaleString(),
      });
    });

    // Añadir fila del saldo disponible
    worksheet.addRow([]);
    worksheet.addRow({
      valor: `Saldo Disponible: ${saldoDisponible.toFixed(2)}`,
      porcentaje: '',
      acreditado: `Total Acreditado: ${totalAcreditado.toFixed(2)}`,
      fecha: '',
    });

    const buffer = await workbook.xlsx.writeBuffer();
    FileSaver.saveAs(new Blob([buffer]), 'SaldosAcreditados.xlsx');
  };

  return (
    <Container>
      <Row className="my-4">
        <Col md={8}>
          <h1 className="text-left" style={{ color: '#0A74DA' }}>Gestionar Saldo</h1>
        </Col>
        <Col md={4} className="d-flex justify-content-end align-items-center">
          <Button variant="success" onClick={exportToExcel}>Exportar a Excel</Button>
        </Col>
      </Row>

      <Row className="mb-3 justify-content-center">
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', width: '100%' }}>
          <DatePicker
            selected={startDate}
            onChange={date => setStartDate(date)}
            placeholderText="Fecha y hora de inicio"
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="Pp"
            maxDate={new Date()}
            isClearable
            locale="es"
            className="form-control"
            style={{ flex: 2 }}
          />
          <DatePicker
            selected={endDate}
            onChange={date => setEndDate(date)}
            placeholderText="Fecha y hora de fin"
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="Pp"
            maxDate={new Date()}
            isClearable
            locale="es"
            className="form-control"
            style={{ flex: 2 }}
          />
      <DropdownButton
  variant="outline-secondary"
  title={`Mostrar ${pageSize}`}
  id="input-group-dropdown-2"
  onSelect={(e) => {
    if (e === "all") {
      setPageSize(saldosAcreditados.length); // Muestra todos los elementos
    } else {
      setPageSize(parseInt(e));
    }
  }}
  style={{ flex: 1 }}
>
  <Dropdown.Item eventKey="10">10</Dropdown.Item>
  <Dropdown.Item eventKey="20">20</Dropdown.Item>
  <Dropdown.Item eventKey="50">50</Dropdown.Item>
  <Dropdown.Item eventKey="100">100</Dropdown.Item>
  <Dropdown.Divider />
  <Dropdown.Item eventKey="all">Todo</Dropdown.Item> {/* Opción para mostrar todo */}
</DropdownButton>
        </div>
      </Row>

      <Table hover className="custom-table">
        <thead>
          <tr>
            <th>Valor</th>
            <th>Porcentaje</th>
            <th>Acreditado</th>
            <th onClick={handleSortByDate} style={{ cursor: 'pointer' }}>
              Fecha {sortOrder === 'asc' ? '↑' : '↓'}
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedSaldos.map((saldo, index) => {
            const acreditado = saldo.valor + (saldo.valor * saldo.porcentaje / 100);
            return (
              <tr key={index}>
                <td>{saldo.valor.toFixed(2)}</td>
                <td>{saldo.porcentaje.toFixed(2)}</td>
                <td>{acreditado.toFixed(2)}</td>
                <td>{new Date(saldo.fecha).toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
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

      <div className="mt-4 text-right">
        <strong>Saldo Disponible:</strong> ${saldoDisponible.toFixed(2)}
      </div>

      <div className="mt-4 text-right">
        <strong>Cupo:</strong> ${cupo.toFixed(2)}
      </div>

      <div className="mt-4 text-right">
        <strong>Total Porcentajes:</strong> ${totalPorcentajes.toFixed(2)}
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
        @media (max-width: 768px) {
          .d-flex {
            flex-direction: column;
          }
        }
        th {
          cursor: pointer;
        }
      `}</style>
    </Container>
  );
};

export default ManageSaldoAdmin;
