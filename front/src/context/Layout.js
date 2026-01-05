import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Modal, Button } from 'react-bootstrap';

const Layout = ({ children }) => {
  const { mostrarModalInactivo, setMostrarModalInactivo, logout } = useContext(AuthContext);
  const { user} = useContext(AuthContext); // Obtener updateUserRole del contexto

  const isSeller = user?.rol === 'tienda';

  return (
    <div>
      {children}

      {mostrarModalInactivo && (
        <Modal show backdrop="static" keyboard={false}>
          <Modal.Header>
            <Modal.Title>Usuario Inactivo</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Tu usuario no está activo. Por favor, contacta al administrador.
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="primary"
              onClick={() => {
                setMostrarModalInactivo(false);
                logout();
                window.location.href = '/login';
              }}
            >
              Volver al Inicio
            </Button>
            {isSeller && (
              <Button
                variant="secondary"
                onClick={() => {
                  window.location.href = '/tienda/saldos';
                }}
              >
                Ir a Pagos
              </Button>
            )}
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
};

export default Layout;
