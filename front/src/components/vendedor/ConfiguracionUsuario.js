import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Modal, Row, Col, Alert,InputGroup } from 'react-bootstrap';
import axios from 'axios';
import './ToggleSwitch.css';
import { useParams } from 'react-router-dom';
import api from '../../services/axiosConfig';
import { FaArrowRight } from 'react-icons/fa';


const ConfiguracionUsuario = () => {
  const { id } = useParams();
  const [tienda, setTienda] = useState(null);
  const [ordenGeografico, setOrdenGeografico] = useState(0);
  const [soloContado, setSoloContado] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [errorPorcentaje, setErrorPorcentaje] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState(''); // Mensaje del modal
  const [maxOrden, setMaxOrden] = useState(0);
  const [selectedOrden, setSelectedOrden] = useState(1);
  const [porcentaje, setPorcentaje] = useState('');
  const [confirmAction, setConfirmAction] = useState(''); // Almacena la acción que se está confirmando
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [correoError, setCorreoError] = useState('');
   const [usuarioId, setUsuarioId] = useState('');
 
  useEffect(() => {
    fetchTienda();
  }, [id]);

  // Función para obtener los datos de la tienda desde el backend
  const fetchTienda = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await api.get(`/admin/obtener-tienda/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const tiendaData = response.data;
      tiendaData.usuario.createdAt = new Date(tiendaData.usuario.createdAt).toLocaleString(); // Formato local
      setTienda(tiendaData);
      setOrdenGeografico(tiendaData.ordenGeografico);
      setSoloContado(tiendaData.contado);
      setMaxOrden(tiendaData.maxOrden);
      setSelectedOrden(tiendaData.orden);
      setPorcentaje(tiendaData.porcentaje);
      setUsuarioId(tiendaData.UsuarioId)
    } catch (error) {
      console.error('Error al obtener la tienda', error);
    }
  };

  // Manejar el cambio del toggle
  const handleToggleChange = () => {
    if (soloContado) {
      // Si está en solo contado (true), mostrar confirmación de financiamiento
      setConfirmMessage('¿Estás seguro de que quieres habilitar crédito en esta tienda?');
    } else {
      // Si está en financiamiento (false), mostrar confirmación de solo efectivo
      setConfirmMessage('¿Estas seguro de que todos los pagos sean al contado en esta tienda?');
    }
    setConfirmAction('toggle'); // Establece la acción
    setShowConfirmModal(true); // Mostrar el modal de confirmación
  };

  // Confirmar el cambio en el estado de solo contado
  const confirmToggleChange = async () => {
    const token = localStorage.getItem('token');
    try {
      await api.post(
        `/admin/actualizar-contado`,
        { tiendaId: id, contado: !soloContado },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setSoloContado(!soloContado);
      setMessage({
        type: 'success',
        text: soloContado
          ? 'Ahora estás ofreciendo financiamiento en esta tienda.'
          : 'Esta tienda solo podrá hacer pagos en efectivo.',
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al cambiar el estado de financiamiento.' });
    }
    setShowConfirmModal(false); // Cerrar el modal de confirmación
  };



  // Función para manejar el cambio del orden geográfico
  const handleSelectOrdenChange = async (event) => {
    const newOrden = parseInt(event.target.value);
    setSelectedOrden(newOrden);
    const token = localStorage.getItem('token');
    try {
      await api.post(
        `/admin/actualizar-orden`,
        { tiendaId: id, ordenGeografico: newOrden },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessage({ type: 'success', text: 'Orden geográfico actualizado correctamente.' });
      event.target.blur();
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al actualizar el orden geográfico.' });
      console.error('Error al actualizar el orden geográfico', error);
    }
  };

  const ToggleSwitch = ({ id, checked, onChange }) => (
    <label className="switch">
      <input type="checkbox" id={id} checked={checked} onChange={onChange} />
      <span className="slider round"></span>
    </label>
  );

  
   // Validar y actualizar el input del correo
   const handleCorreoChange = (e) => {
    const value = e.target.value;
    setNuevoCorreo(value);
    setCorreoError(''); // Reiniciar el error al cambiar el input
  };

  // Validar si el correo es correcto
  const validarCorreo = (correo) => {
    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Expresión regular para validar correo
    return regexCorreo.test(correo);
  };

  // Enviar el correo al backend
  const handleCorreoSubmit = async () => {
    // Validar que el correo esté bien escrito
    if (!validarCorreo(nuevoCorreo)) {
      setCorreoError('Por favor ingresa un correo electrónico válido.');
      return;
    }

    try {
      const token = localStorage.getItem('token'); // Obtener el token de autenticación
      const response = await api.put(
        '/admin/editar-correo',
        { userId: usuarioId , correo: nuevoCorreo },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Respuesta exitosa
      setMessage({ type: 'success', text: 'Correo actualizado correctamente.' });
      setCorreoError('');
    } catch (error) {
      // Mostrar el error del backend si existe
      const backendError =
        error.response?.data?.error || 'Error inesperado al actualizar el correo.';
      setCorreoError(backendError);
    }
  };



  // Función para restablecer la contraseña
  const handleResetPassword = async () => {
    const token = localStorage.getItem('token');
    try {
      await api.post(
        `/admin/restablecer-contrasenia`,
        { tiendaId: id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessage({ type: 'success', text: 'Contraseña restablecida exitosamente.' });
      window.location.reload();
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al restablecer la contraseña' });
      console.error('Error al restablecer la contraseña', error);
    }
    setShowConfirmModal(false);
  };

  // Función para mostrar el modal de restablecer contraseña
  const handleResetPasswordClick = () => {
    setConfirmAction('resetPassword'); // Asigna la acción de restablecer contraseña
    setConfirmMessage('¿Estás seguro de que deseas restablecer la contraseña del usuario?');
    setShowConfirmModal(true);
  };

  // Acción al confirmar en el modal
  const handleConfirmAction = () => {
    if (confirmAction === 'toggle') {
      confirmToggleChange();
    } else if (confirmAction === 'resetPassword') {
      handleResetPassword();
    }
  };

    const [visible, setVisible] = useState(false);
  
    useEffect(() => {
      if (message?.text) {
        setVisible(true);
        const timer = setTimeout(() => setVisible(false), 3000); // 3000 ms = 3 segundos
        return () => clearTimeout(timer); // Limpia el temporizador al desmontar
      }
    }, [message]);
  
  

  if (!tienda) {
    return <div>Cargando...</div>;
  }

  return (
    <Container>
      <Row className="my-2 align-items-center">
        <Col xs={8} sm={10} className="mb-1">
          <h1 className="text-left" style={{ color: '#0A74DA', marginBottom: '0.5rem' }}>
            Configuración
          </h1>
        </Col>

        {visible && (
          <Alert variant={message.type === 'success' ? 'success' : 'danger'}>
            {message.text}
          </Alert>
        )}
      </Row>

      <Form
  onSubmit={(e) => {
    e.preventDefault();
  }}
>
        {/* Campos existentes */}
        <Form.Group controlId="formNombreTienda" className="mb-3">
          <Form.Label>Nombre de la Tienda</Form.Label>
          <Form.Control type="text" value={tienda.usuario?.nombre_tienda} readOnly />
        </Form.Group>

        <Form.Group controlId="formFechaCreacion" className="mb-3">
          <Form.Label>Fecha de creación</Form.Label>
          <Form.Control type="text" value={tienda.usuario?.createdAt} readOnly />
        </Form.Group>
        <Form.Group controlId="formTelefono" className="mb-3">
          <Form.Label>Número telefónico</Form.Label>
          <Form.Control type="text"     value={tienda.usuario?.celular?.slice(-10)} // Muestra solo los últimos 10 dígitos
 readOnly />
        </Form.Group>

        <Form.Group controlId="formPorcentaje" className="mb-3">
          <Form.Label>Porcentaje</Form.Label>
          <Form.Control type="text" value={porcentaje} readOnly />
        </Form.Group>
        </Form>




        <Form
  onSubmit={(e) => {
    e.preventDefault();
  }}
>
          <Form.Group controlId="formCorreo" className="mb-3">
   
   
   <Form.Label>Correo</Form.Label>
   <InputGroup>
     <Form.Control
       type="email"
       placeholder={tienda.usuario?.correo}
       value={nuevoCorreo}
       onChange={handleCorreoChange}
       isInvalid={!!correoError}
       onKeyDown={(e) => {
         if (e.key === 'Enter') {
           e.preventDefault();
           handleCorreoSubmit();
           e.target.blur();
         }
       }}
     />
     <Button variant="primary" onClick={handleCorreoSubmit}>
       <FaArrowRight />
     </Button>
     <Form.Control.Feedback type="invalid">{correoError}</Form.Control.Feedback>
   </InputGroup>
   </Form.Group>
   </Form>
   
   <Form
     onSubmit={(e) => {
       e.preventDefault();
     }}
   >
        {/* Toggle Switch */}
        <Form.Group controlId="formSoloContado" className="mb-3">
          <Form.Label>Solo al Contado</Form.Label>
          <br />
          <label className="switch">
            <input type="checkbox" checked={soloContado} onChange={handleToggleChange} />
            <span className="slider round"></span>
          </label>
        </Form.Group>

        <Form.Group controlId="formOrdenGeografico" className="mb-3">
          <Form.Label>Orden Geográfico</Form.Label>
          <Form.Control as="select" value={selectedOrden} onChange={handleSelectOrdenChange}>
            {[...Array(maxOrden).keys()].map((num) => (
              <option key={num + 1} value={num + 1}>
                {num + 1}
              </option>
            ))}
          </Form.Control>
        </Form.Group>

        {/* Botón para restablecer contraseña */}
        <Button variant="danger" onClick={handleResetPasswordClick} className="mt-3">
          Restablecer Contraseña
        </Button>
      </Form>

      {/* Modal de Confirmación */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmación</Modal.Title>
        </Modal.Header>
        <Modal.Body>{confirmMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleConfirmAction}>
            Confirmar
          </Button>
        </Modal.Footer>
      </Modal>



    </Container>
  );
};

export default ConfiguracionUsuario;
