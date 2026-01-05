import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { FaUsers, FaShoppingCart } from 'react-icons/fa';

const AdminDashboard = () => {
  return (
    <Container>
      <Row className="my-4">
        <Col>
          <h1 className="text-center" style={{ color: '#0A74DA' }}>Panel de Administración</h1>
        </Col>
      </Row>
      <Row>
        <Col md={6}>
          <Card className="mb-4" style={{ borderColor: '#d1d1d1', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
            <Card.Body className="text-center">
              <FaUsers size={50} color="#0A74DA" />
              <Card.Title className="mt-3">Gestión de Usuarios</Card.Title>
              <Card.Text>Administra todos los usuarios de la plataforma.</Card.Text>
              <Button href="/admin/users" variant="outline-primary" style={{ backgroundColor: '#0A74DA', color: '#fff' }}>Ver usuarios</Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="mb-4" style={{ borderColor: '#d1d1d1', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
            <Card.Body className="text-center">
              <FaShoppingCart size={50} color="#0A74DA" />
              <Card.Title className="mt-3">Gestión de Vendedores</Card.Title>
              <Card.Text>Administra todos los vendedores y sus actividades.</Card.Text>
              <Button href="/admin/vendedores" variant="outline-primary" style={{ backgroundColor: '#0A74DA', color: '#fff' }}>Ver vendedores</Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboard;

