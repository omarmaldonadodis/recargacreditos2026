import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Container, Alert, Card, Image, InputGroup, Modal } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import useAuth from '../hooks/useAuth';
import logo from '../assets/recargacreditos-02.svg';
import backgroundImage from '../assets/fondo.webp';
import axios from 'axios';
import ReCAPTCHA from "react-google-recaptcha";

const Login = () => {
  const [identificador, setIdentificador] = useState('');
  const [contrasenia, setContrasenia] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [recuperar, setRecuperar] = useState(false);
  const [correoRecuperacion, setCorreoRecuperacion] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaContrasenia, setNuevaContrasenia] = useState('');
  const [recuperacionPaso, setRecuperacionPaso] = useState(1);
  const { login, isAuthenticated, confirmarCodigoRecuperacion } = useAuth();
  const navigate = useNavigate();

  const [hasEditedIdentificador, setHasEditedIdentificador] = useState(false);
  const [hasEditedContrasenia, setHasEditedContrasenia] = useState(false);
  const [hasEditedCorreoRecuperacion, setHasEditedCorreoRecuperacion] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recaptchaVerified, setRecaptchaVerified] = useState(false);
  const [showRecaptcha, setShowRecaptcha] = useState(false);
  const [recaptchaInstance, setRecaptchaInstance] = useState(null);
  const [accionRequiereCaptcha, setAccionRequiereCaptcha] = useState(null); // 'login' o 'recuperar'

  // Refs para manejar el foco al presionar Enter
  const passwordInputRef = useRef(null);
  const correoInputRef = useRef(null);
  const codigoInputRef = useRef(null);
  const nuevaContraseniaInputRef = useRef(null);

  // UseEffect para borrar mensajes de error automáticamente después de 5 segundos
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 15000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // UseEffect para borrar mensajes de verificación (mensaje) automáticamente después de 5 segundos
  useEffect(() => {
    if (mensaje) {
      const timer = setTimeout(() => setMensaje(''), 15000);
      return () => clearTimeout(timer);
    }
  }, [mensaje]);

  // Función para manejar el cambio del reCAPTCHA
  const handleRecaptchaChange = async (token) => {
    if (!token) {
      setError('Error en la verificación. Por favor, intenta de nuevo.');
      return;
    }

    try {
      const response = await axios.post(
        'https://www.recargacreditos.com.mx/api/auth/validar-recaptcha',
        { token }
      );

      if (response.data.success) {
        setRecaptchaVerified(true);
        setShowRecaptcha(false);
        setError('');
      } else {
        setError('Error en la validación de seguridad.');
        if (recaptchaInstance) {
          recaptchaInstance.reset();
        }
      }
    } catch (err) {
      console.error('Error al validar reCAPTCHA:', err);
      setError('Error en la validación. Por favor, intenta de nuevo.');
      if (recaptchaInstance) {
        recaptchaInstance.reset();
      }
    }
  };

  const handleSubmit = async () => {
    try {
      await login({ identificador, contrasenia });
      if (isAuthenticated) {
        navigate('/');
      }
    } catch (error) {
      console.error('Error de inicio de sesión:', error);
      setError('Error durante el inicio de sesión. ' + error.message);
    }
  };

  const solicitarCodigoRecuperacion = async (correo) => {
    try {
      const response = await axios.post(
        'https://www.recargacreditos.com.mx/api/auth/recuperar-contrasenia',
        { correo }
      );
      return response.data.message;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al solicitar el código de recuperación');
    }
  };

  const solicitarCodigo = async () => {
    try {
      const message = await solicitarCodigoRecuperacion(correoRecuperacion);
      setMensaje(message);
      setRecuperacionPaso(2);
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmarCodigo = async () => {
    try {
      const result = await confirmarCodigoRecuperacion({
        correo: correoRecuperacion,
        codigoVerificacion: codigo,
        nuevaContrasenia: nuevaContrasenia,
      });

      if (result.user) {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Cuando el reCAPTCHA se verifica y existe una acción pendiente, se ejecuta
  useEffect(() => {
    if (recaptchaVerified && accionRequiereCaptcha) {
      if (accionRequiereCaptcha === 'login') {
        handleSubmit();
      } else if (accionRequiereCaptcha === 'recuperar') {
        solicitarCodigo();
      }
      setAccionRequiereCaptcha(null);
    }
  }, [recaptchaVerified, accionRequiereCaptcha]);

  // Mostrar el reCAPTCHA solo cuando sea necesario
  const handleLoginClick = (e) => {
    e.preventDefault();
    if (recaptchaVerified) {
      handleSubmit();
    } else {
      setAccionRequiereCaptcha('login');
      setShowRecaptcha(true);
    }
  };

  const handleRecuperarClick = (e) => {
    e.preventDefault();
    if (recaptchaVerified) {
      solicitarCodigo();
    } else {
      setAccionRequiereCaptcha('recuperar');
      setShowRecaptcha(true);
    }
  };

  const handleCodigoChange = (e) => {
    const input = e.target.value;
    if (/^\d{0,4}$/.test(input)) {
      setCodigo(input);
      setError('');
    }
  };

  const handleNuevaContraseniaChange = (e) => {
    setNuevaContrasenia(e.target.value);
    setError('');
  };

  const handleIdentificadorChange = (e) => {
    setIdentificador(e.target.value);
    setHasEditedIdentificador(true);
    setError('');
  };

  const handleContraseniaChange = (e) => {
    setContrasenia(e.target.value);
    setHasEditedContrasenia(true);
    setError('');
  };

  const handleCorreoRecuperacionChange = (e) => {
    setCorreoRecuperacion(e.target.value);
    setHasEditedCorreoRecuperacion(true);
    setError('');
  };

  const containerStyle = {
    minHeight: '100vh',
    minWidth: '100vw',
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };

  if (isAuthenticated) {
    navigate('/');
    return null;
  }

  return (
    <Container className="d-flex justify-content-center align-items-center" style={containerStyle}>
<Modal
  show={showRecaptcha}
  backdrop="static"
  keyboard={false}
  centered
  dialogClassName="custom-modal"
>
<div className="w-100"> 
<Modal.Header>
          <Modal.Title> <h5>Verifica que no eres un robot</h5></Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          <div className="recaptcha-wrapper">

          <ReCAPTCHA
            ref={(ref) => setRecaptchaInstance(ref)}
            sitekey="6Leq_IkqAAAAAEnjTj_8esW0X6swtNGZfKhNqLV3"
            onChange={handleRecaptchaChange}
            onErrored={() => setError('Error al cargar la verificación. Por favor, recarga la página.')}
            onExpired={() => {
              setError('La verificación ha expirado. Por favor, intenta de nuevo.');
              setRecaptchaVerified(false);
            }}
            
          />
          </div>

        </Modal.Body>
          </div>

      </Modal>
      <Card style={{ width: '100%', maxWidth: '400px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)', backgroundColor: 'rgba(255, 255, 255, 0.85)' }}>
        <Card.Header className="text-center" style={{ backgroundColor: '#009bdc', borderRadius: '10px 10px 0 0', padding: '15px 0' }}>
          <Image src={logo} style={{ width: '180px' }} alt="Logotipo" />
        </Card.Header>
        {recuperar ? (
          <Card.Body>
            <h2 className="text-center mb-4" style={{ color: '#0A74DA' }}>Recuperar Contraseña</h2>
            {mensaje && <Alert variant="success">{mensaje}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}
            {recuperacionPaso === 1 && (
              <>
                <Form.Group controlId="correoRecuperacion">
                  <Form.Label>Correo Electrónico:</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Ingresa tu correo electrónico"
                    value={correoRecuperacion}
                    onChange={handleCorreoRecuperacionChange}
                    isInvalid={correoRecuperacion === '' && hasEditedCorreoRecuperacion}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRecuperarClick(e);
                      }
                    }}
                  />
                  <Form.Control.Feedback type="invalid">
                    Por favor, ingresa tu correo.
                  </Form.Control.Feedback>
                </Form.Group>
                <Button
                  variant="primary"
                  onClick={handleRecuperarClick}
                  style={{ width: '100%', marginTop: '20px' }}
                >
                  Solicitar Código
                </Button>
                <Button
                  variant="link"
                  onClick={() => setRecuperar(false)}
                  style={{ width: '100%', marginTop: '10px', color: '#007bff', textDecoration: 'none' }}
                >
                  Regresar
                </Button>
              </>
            )}
            {recuperacionPaso === 2 && (
              <>
                <Form.Group controlId="codigo">
                  <Form.Label>Código de Verificación:</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ingresa el código recibido"
                    value={codigo}
                    onChange={handleCodigoChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (nuevaContraseniaInputRef.current) nuevaContraseniaInputRef.current.focus();
                      }
                    }}
                  />
                </Form.Group>
                <Form.Group controlId="nuevaContrasenia">
                  <Form.Label>Nueva Contraseña:</Form.Label>
                  <InputGroup>
                    <Form.Control
                      ref={nuevaContraseniaInputRef}
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Ingresa la nueva contraseña"
                      value={nuevaContrasenia}
                      onChange={handleNuevaContraseniaChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          confirmarCodigo();
                        }
                      }}
                    />
                    <InputGroup.Text
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{ cursor: 'pointer' }}
                    >
                      {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </InputGroup.Text>
                  </InputGroup>
                </Form.Group>
                <Button
                  variant="primary"
                  onClick={confirmarCodigo}
                  style={{ width: '100%', marginTop: '20px' }}
                >
                  Confirmar Código
                </Button>
              </>
            )}
          </Card.Body>
        ) : (
          <Card.Body>
            <h2 className="text-center mb-4" style={{ color: '#0A74DA' }}>Iniciar Sesión</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleLoginClick}>
              <Form.Group controlId="identificador">
                <Form.Label>Identificador:</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Nombre de tienda o Correo"
                  value={identificador}
                  onChange={handleIdentificadorChange}
                  isInvalid={identificador === '' && hasEditedIdentificador}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (passwordInputRef.current) passwordInputRef.current.focus();
                    }
                  }}
                />
                <Form.Control.Feedback type="invalid">
                  Por favor, ingresa un identificador válido.
                </Form.Control.Feedback>
              </Form.Group>
              <Form.Group controlId="contrasenia">
                <Form.Label>Contraseña:</Form.Label>
                <InputGroup>
                  <Form.Control
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Whatsapp o Contraseña"
                    value={contrasenia}
                    onChange={handleContraseniaChange}
                    isInvalid={contrasenia === '' && hasEditedContrasenia}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleLoginClick(e);
                      }
                    }}
                  />
                  <InputGroup.Text
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ cursor: 'pointer' }}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </InputGroup.Text>
                  <Form.Control.Feedback type="invalid">
                    Por favor, ingresa tu contraseña.
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
              <Button
                variant="primary"
                onClick={handleLoginClick}
                style={{ width: '100%', marginTop: '20px' }}
              >
                Iniciar Sesión
              </Button>
            </Form>
            <Button
              variant="link"
              onClick={() => setRecuperar(true)}
              style={{ width: '100%', marginTop: '10px', color: '#007bff', textDecoration: 'none' }}
            >
              ¿Olvidaste tu contraseña?
            </Button>
          </Card.Body>
        )}
      </Card>
      <style>{`
  .custom-modal {
    max-width: 400px;
    width: 100%;
    margin: auto;
  }

  @media (max-width: 576px) {
    .custom-modal {
      max-width: 280px;
    }
      .recaptcha-wrapper {
      transform: scale(0.85);
      margin: -10px -28px -10px   ;

    }
  .custom-modal .modal-title h5 {
      font-size: 1rem;
      margin: -5px -5px -10px   ;

    }



  }
`}</style>


    </Container>
    
  );
};

export default Login;
