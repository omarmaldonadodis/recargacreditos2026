import React, { useState, useEffect } from 'react';
import { Form, Button, InputGroup, Container, Row, Col, Card } from 'react-bootstrap';
import axios from 'axios';
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // Importamos los íconos de FontAwesome
import api from '../../services/axiosConfig';

const Configuracion = () => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [storeName, setStoreName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEmailEditable, setIsEmailEditable] = useState(false);

  // Al cargar el componente, obtener la información del token y limpiar las contraseñas
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));

      setPhone(payload.celular.slice(-10) || '');
      setStoreName(payload.nombres_apellidos || '');
      setEmail(payload.correo || '');
      setIsEmailEditable(!payload.correo);
    }

    // Limpiar los campos de contraseña cuando el componente se monta y desmonta
    return () => {
      setNewPassword('');
      setConfirmPassword('');
    };
  }, []); // [] se asegura de que esto solo se ejecute al montar/desmontar

  const handleEmailSubmit = () => {
    if (email && validateEmail(email)) {
      const token = localStorage.getItem('token');
      api.put('/auth/editar-correo', { correo: email }, { headers: { Authorization: `Bearer ${token}` } })
        .then((response) => {
          alert('Correo actualizado correctamente');
          const newToken = response.data.token;
          localStorage.setItem('token', newToken); // Guardar el nuevo token en localStorage
          window.location.reload(); // Recargar la página
        })
        .catch((error) => {
          const errorMessage = error.response?.data?.error || 'Error al actualizar correo';
          alert(errorMessage);
        });
    } else {
      alert('Por favor ingresa un correo válido.');
    }
  };

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handlePasswordSubmit = () => {
  // Validar campos vacíos
  if (!newPassword || !confirmPassword) {
    alert('La contraseña no puede estar vacía');
    return;
  }

  // Validar coincidencia de contraseñas
  if (newPassword !== confirmPassword) {
    alert('Las contraseñas no coinciden');
    return;
  }

  const token = localStorage.getItem('token');

  api.put('/auth/editar-contrasenia', { nueva_contrasenia: newPassword }, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then((response) => {
      alert('Contraseña actualizada correctamente');
      const newToken = response.data.token;
      localStorage.setItem('token', newToken); // Guardar el nuevo token
      window.location.reload(); // Recargar la página
    })
    .catch((error) => {
      const errorMessage = error.response?.data?.error || 'Error al actualizar contraseña';
      alert(errorMessage);
    });
};



  // Función para bloquear copiar, pegar y cortar
  const blockCopyPaste = (e) => {
    e.preventDefault();
  };

  return (
    <Container className="my-5">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow-sm p-4">
            <Card.Body>
              <h3 className="text-center mb-4">Configuración del vendedor</h3>
              <Form>
                {/* Nombre del vendedor (solo lectura) */}
                <Form.Group controlId="storeName" className="mb-3">
                  <Form.Label>Nombre del vendedor</Form.Label>
                  <Form.Control type="text" value={storeName} readOnly className="form-control-lg" />
                </Form.Group>

                {/* Teléfono (solo lectura) */}
                <Form.Group controlId="phone" className="mb-3">
                  <Form.Label>Número de Teléfono</Form.Label>
                  <Form.Control type="text" value={phone?.slice(-10)} readOnly className="form-control-lg" />
                </Form.Group>

                {/* Correo electrónico (editable solo si está vacío) */}
                <Form.Group controlId="email" className="mb-3">
                  <Form.Label>Correo Electrónico</Form.Label>
                  {isEmailEditable ? (
                    <InputGroup>
                      <Form.Control
                        type="email"
                        placeholder="Ingresa tu correo electrónico"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="form-control-lg text-dark small-placeholder"
                        />
                      <Button variant="primary" onClick={handleEmailSubmit} className="btn-lg">
                        Enviar
                      </Button>
                    </InputGroup>
                  ) : (
                    <Form.Control type="email" value={email} readOnly className="form-control-lg mb-3"/>
                  )}
                </Form.Group>

                {/* Nueva contraseña */}
                <Form.Group controlId="newPassword" className="mb-3" >
                  <Form.Label>Nueva Contraseña</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Ingresa nueva contraseña"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="form-control-lg text-dark small-placeholder"

                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowNewPassword(!showNewPassword)} // Alterna la visibilidad de la contraseña

                      //onMouseDown={() => setShowNewPassword(true)}
                     // onMouseUp={() => setShowNewPassword(false)}
                      className="btn-lg"
                    >
                      {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </Button>
                  </InputGroup>
                </Form.Group>

                {/* Confirmar contraseña */}
                <Form.Group controlId="confirmPassword" className="mb-3">
                  <Form.Label>Confirmar Contraseña</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirma tu nueva contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="form-control-lg text-dark small-placeholder"

                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)} // Alterna la visibilidad de la contraseña

                      //onMouseDown={() => setShowConfirmPassword(true)}
                      //onMouseUp={() => setShowConfirmPassword(false)}
                      className="btn-lg"
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </Button>
                  </InputGroup>
                </Form.Group>

                <Button variant="success" onClick={handlePasswordSubmit} className="btn-lg w-100 mt-4">
                  Cambiar Contraseña
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <style>{`
        @media (max-width: 576px) {
          .small-placeholder::-webkit-input-placeholder {
            font-size: 0.7rem;
          }
          .small-placeholder::-moz-placeholder {
            font-size: 0.6rem;
          }
          .small-placeholder:-ms-input-placeholder {
            font-size: 0.6rem;
          }
          .small-placeholder::placeholder {
            font-size: 0.6rem;
          }
        }
      `}</style>
    </Container>
  );
};

export default Configuracion;
