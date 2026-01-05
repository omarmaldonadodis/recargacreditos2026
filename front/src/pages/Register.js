import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Container, Alert } from 'react-bootstrap';
import axios from 'axios';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/auth/register', { email, password, role });
      setSuccess(true);
      setError('');
      setTimeout(() => navigate.push('/login'), 2000);
    } catch (err) {
      setError('Error en el registro');
    }
  };

  return (
    <Container>
      <h1 className="my-4">Registrar Usuario</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">Registro exitoso</Alert>}
      <Form onSubmit={handleSubmit}>
        <Form.Group controlId="formBasicEmail">
          <Form.Label>Correo Electrónico</Form.Label>
          <Form.Control
            type="email"
            placeholder="Ingresa tu correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group controlId="formBasicPassword">
          <Form.Label>Contraseña</Form.Label>
          <Form.Control
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group controlId="formBasicRole">
          <Form.Label>Rol</Form.Label>
          <Form.Control
            as="select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="">Selecciona un rol</option>
            <option value="admin">Administrador</option>
            <option value="vendedor">Vendedor</option>
            <option value="tienda">Tienda</option>
          </Form.Control>
        </Form.Group>

        <Button variant="primary" type="submit">
          Registrar
        </Button>
      </Form>
    </Container>
  );
};

export default Register;
