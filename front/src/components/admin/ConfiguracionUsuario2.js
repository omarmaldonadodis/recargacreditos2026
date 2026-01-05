import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Modal, Row, Col, Alert, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import './ToggleSwitch.css';
import { useParams } from 'react-router-dom';
import api from '../../services/axiosConfig';
import { FaArrowRight } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { FaMapMarkerAlt } from 'react-icons/fa';
import L from 'leaflet';
import ReactDOMServer from 'react-dom/server';




const ConfiguracionUsuario = () => {

  const [ubicacion, setUbicacion] = useState('');
  const [ubicacionError, setUbicacionError] = useState('');

  const { id } = useParams();
  
  const {UsuarioId} = useParams();

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
  const [nuevoCelular, setNuevoCelular] = useState('');
  const [celularError, setCelularError] = useState('');
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [correoError, setCorreoError] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [tiendaId, setTiendaId] = useState('');


  const [latitud, setLatitud] = useState(null);
const [longitud, setLongitud] = useState(null);

// Crea un ícono personalizado usando FontAwesome
const customIcon = new L.DivIcon({
  className: 'custom-icon',
  html: ReactDOMServer.renderToString(
    <FaMapMarkerAlt style={{ color: '#0A74DA' , fontSize: '24px' }} />
  ),
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

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
      setUsuarioId(tiendaData.UsuarioId);
      setTiendaId(tiendaData.id);

      
      if (tiendaData?.latitud && tiendaData?.longitud) {
        setLatitud(tiendaData.latitud);
        setLongitud(tiendaData.longitud);
      }

      
    } catch (error) {
      console.error('Error al obtener la tienda', error);
    }
  };

  const [showAlert, setShowAlert] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAlert(false); // Desactiva la alerta después de 3 segundos
    }, 3000);

    return () => clearTimeout(timer); // Limpia el temporizador
  }, []);

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

  // Función para manejar el cambio del porcentaje
  const handlePorcentajeChange = (event) => {
    const value = event.target.value;
    setErrorPorcentaje('');
    setPorcentaje(value);

    // Validar el valor del porcentaje
    if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 7)) {
      setErrorPorcentaje('');
    } else {
      setErrorPorcentaje('El porcentaje debe estar entre 0 y 7');
    }
  };

  // Función para manejar la tecla Enter
  const handleKeyDown = async () => {
    if (porcentaje !== '') {
      const parsedPorcentaje = parseFloat(porcentaje);
      if (parsedPorcentaje >= 0 && parsedPorcentaje <= 7) {
        const token = localStorage.getItem('token');
        try {
          await api.post(
            `/admin/actualizar-porcentaje`,
            { tiendaId: id, porcentaje: parsedPorcentaje },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          setMessage({ type: 'success', text: 'Porcentaje actualizado correctamente.' });
        } catch (error) {
          setMessage({ type: 'error', text: 'Error al actualizar el porcentaje.' });
          console.error('Error al actualizar el porcentaje', error);
        }
      } else {
        setErrorPorcentaje('El porcentaje debe estar entre 0 y 7');
      }
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

  // Actualizar el input con el número del usuario
  const handleCelularChange = (e) => {
    const value = e.target.value;
    // Validar que solo contenga números y no más de 10 caracteres
    if (/^\d{0,10}$/.test(value)) {
      setNuevoCelular(value);
    }
    setCelularError(''); // Reiniciar el error al cambiar el input
  };

  // Enviar el número al backend
  const handleCelularSubmit = async () => {
    if (nuevoCelular.length !== 10) {
      setCelularError('El número de celular debe tener exactamente 10 dígitos.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await api.post(
        '/admin/restablecer-celular',
        { tiendaId: id, nuevoCelular },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Respuesta exitosa
      setMessage({ type: 'success', text: 'Porcentaje actualizado correctamente.' });
      setCelularError('');
    } catch (error) {
      // Mostrar el error del backend si existe
      const backendError =
        error.response?.data?.error || 'Error inesperado al actualizar el celular.';
      setCelularError(backendError);
    }
  };


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

  const handleUbicacionChange = (e) => {
    try {
      console.log ("Enrtra a Erroe en el hanndle ubicación change")

    const valor = e.target.value;
    setUbicacion(valor);
  
    // Validación solo para coordenadas manuales
    const coords = valor.split(',');
    if (coords.length === 2) {
      const [lat, lon] = coords.map(coord => parseFloat(coord.trim()));
      if (!isNaN(lat) && !isNaN(lon)) {
        setLatitud(lat);
        setLongitud(lon);
        setUbicacionError('');
      } else {
        setUbicacionError('Las coordenadas deben ser números válidos.');
      }
    } else {
      setUbicacionError('Ingrese latitud y longitud separadas por coma.');
    }
  } catch (error) {

    console.log ("Erroe en el hanndle ubicación change")
  }
  };
  
  const handleUbicacionSubmit = async () => {
    try {
    const token = localStorage.getItem('token'); // Obtener el token de autenticación

  
    if (latitud === undefined || longitud === undefined || isNaN(latitud) || isNaN(longitud)) {
      setUbicacionError('Por favor ingrese una ubicación válida.');
      return;
    }
  
    console.log(tiendaId)
   
      const response = await api.put(
        '/admin/actualizar-ubicacion',
        { tiendaId: tiendaId, latitud, longitud },
        { headers: { Authorization: `Bearer ${token}` } }
        
      );
      setMessage({ type: 'success', text: 'Ubicación actualizada correctamente.' });
      setUbicacionError('');
    } catch (error) {
      console.log("Error en el handelSumbit");
      const backendError =
        error.response?.data?.error || 'Error inesperado al actualizar la ubicación.';
      setUbicacionError(backendError);
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
        <Form.Group controlId="formFechaCreacion">
          <Form.Label>Fecha de creación</Form.Label>
          <Form.Control type="text" value={tienda.usuario?.createdAt} readOnly />
        </Form.Group>
        {/* Campos existentes 
        <Form.Group controlId="formTelefono">
          <Form.Label>Número telefónico</Form.Label>
          <Form.Control type="text" value={tienda.usuario?.celular} readOnly />
        </Form.Group>*/}
                </Form>
                <Form>

        <Form.Group controlId="formCelular" className="mb-3">
      <Form.Label>Número de Celular</Form.Label>
      <InputGroup>
        <Form.Control
          type="text"
          placeholder={tienda.usuario?.celular.slice(-10)}
          value={nuevoCelular}
          onChange={handleCelularChange}
          isInvalid={!!celularError}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCelularSubmit();
              e.target.blur();
            }
          }}
        />
        <Button variant="primary" onClick={handleCelularSubmit}>
          <FaArrowRight />
        </Button>
        <Form.Control.Feedback type="invalid">{celularError}</Form.Control.Feedback>
      </InputGroup>
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
        {/* Campo editable para el porcentaje */}
        <Form.Group controlId="formPorcentaje" className="mb-3">
          <Form.Label>Porcentaje</Form.Label>
          <InputGroup>
          <Form.Control
            type="number"
            step="0.1"
            min="0"
            max="7"
            value={porcentaje}
            onChange={handlePorcentajeChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleKeyDown();
                e.target.blur();
              }
            }}

            isInvalid={errorPorcentaje !== ''}
          />
          <Button variant="primary" onClick={handleKeyDown}>
          <FaArrowRight />
        </Button>
          <Form.Control.Feedback type="invalid">{errorPorcentaje}</Form.Control.Feedback>
          </InputGroup>
        </Form.Group>
        </Form>
        <Form
  onSubmit={(e) => {
    e.preventDefault();
  }}
>
<Form.Group controlId="formUbicacion" className="mb-3">
          <Form.Label>Ubicación</Form.Label>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Ingrese latitud y longitud"
              value={ubicacion}
              onChange={handleUbicacionChange}
              isInvalid={ubicacionError !== ''}
            />
            <Button variant="primary" onClick={handleUbicacionSubmit}>
              <FaArrowRight />
            </Button>
          </InputGroup>
          <Form.Control.Feedback type="invalid">{ubicacionError}</Form.Control.Feedback>
        </Form.Group>


        {/* Toggle Switch */}
        <Form.Group controlId="formSoloContado" className="mb-3">
          <Form.Label>Solo al Contado</Form.Label>
          <br />
          <label className="switch">
            <input type="checkbox" checked={soloContado} onChange={handleToggleChange} />
            <span className="slider round"></span>
          </label>
        </Form.Group>

         {/* Toggle Switch 
    
        {latitud && longitud ? (
  <MapContainer center={[latitud, longitud]} zoom={18} style={{ height: '250px', width: '100%' }}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <Marker position={[latitud, longitud]} icon={customIcon}>
    <Popup>
      <FaMapMarkerAlt style={{ color: 'green', fontSize: '16px' }} /> Aquí está la tienda
    </Popup>
  </Marker>
</MapContainer>
    ) : (
      <p>No se encontraron coordenadas para mostrar en el mapa.</p>
    )}*/}
 

    

  

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
