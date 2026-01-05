import React, { useState, useEffect } from 'react';
import { Container, Table } from 'react-bootstrap';
import axios from 'axios';
import api from '../../services/axiosConfig';

const ManageRecargas = () => {
  const [recargas, setRecargas] = useState([]);

  useEffect(() => {
    // Llamada al backend para obtener las recargas
    const fetchRecargas = async () => {
      try {
        const response = await api.get('/api/admin/recargas');
        setRecargas(response.data);
      } catch (error) {
        console.error('Error al obtener las recargas', error);
      }
    };

    fetchRecargas();
  }, []);

  return (
    <Container>
      <h1>Gestionar Recargas</h1>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>ID</th>
            <th>Tienda</th>
            <th>Operadora</th>
            <th>Valor</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {recargas.map(recarga => (
            <tr key={recarga.id}>
              <td>{recarga.id}</td>
              <td>{recarga.tienda.nombre}</td>
              <td>{recarga.operadora}</td>
              <td>{recarga.valor}</td>
              <td>{new Date(recarga.fecha).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default ManageRecargas;
