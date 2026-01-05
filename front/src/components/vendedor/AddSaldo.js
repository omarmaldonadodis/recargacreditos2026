import React, { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useGeolocated } from 'react-geolocated';
import axios from 'axios';
import api from '../../services/axiosConfig';

const AddSaldo = () => {
  const [saldo, setSaldo] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Usa el hook useGeolocated en lugar del HOC geolocated
  const { coords, isGeolocationAvailable, isGeolocationEnabled } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: false,
    },
    userDecisionTimeout: 5000,
  });

  const handleAddSaldo = async (e) => {
    e.preventDefault();

    if (!saldo || !coords) {
      setError('Debes ingresar un saldo y permitir la geolocalización.');
      return;
    }

    try {
      // Llamada al backend para agregar saldo
      await api.post('/vendedor/add-saldo', {
        saldo: parseFloat(saldo),
        latitud: coords.latitude,
        longitud: coords.longitude,
      });

      setSuccess(true);
      setError('');
    } catch (error) {
      setError('Error al agregar saldo.');
      console.error('Error al agregar saldo', error);
    }
  };

  if (!isGeolocationAvailable) {
    return <div>Tu navegador no soporta la geolocalización.</div>;
  }

  if (!isGeolocationEnabled) {
    return <div>La geolocalización no está habilitada.</div>;
  }

  return (
    <Container>
      <h1>Acreditar Saldo</h1>
      {success && <Alert variant="success">Saldo acreditado con éxito</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={handleAddSaldo}>
        <Form.Group>
          <Form.Label>Saldo</Form.Label>
          <Form.Control
            type="number"
            placeholder="Ingrese el saldo"
            value={saldo}
            onChange={(e) => setSaldo(e.target.value)}
          />
        </Form.Group>
        <Button variant="primary" type="submit" disabled={!coords}>
          Acreditar Saldo
        </Button>
      </Form>
    </Container>
  );
};

export default AddSaldo;
