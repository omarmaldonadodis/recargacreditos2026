import React, { useState, useEffect } from 'react';
import { Container, Table, Button } from 'react-bootstrap';
import axios from 'axios';
import api from '../../services/axiosConfig';

const ManageTiendas = () => {
  const [tiendas, setTiendas] = useState([]);

  useEffect(() => {
    // Llamada al backend para obtener las tiendas del vendedor
    const fetchTiendas = async () => {
      try {
        const response = await api.get('/vendedor/tiendas');
        setTiendas(response.data);
      } catch (error) {
        console.error('Error al obtener las tiendas', error);
      }
    };

    fetchTiendas();
  }, []);

  return (
    <Container>
      <h1>Gestionar Tiendas</h1>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Latitud</th>
            <th>Longitud</th>
            <th>Saldo Disponible</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {tiendas.map(tienda => (
            <tr key={tienda.id}>
              <td>{tienda.id}</td>
              <td>{tienda.nombre}</td>
              <td>{tienda.latitud}</td>
              <td>{tienda.longitud}</td>
              <td>{tienda.saldo}</td>
              <td>
                <Button variant="warning" href={`/vendedor/tiendas/edit/${tienda.id}`}>Editar</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default ManageTiendas;
