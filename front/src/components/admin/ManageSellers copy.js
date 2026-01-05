import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Row, Col, Alert, InputGroup, FormControl, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaCheck, FaTimes, FaPlus, FaDollarSign } from 'react-icons/fa';
import axios from 'axios';
import './ToggleSwitch.css';
import { useNavigate } from 'react-router-dom';

const ToggleSwitch = ({ id, checked, onChange }) => {
  return (
    <label className="switch">
      <input type="checkbox" id={id} checked={checked} onChange={onChange} />
      <span className="slider round"></span>
    </label>
  );
};

const ManageSellers= () => {
  const [users, setUsers] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [nombres_apellidos, setNombresApellidos] = useState('');
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('+52');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showSaldoModal, setShowSaldoModal] = useState(false);
  const [valor, setValor] = useState('');
  const [porcentaje, setPorcentaje] = useState(4); // Por defecto 4
  const navigate = useNavigate();

  const navigateToRecargasHechas = (user) => {
    navigate(`/admin/saldo-acreditado/${user}`);
  };
  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await api.get('/admin/obtener-vendedor', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error al obtener los usuarios', error);
    }
  };

  useEffect(() => {
    fetchUsers();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
        },
        (error) => {
          console.error('Error al obtener la geolocalización', error);
        }
      );
    } else {
      console.error('La geolocalización no es soportada por este navegador.');
    }
  }, []);

  const handleDelete = async (userId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`https://www.recargacreditos.com.mx/api/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUsers(users.filter(user => user.usuario.id !== userId));
    } catch (error) {
      console.error('Error al eliminar el usuario', error);
    }
  };

  const handleAcreditarSaldo = async () => {
    const token = localStorage.getItem('token');
  
    try {
      const response = await axios.post(
        `https://www.recargacreditos.com.mx/api/admin/acreditar-saldo2/${selectedUser.usuario.correo}`,
        {
          valor: parseFloat(valor),
          porcentaje: parseFloat(porcentaje),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      setMessage({ type: 'success', text: 'Saldo acreditado exitosamente' });
      setShowSaldoModal(false);
      
      // Actualiza el saldo del usuario después de acreditar
      
      
    } catch (error) {
      setMessage({ type: 'error', text: 'No se pudo acreditar el saldo' });
      console.error('Error al acreditar el saldo', error);
    }
    fetchUsers();
  };
  

  const handleCreateUser = async () => {
    const celular = `${countryCode}${phoneNumber}`;
    const token = localStorage.getItem('token');

    if (latitude && longitude) {
      try {
        await axios.post(
          'https://www.recargacreditos.com.mx/api/admin/crear-vendedor',
          {
            correo: email,
            contrasenia: celular, // Usamos el número de celular como contraseña
            celular: celular,
            nombres_apellidos: nombres_apellidos,
            dni:dni,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setMessage({ type: 'success', text: 'Usuario creado exitosamente' });
        setShowModal(false);
        setEmail('');
        setPassword(''); // Reseteamos también la contraseña en el formulario
        setCountryCode('+52');
        setPhoneNumber('');
        setNombresApellidos('');
        setDni('');
        const response = await axios.get('https://www.recargacreditos.com.mx/api/admin/obtener-vendedor', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUsers(response.data);
      } catch (error) {
        setMessage({ type: 'error', text: 'No se pudo crear el usuario' });
        console.error('Error al crear el usuario', error);
      }
    } else {
      setMessage({ type: 'error', text: 'No se pudo obtener la geolocalización.' });
      console.error('No se pudo obtener la geolocalización.');
    }

    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 5000);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleToggle = async (index, field) => {
    const token = localStorage.getItem('token');
    const user = users[index];
    const previousState = { ...user }; 
  
    try {
      user.usuario[field] = !user.usuario[field];
      setUsers([...users]);
  
      await axios.put(
        `https://www.recargacreditos.com.mx/api/admin/editar-tienda2/${user.usuario.correo}`, 
        {
          [field]: user.usuario[field], 
        },
        {
          headers: {
            Authorization: `Bearer ${token}`, 
          },
        }
      );
  
      setMessage({ type: 'success', text: `El campo ${field} ha sido actualizado` });
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);
  
    } catch (error) {
      setUsers(prevUsers => {
        prevUsers[index] = previousState;
        return [...prevUsers];
      });
      setMessage({ type: 'error', text: `No se pudo actualizar el campo ${field}` });
      console.error(`Error al actualizar el campo ${field}`, error);
    }
  };

  const handleSave = async (index) => {
    const token = localStorage.getItem('token');
    const user = users[index];
  
    try {
      await axios.put(
        `https://www.recargacreditos.com.mx/api/admin/editar-tienda2/${user.usuario.correo}`, 
        {
          latitud: user.latitud, 
          longitud: user.longitudes,
          correo: user.usuario.correo,
          nombres_apellidos: user.usuario.nombres_apellidos,
          dni: user.usuario.dni,
          celular: user.usuario.celular,    
          verificado: user.usuario.verificado,
          activo: user.usuario.activo,
          cupo: parseFloat(user.cupo)  // Asegura que cupo está referenciado correctamente
        },
        {
          headers: {
            Authorization: `Bearer ${token}`, 
          },
        }
      );
  
      setEditingIndex(null);
      setMessage({ type: 'success', text: 'Usuario y tienda actualizados exitosamente' });
  
      const response = await axios.get('https://www.recargacreditos.com.mx/api/admin/obtener-vendedor', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUsers(response.data);
  
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);
  
    } catch (error) {
      setMessage({ type: 'error', text: 'No se pudo actualizar el usuario y tienda' });
      console.error('Error al actualizar el usuario y tienda', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setPassword('');
  };

  const handleShowSaldoModal = (user) => {
    setSelectedUser(user);
    setShowSaldoModal(true);
  };

  const handleCloseSaldoModal = () => {
    setSelectedUser(null);
    setShowSaldoModal(false);
  };

  const filteredUsers = users.filter(user => {
    const emailMatch = user.usuario.correo ? user.usuario.correo.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const nameMatch = user.usuario.nombres_apellidos ? user.usuario.nombres_apellidos.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const dniMatch = user.usuario.dni ? user.usuario.dni.includes(searchTerm) : false;

    return emailMatch || nameMatch || dniMatch;
  });

  return (
    <Container>
      <Row className="my-4">
        <Col>
          <h1 className="text-center" style={{ color: '#0A74DA' }}>Gestionar Usuarios</h1>
        </Col>
        <Col className="text-right">
          <Button
            variant="primary"
            style={{ backgroundColor: '#0A74DA', color: '#fff' }}
            onClick={() => setShowModal(true)}
          >
            <FaCheck /> Nuevo
          </Button>
        </Col>
      </Row>

      {message.text && (
        <Alert variant={message.type === 'success' ? 'success' : 'danger'}>
          {message.text}
        </Alert>
      )}

      <InputGroup className="mb-3">
        <FormControl
          placeholder="Buscar por correo, nombre o cédula"
          onChange={handleSearch}
        />
      </InputGroup>

      <Table hover className="custom-table">
        <thead>
          <tr>
            <th>Correo</th>
            <th>Contraseña</th>
            <th>Teléfono</th>
            <th>Datos Adicionales</th>
            <th>Activo</th>
            <th>Cupo</th>
            <th>Saldo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user, index) => (
            <tr key={index} onDoubleClick={() => setEditingIndex(index)}>
              <td>
                {editingIndex === index ? (
                  <FormControl
                    type="text"
                    value={user.usuario.correo}
                    onChange={(e) => {
                      const newUsers = [...users];
                      newUsers[index].usuario.correo = e.target.value;
                      setUsers(newUsers);
                    }}
                  />
                ) : (
                  user.usuario.correo
                )}
              </td>
              <td>
                {editingIndex === index ? (
                  <FormControl
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                ) : (
                  '••••••••'
                )}
              </td>
              <td>
                {editingIndex === index ? (
                  <FormControl
                    type="text"
                    value={user.usuario.celular}
                    onChange={(e) => {
                      const newUsers = [...users];
                      newUsers[index].usuario.celular = e.target.value;
                      setUsers(newUsers);
                    }}
                  />
                ) : (
                  user.usuario.celular
                )}
              </td>
              <td>
                {user.usuario.nombres_apellidos ? `${user.usuario.nombres_apellidos} ${user.usuario.dni}` : 'N/A'}
              </td>
              <td>
                <ToggleSwitch
                  id={`activo-switch-${index}`}
                  checked={user.usuario.activo}
                  onChange={() => handleToggle(index, 'activo')}
                />
              </td>
              
              <td>
                {editingIndex === index ? (
                  <FormControl
                  type="text"
                  value={user.cupo}
                  onChange={(e) => {
                    const newUsers = [...users];
                    newUsers[index].cupo = e.target.value;
                    setUsers(newUsers);
                  }}
                  onKeyPress={(e) => {
                    if (!/^[0-9.]$/.test(e.key)) {
                      e.preventDefault(); // Previene la entrada de letras o símbolos
                    }
                  }}
                  style={{ width: editingIndex === index ? '70px' : 'auto' }} // Ajuste de ancho
                />
                ) : (
                  user.cupo
                )}
              </td>
                <td>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span>{user.saldo.toFixed(2)}</span>
                  
                </div>
              </td>
              <td>
             
                {editingIndex === index ? (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip id={`tooltip-confirm-${index}`}>Confirmar</Tooltip>}
                    >
                      <Button variant="success" onClick={() => handleSave(index)} style={{ padding: '5px 10px', fontSize: '14px', backgroundColor: '#7DCEA0', borderColor: '#7DCEA0', marginRight: '5px' }}>
                        <FaCheck />
                      </Button>
                    </OverlayTrigger>
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip id={`tooltip-cancel-${index}`}>Cancelar</Tooltip>}
                    >
                      <Button variant="danger" onClick={handleCancelEdit} style={{ padding: '5px 10px', fontSize: '14px', backgroundColor: '#F1948A', borderColor: '#F1948A' }}>
                        <FaTimes />
                      </Button>
                    </OverlayTrigger>
                  </div>
                ) :  
                  <div style={{ display: 'flex', alignItems: 'rigth', marginTop: '-px' }}>
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip id={`tooltip-agregar-saldo-${index}`}>Agregar saldo</Tooltip>}
                    >
                      <Button
                        variant="link"
                        onClick={() => handleShowSaldoModal(user)}
                        style={{ marginLeft: '-8px' }}
                      >
                        <FaPlus />
                      </Button>
                    </OverlayTrigger>
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip id={`tooltip-ver-recargas-${index}`}>Ver recargas hechas</Tooltip>}
                    >
                      <Button
                        variant="link"
                        onClick={() => navigateToRecargasHechas(user)} // Llama a una función que navegue al componente RecargasHechas
                        style={{ marginLeft: '0px' }} // Ajusta el margen según sea necesario
                      >
                        <FaDollarSign />
                      </Button>
                    </OverlayTrigger>
                  </div>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Modal para mostrar detalles de saldo */}
      <Modal show={showSaldoModal} onHide={handleCloseSaldoModal}>
  <Modal.Header closeButton>
    <Modal.Title>Detalles de Saldo</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {selectedUser ? (
      <div>
        <p><strong>Correo:</strong> {selectedUser.usuario.correo}</p>
        <p><strong>Saldo Actual:</strong> {selectedUser.saldo}</p>
        <Form>
          <Form.Group controlId="formValor">
            <Form.Label>Valor a acreditar</Form.Label>
            <Form.Control
              type="number"
              placeholder="Ingrese el valor"
              min="1"
              onChange={(e) => setValor(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group controlId="formPorcentaje">
            <Form.Label>Porcentaje (1-10)</Form.Label>
            <Form.Control
              type="number"
              placeholder="Ingrese el porcentaje"
              min="1"
              max="10"
              defaultValue={4}
              onChange={(e) => setPorcentaje(e.target.value)}
              required
            />
          </Form.Group>
        </Form>
      </div>
    ) : (
      <p>Cargando detalles...</p>
    )}
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={handleCloseSaldoModal}>
      Cerrar
    </Button>
    <Button variant="primary" onClick={handleAcreditarSaldo}>
      Acreditar Saldo
    </Button>
  </Modal.Footer>
</Modal>

      

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Agregar Nuevo Usuario Tienda</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formEmail">
              <Form.Label>Correo</Form.Label>
              <Form.Control
                type="email"
                placeholder="Ingresa el correo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group controlId="formEmail">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="Text"
                placeholder="Ingresa el nombre"
                value={nombres_apellidos}
                onChange={(e) => setNombresApellidos(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group controlId="formEmail">
              <Form.Label>DNI</Form.Label>
              <Form.Control
                type="Text"
                placeholder="Ingresa el DNI"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group controlId="formPhoneNumber">
              <Form.Label>Número de WhatsApp</Form.Label>
              <Row>
                <Col md={4}>
                  <Form.Control
                    as="select"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                  >
                    <option value="+52">🇲🇽 +52 México</option>
                    <option value="+1">🇺🇸 +1 USA</option>
                    <option value="+34">🇪🇸 +34 España</option>
                  </Form.Control>
                </Col>
                <Col md={8}>
                  <Form.Control
                    type="tel"
                    placeholder="Ingresa el número de teléfono"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </Col>
              </Row>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            style={{ backgroundColor: '#0A74DA', color: '#fff' }}
            onClick={handleCreateUser}
          >
            Crear Usuario
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .custom-table {
          border-collapse: collapse;
          width: 100%;
        }
        .custom-table thead th {
          border-bottom: 1px solid #ddd;
        }
        .custom-table tbody tr {
          transition: background-color 0.3s ease;
        }
        .custom-table tbody tr:hover {
          background-color: #f1f1f1;
        }
        .custom-table tbody tr:nth-child(odd) {
          background-color: #f9f9f9;
        }
        .custom-table tbody tr:nth-child(even) {
          background-color: #ffffff;
        }
        .custom-table td, .custom-table th {
          border: none;
          padding: 12px 15px;
        }
      `}</style>
    </Container>
  );
};

export default ManageSellers;
