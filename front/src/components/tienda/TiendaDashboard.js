import React from "react";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import { FaUsers, FaShoppingCart, FaMobileAlt, FaMoneyBillAlt } from "react-icons/fa"; // Añadido el icono de dinero

const TiendaDashboard = () => {
  return (
    <Container>
      <Row className="my-4">
        <Col>
          <h1 className="text-center" style={{ color: "#0A74DA" }}>
            Panel de Tienda
          </h1>
        </Col>
      </Row>
      <Row>
        <Col md={4}>
          <Card
            className="mb-4"
            style={{
              borderColor: "#d1d1d1",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Card.Body className="text-center">
              <FaMobileAlt size={50} color="#0A74DA" />
              <Card.Title className="mt-3">
                Recarga para tus clientes
              </Card.Title>
              <Card.Text>
                Recarga saldo de manera rápida y sencilla para tus clientes
              </Card.Text>
              <Button
                href="/tienda/hacer-recarga"
                variant="outline-primary"
                style={{ backgroundColor: "#0A74DA", color: "#fff" }}
              >
                Realizar Recarga
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card
            className="mb-4"
            style={{
              borderColor: "#d1d1d1",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Card.Body className="text-center">
              <FaUsers size={50} color="#0A74DA" />
              <Card.Title className="mt-3">Gestión de Usuarios</Card.Title>
              <Card.Text>
                Administra todos los usuarios de la plataforma.
              </Card.Text>
              <Button
                href="/tienda/ventas"
                variant="outline-primary"
                style={{ backgroundColor: "#0A74DA", color: "#fff" }}
              >
                Ver usuarios
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card
            className="mb-4"
            style={{
              borderColor: "#d1d1d1",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Card.Body className="text-center">
              <FaMoneyBillAlt size={50} color="#0A74DA" />
              <Card.Title className="mt-3">Gestión de Saldo</Card.Title>
              <Card.Text>
                Visualiza y gestiona el saldo disponible y los saldos acreditados.
              </Card.Text>
              <Button
                href="/tienda/saldos"
                variant="outline-primary"
                style={{ backgroundColor: "#0A74DA", color: "#fff" }}
              >
                Ver Saldo
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default TiendaDashboard;

