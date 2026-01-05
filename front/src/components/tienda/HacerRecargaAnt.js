import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { FaArrowLeft, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import axios from 'axios';
import SaldoDisplay from './SaldoDisplay'; // Importa el componente de saldo
import telcelLogo from '../../assets/Telcel-Logo.jpg';
import movistarLogo from '../../assets/logo-Movista.png';
import unefoneLogo from '../../assets/Unefon.png';
import attLogo from '../../assets/ATT.svg';
import virginLogo from '../../assets/Virgin.jpg';

const HacerRecarga = () => {
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState('');
  const [recargaType, setRecargaType] = useState('');
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transactionSuccess, setTransactionSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [userVerified, setUserVerified] = useState(false); 
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [saldo, setSaldo] = useState(null);
  const [geoPermissionRequested, setGeoPermissionRequested] = useState(false);


  const companies = [
    { name: 'Telcel', logo: telcelLogo },
    { name: 'Movistar', logo: movistarLogo },
    { name: 'Unefone', logo: unefoneLogo },
    { name: 'AT&T', logo: attLogo },
    { name: 'Virgin', logo: virginLogo }
  ];

  const recargaTypes = ['Paquete', 'Llamada'];

  const amounts = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

  const obtenerSaldo = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get('https://www.recargacreditos.com.mx/api/tiendas/solo-saldo', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSaldo(response.data.saldo_disponible);
    } catch (error) {
      console.error('Error al obtener saldo:', error);
    }
  };

  useEffect(() => {
    obtenerSaldo(); // Obtener el saldo inicial cuando el componente se monta
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserVerified(payload.verificado);
      console.log('Usuario verificado:', payload.verificado); // Imprime si el usuario está verificado
      
    }
  }, []);

  useEffect(() => {
    const handleGeoLocationPermission = async () => {
      // Consulta el estado del permiso de geolocalización
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
  
        // Si el permiso cambia a 'granted', intenta obtener la ubicación nuevamente
        if (permissionStatus.state === 'granted' && geoPermissionRequested) {
          navigator.geolocation.getCurrentPosition(
            position => {
              setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            },
            error => {
              console.error('Error obteniendo la ubicación', error);
            }
          );
        }
  
        // Escucha cambios en el estado del permiso
        permissionStatus.onchange = () => {
          if (permissionStatus.state === 'granted' && geoPermissionRequested) {
            navigator.geolocation.getCurrentPosition(
              position => {
                setLocation({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                });
              },
              error => {
                console.error('Error obteniendo la ubicación', error);
              }
            );
          }
        };
      } catch (error) {
        console.error('Error manejando el permiso de geolocalización:', error);
      }
    };
  
    handleGeoLocationPermission();
  }, [geoPermissionRequested]);
  
  useEffect(() => {
    if (!userVerified && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setGeoPermissionRequested(true); // Indica que se ha solicitado la geolocalización
        },
        error => {
          console.error('Error obteniendo la ubicación', error);
          setGeoPermissionRequested(true); // Permite reintentar cuando los permisos cambian
        }
      );
    }
  }, [userVerified]);

  // Detectar el botón de "atrás" en el navegador y borrar opción seleccionada
  useEffect(() => {
    const handlePopState = (event) => {
      if (step > 1) {
        if (step === 2) {
          setCompany('');
        } else if (step === 3) {
          setRecargaType('');
          setCompany('');
        } else if (step === 4) {
          setAmount('');
          setRecargaType('');
          setCompany('');
        }
        setStep(step - 1);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [step]);

  const handleSelectCompany = (selectedCompany) => {
    setCompany(selectedCompany);
    setStep(2);
  };

  const handleSelectRecargaType = (selectedType) => {
    setRecargaType(selectedType);
    setStep(3);
  };

  const handleSelectAmount = (selectedAmount) => {
    setAmount(selectedAmount);
    setStep(4);
  };

  const handlePhoneNumberChange = (e) => {
    const input = e.target.value;

    // Solo permitir números y limitar a 10 dígitos
    if (/^\d{0,10}$/.test(input)) {
      setPhoneNumber(input);
    }
  };

  const handleConfirm = async () => {
    if (phoneNumber.length !== 10) {
      setErrorMessage('El número de teléfono debe tener exactamente 10 dígitos.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const recargaData = {
        operadora: company,
        tipo: recargaType.toLowerCase(),
        valor: amount,
        celular: phoneNumber
      };

      if (!userVerified && location.lat && location.lng) {
        recargaData.latitud = location.lat;
        recargaData.longitud = location.lng;
      }

      await axios.post('https://www.recargacreditos.com.mx/api/tiendas/recargas', recargaData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setTransactionSuccess(true);
      setStep(6);
      
      obtenerSaldo(); // Actualiza el saldo después de la recarga
    } catch (error) {
      setTransactionSuccess(false);
      setErrorMessage(error.response?.data?.error || 'Error desconocido');
      setStep(6);
    }
  };

  const handleCancel = () => {
    setStep(1);
    setCompany('');
    setRecargaType('');
    setAmount('');
    setPhoneNumber('');
    setTransactionSuccess(null);
    setErrorMessage('');
  };

  const handleBack = () => {
    if (step > 1) {
      if (step === 2) {
        setCompany('');
      } else if (step === 3) {
        setRecargaType('');
      } else if (step === 4) {
        setAmount('');
      }
      setStep(step - 1);
    }
  };

  // Lógica para regresar al inicio tras finalizar una recarga
  useEffect(() => {
    if (step === 6 && transactionSuccess !== null) {
      window.addEventListener('popstate', handleCancel);
    }
  }, [step, transactionSuccess]);

  return (
    <Container>
      

      
      {step > 1 && step < 5 && (
        <FaArrowLeft 
          className="mb-3" 
          style={{ fontSize: '2em', cursor: 'pointer', color: '#0A74DA' }} 
          onClick={handleBack} 
        />
      )}

      <Row className="my-4">
        <Col>
          <h1 className="text-center" style={{ color: "#0A74DA" }}>
            {step === 1 && "Selecciona tu Compañía"}
            {step === 2 && `Selecciona el Tipo de Recarga para ${company}`}
            {step === 3 && `Selecciona el Monto para ${company} (${recargaType})`}
            {step === 4 && "Ingresa el Número de Teléfono"}
          </h1>
        </Col>
      </Row>

      {step === 1 && (
        <Row>
          {companies.map(company => (
            <Col xs={12} sm={6} md={4} className="mb-4" key={company.name}>
              <Card
                onClick={() => handleSelectCompany(company.name)}
                className="h-100"
                style={{
                  borderColor: "#d1d1d1",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Card.Body className="text-center">
                  <img 
                    src={company.logo} 
                    alt={company.name} 
                    style={{ width: '100%', maxWidth: '150px', marginBottom: '10px' }} 
                  />
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {step === 2 && (
        <Row>
          {recargaTypes.map(type => (
            <Col xs={12} sm={6} className="mb-4" key={type}>
              <Card
                onClick={() => handleSelectRecargaType(type)}
                className="h-100"
                style={{
                  borderColor: "#d1d1d1",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Card.Body className="text-center">
                  <Card.Title className="mt-3" style={{ color: '#0A74DA' }}>{type}</Card.Title>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {step === 3 && (
        <Row>
          {amounts.map(amount => (
            <Col xs={12} sm={6} md={4} className="mb-4" key={amount}>
              <Card
                onClick={() => handleSelectAmount(amount)}
                className="h-100"
                style={{
                  borderColor: "#d1d1d1",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Card.Body className="text-center">
                  <Card.Title className="mt-3" style={{ color: '#333' }}>${amount}</Card.Title>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {step === 4 && (
        <Row className="justify-content-center">
          <Col md={6}>
            <Card
              className="mb-4"
              style={{
                borderColor: "#d1d1d1",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)"
              }}
            >
              <Card.Body className="text-center">
                <input 
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="form-control form-control-lg"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  placeholder="Número de Teléfono"
                  style={{ borderColor: '#0A74DA', textAlign: 'center' }}
                  autoFocus
                />
                <Button 
                  variant="primary" 
                  className="mt-4"
                  onClick={handleConfirm}
                  style={{ backgroundColor: "#0A74DA", color: "#fff" }}
                  disabled={phoneNumber.length !== 10}
                >
                  Confirmar Recarga
                </Button>
                {errorMessage && <p className="text-danger mt-2">{errorMessage}</p>}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Mostrar los valores seleccionados en la parte inferior */}
      <Row className="fixed-bottom bg-light py-3">
        <Col xs={6} className="text-center">
          {/* Muestra el saldo disponible */}
          <h5 style={{ fontWeight: 'bold' }}>Saldo</h5>
          <p style={{ fontSize: '1.5em', color: '#0A74DA' }}>${saldo ? saldo.toFixed(2) : 'Cargando...'}</p>
        </Col>
        <Col xs={6} className="text-center">
          {/* Muestra las opciones seleccionadas */}
          <h5>
            {company && `Compañía: ${company}`} <br />
            {recargaType && `Tipo de Recarga: ${recargaType}`} <br />
            {amount && `Monto: $${amount}`} <br />
          </h5>
        </Col>
      </Row>

      {step === 6 && transactionSuccess !== null && (
        <Row className="justify-content-center">
          <Col md={8}>
            <Card
              className="mb-4"
              style={{
                borderColor: "#d1d1d1",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)"
              }}
            >
              <Card.Body className="text-center">
                {transactionSuccess ? (
                  <>
                    <FaCheckCircle style={{ fontSize: '4em', color: '#0A74DA' }} />
                    <h2 className="mt-3">Tu transacción fue un éxito</h2>
                  </>
                ) : (
                  <>
                    <FaTimesCircle style={{ fontSize: '4em', color: '#ff4d4d' }} />
                    <h2 className="mt-3">Tu transacción no fue realizada</h2>
                    <p>{errorMessage}</p>
                  </>
                )}
                <Button 
                  variant="outline-primary" 
                  className="mr-3 mt-4"
                  onClick={handleCancel}
                  style={{ color: "#0A74DA", borderColor: "#0A74DA" }}
                >
                  Volver al inicio
                </Button>
                <Button 
                  variant="primary" 
                  className="mt-4"
                  onClick={handleCancel}
                  style={{ backgroundColor: "#0A74DA", color: "#fff" }}
                >
                  Realizar otra recarga
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default HacerRecarga;

