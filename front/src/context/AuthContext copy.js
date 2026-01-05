import React, { createContext, useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';  // Asegurarse de importar Modal y Button correctamente

import authService from '../services/authService';
import eventEmitter from '../services/eventEmitter';
export const AuthContext = createContext(null);


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);  // Valor inicial es null (sin usuario)
  const [loading, setLoading] = useState(true);  // Estado de carga
  const [mostrarModalInactivo, setMostrarModalInactivo] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const userData = authService.getUserFromToken(token);
      setUser(userData);  // Actualiza el estado del usuario
    }
    setLoading(false);  // Indica que la carga ha finalizado

      // Escuchar el evento de usuario inactivo
      eventEmitter.on('usuarioInactivo', () => {
        setMostrarModalInactivo(true);
      });
  
      return () => {
        eventEmitter.removeAllListeners('usuarioInactivo');
      };
  }, []);

  const login = async (credentials) => {
    const userData = await authService.login(credentials);
    setUser(userData);  // Actualiza el estado del usuario después del login
  };

  const logout = () => {
    authService.logout();
    localStorage.removeItem('token_admin');  // Limpia el token de administrador
    setUser(null);  // Restablece el estado del usuario a null después del logout
  };

  // Nueva función para actualizar el rol y el token del usuario
  const updateUserRole = (newToken) => {
    localStorage.setItem('token', newToken);  // Actualiza el token en localStorage
    const userData = authService.getUserFromToken(newToken);  // Extrae los datos del usuario
    setUser(userData);  // Actualiza el estado del usuario con el nuevo rol
  };

  // Nueva función para restaurar el rol de administrador
  const restoreAdminRole = () => {
    const adminToken = localStorage.getItem('token_admin');  // Recupera el token de administrador
    if (adminToken) {
      localStorage.setItem('token', adminToken);  // Restaura el token de administrador en localStorage
      localStorage.removeItem('token_admin');  // Elimina el token de vendedor
      const adminData = authService.getUserFromToken(adminToken);  // Extrae los datos del administrador
      setUser(adminData);  // Actualiza el estado del usuario al rol de administrador
    }
  };

  if (loading) {
    return <div>Cargando...</div>;  // Muestra un indicador de carga mientras se verifica el token
  }

  return (
    <AuthContext.Provider value={{ user, mostrarModalInactivo, setMostrarModalInactivo , login, logout, updateUserRole, restoreAdminRole }}>
      {children}
       {/* Modal bloqueante si el usuario no está activo */}
       {mostrarModalInactivo && (
        <Modal show backdrop="static" keyboard={false}>
          <Modal.Header>
            <Modal.Title>Usuario Inactivo</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Tu usuario no está activo. Por favor, contacta al administrador.
          </Modal.Body>
          <Modal.Footer>
            {/* <Button
              variant="primary"
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
            >
              Volver al Inicio
            </Button> */}
          </Modal.Footer>
        </Modal>
      )}
    </AuthContext.Provider>
  );
};
