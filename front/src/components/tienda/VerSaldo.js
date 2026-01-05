import React, { useState, useEffect } from 'react';
import { Container, Table } from 'react-bootstrap';
import axios from 'axios';

const VerSaldo = () => {
  const [saldo, setSaldo] = useState(0);
  const [saldosAcreditados, setSaldosAcreditados] = useState([]);

  useEffect(() => {
    const fetchSaldo = async () => {
      try {
        const response = await axios.get('/api/tienda/saldo');
        setSaldo(response.data.saldo_disponible);
        setSaldosAcreditados(response.data.saldos_acreditados);
      } catch (error) {
        console.error('Error al obtener el saldo', error);
      }
    };

    fetchSaldo();
  }, []);

  return (
    <Container>
      <h1>Saldo Disponible</h1>
      <h3>${saldo}</h3>
      <h2>Historial de Acreditaciones</h2>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Valor</th>
            <th>Porcentaje</th>
            <th>Total Acreditado</th>
          </tr>
        </thead>
        <tbody>
          {saldosAcreditados.map((saldo, index) => (
            <tr key={index}>
              <td>{new Date(saldo.fecha).toLocaleString()}</td>
              <td>${saldo.valor}</td>
              <td>{saldo.porcentaje}%</td>
              <td>${saldo.valor * (1 + saldo.porcentaje / 100)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default VerSaldo;
