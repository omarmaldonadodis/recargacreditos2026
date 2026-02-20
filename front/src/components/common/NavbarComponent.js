import React, { useContext, useEffect, useState, useMemo } from "react";
import { Navbar, Nav, Container, Image, Button, Badge } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import axios from "axios";
import logo from "../../assets/recargacreditos-02.svg";
import { XMLParser } from "fast-xml-parser";
import IncrementosModal from "./Incrementosmodal";
import useIncrementosNotificaciones from "../../hooks/useIncrementosNotificaciones";

const NavbarComponent = () => {
  const { user, logout, updateUserRole } = useContext(AuthContext);

  // ⭐ Memorizar estado de admin para evitar re-renders
  const isAdmin = useMemo(() => user?.rol === "administrador", [user?.rol]);
  const [saldo, setSaldo] = useState(null);
  const [pendiente, setPendiente] = useState(null);
  const [promedioVentaSemanal, setPromedioVentaSemanal] = useState(null);
  const [cupo, setCupo] = useState(null);
  const [show, setShow] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const tokenAdmin = localStorage.getItem("token_admin");
  const [saldoGestopagos, setSaldoGestopagos] = useState(null);
  const [saldoMovistar, setSaldoMovistar] = useState(null);
  
  // Estados para modal de incrementos
  const [showIncrementosModal, setShowIncrementosModal] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState('general');
  const [userName, setUserName] = useState("");

  // ============= USAR HOOK DE NOTIFICACIONES =============
  const {
    notificacionesGeneral,
    notificacionesMovistar,
    totalNotificaciones,
    refetch: refetchNotificaciones
  } = useIncrementosNotificaciones(
    isAdmin, // ⭐ Usar el valor memoizado
    30000
  );
  useEffect(() => {
    if (user) {
      setShow(false);
      if (user.rol === "administrador") {
        obtenerSaldoMovistar();
        obtenerSaldoGestopagos();
      }
    }
    fetchUserName();
  }, [user]);

  const handleOpenIncrementosModal = (proveedor) => {
    setProveedorSeleccionado(proveedor);
    setShowIncrementosModal(true);
  };

  const handleCloseIncrementosModal = () => {
    setShowIncrementosModal(false);
    refetchNotificaciones(); // Recargar notificaciones al cerrar
  };

  const handleLogoutClick = () => {
    logout();
  };

  const fetchUserName = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUserName("Usuario");
      return;
    }

    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );

      const decodedToken = JSON.parse(jsonPayload);
      const nombre = decodedToken.nombre_tienda;
      setUserName(nombre || "Usuario");
    } catch (error) {
      console.error("Error al decodificar el token:", error);
      setUserName("Usuario");
    }
  };

  const obtenerSaldoGestopagos = async () => {
    try {
      const response = await axios.post(
        "https://gestopago.portalventas.net/sistema/service/getSaldo.do",
        "idDistribuidor=2611&codigoDispositivo=GPS2611-TPV-02&password=2611eg",
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const parser = new XMLParser();
      const result = parser.parse(response.data);
      const saldo = result?.RESPONSE?.SALDO;
      setSaldoGestopagos(parseFloat(saldo));
    } catch (error) {
      console.error("Error al obtener el saldo de Gestopagos:", error);
    }
  };

  const obtenerSaldoMovistar = async () => {
    try {
      const response = await axios.post(
        "https://gestopago.portalventas.net/sistema/service/getSaldo.do",
        "idDistribuidor=2612&codigoDispositivo=GPS2612-TPV-02&password=eg2612",
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const parser = new XMLParser();
      const result = parser.parse(response.data);
      const saldo = result?.RESPONSE?.SALDO;
      setSaldoMovistar(parseFloat(saldo));
    } catch (error) {
      console.error("Error al obtener el saldo de Movistar", error);
    }
  };

  const toggleMenu = () => {
    setShow(!show);

    if (!show && user && user.rol === "tienda") {
      axios
        .get("https://www.recargacreditos.com.mx/api/tiendas/solo-credito", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          setSaldo(response.data.saldo_disponible);
          setCupo(response.data.cupo);
          setPromedioVentaSemanal(response.data.promedioSemanal);
          setPendiente(response.data.credito);
        })
        .catch((error) => {
          console.error("Error al obtener saldo y cupo:", error);
        });
    }

    if (!show && user && user.rol === "vendedor") {
      axios
        .get("https://www.recargacreditos.com.mx/api/admin/adeudado", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          setSaldo(response.data.adeudado);
        })
        .catch((error) => {
          console.error("Error al obtener saldo y cupo:", error);
        });
    }
  };

  const returnAsAdmin = () => {
    if (tokenAdmin) {
      updateUserRole(tokenAdmin);
      localStorage.removeItem("token_admin");
      navigate("/admin/dashboard");
    }
  };

  const isActive = (path) => location.pathname === path;

  const renderMenuOptions = () => {
    if (!user) return null;

    if (user.rol === "tienda") {
      return (
        <>
          <Nav.Link disabled>{userName}</Nav.Link>
          <Nav.Link
            href="/tienda/hacer-recarga"
            className={
              isActive("/tienda/hacer-recarga") || isActive("/") ? "active" : ""
            }
          >
            Recargas
          </Nav.Link>
          <Nav.Link disabled>
            Saldo pendiente por pagar ${pendiente?.toFixed(2)}
          </Nav.Link>
          <Nav.Link
            href="/tienda/ventas"
            className={isActive("/tienda/ventas") ? "active" : ""}
          >
            Historial de recargas
          </Nav.Link>
          <Nav.Link
            href="/tienda/saldos"
            className={isActive("/tienda/saldos") ? "active" : ""}
          >
            Pagos
          </Nav.Link>
          <Nav.Link disabled>
            Venta semanal promedio: ${promedioVentaSemanal?.toFixed(2)}
          </Nav.Link>
          <Nav.Link
            href="/tienda/configuracion"
            className={isActive("/tienda/configuracion") ? "active" : ""}
          >
            Configuración
          </Nav.Link>
        </>
      );
    } else if (user.rol === "vendedor") {
      return (
        <>
          <Nav.Link
            href="/vendedor/users"
            className={
              isActive("/vendedor/users") || isActive("/") ? "active" : ""
            }
          >
            Tiendas
          </Nav.Link>
          <Nav.Link
            href="/vendedor/historial"
            className={isActive("/vendedor/historial") ? "active" : ""}
          >
            Historial
          </Nav.Link>
          <Nav.Link
            href="/vendedor/hacer-recarga"
            className={isActive("/vendedor/hacer-recarga") ? "active" : ""}
          >
            Recargas
          </Nav.Link>
          <Nav.Link
            href="/vendedor/configuracion"
            className={isActive("/vendedor/configuracion") ? "active" : ""}
          >
            Configuración
          </Nav.Link>
        </>
      );
    } else if (user.rol === "administrador") {
      return (
        <>
          <Nav.Link href="/" className={isActive("/") ? "active" : ""}>
            Vendedores
          </Nav.Link>
          <Nav.Link
            href="/admin/historial"
            className={isActive("/admin/historial") ? "active" : ""}
          >
            Historial
          </Nav.Link>
          <Nav.Link
            href="/admin/users"
            className={isActive("/admin/users") ? "active" : ""}
          >
            Tiendas
          </Nav.Link>
          <Nav.Link
            href="/admin/configuracion"
            className={isActive("/admin/configuracion") ? "active" : ""}
          >
            Configuración
          </Nav.Link>
        </>
      );
    }
  };

  if (!user) return null;

  return (
    <>
      <Navbar
        style={{ backgroundColor: "#009bdc" }}
        variant="dark"
        expand={false}
        className="custom-navbar"
      >
        <Container fluid className="d-flex align-items-left justify-content-between">
          <Navbar.Brand href="/" className="navbar-brand-left">
            <Image
              src={logo}
              height="30"
              className="d-inline-block align-top"
              alt="Logotipo"
            />
          </Navbar.Brand>

          <Button
            variant="outline-light"
            onClick={toggleMenu}
            className="menu-button"
          >
            &#9776;
          </Button>
        </Container>

        {(tokenAdmin || user.rol === "administrador") && (
          <div className="admin-elements">
            {tokenAdmin && (
              <Button
                variant="warning"
                onClick={() => {
                  returnAsAdmin();
                  setShow(false);
                }}
                className="volver-admin-button"
              >
                Volver como Administrador
              </Button>
            )}

            {user.rol === "administrador" && (
              <div className="saldos-container">
                {/* Saldo General con notificación */}
                <div 
                  className="saldo-item" 
                  onClick={() => handleOpenIncrementosModal('general')}
                  title={notificacionesGeneral > 0 ? `${notificacionesGeneral} incremento(s) pendiente(s)` : "Click para gestionar"}
                >
                  <span className="saldo-label">General:</span>
                  <span className="saldo-amount">${saldoGestopagos?.toFixed(2)}</span>
                  {notificacionesGeneral > 0 && (
                    <Badge bg="danger" pill className="notification-badge">
                      {notificacionesGeneral}
                    </Badge>
                  )}
                </div>
                
                <span className="separator">/</span>
                
                {/* Saldo Movistar con notificación */}
                <div 
                  className="saldo-item"
                  onClick={() => handleOpenIncrementosModal('movistar')}
                  title={notificacionesMovistar > 0 ? `${notificacionesMovistar} incremento(s) pendiente(s)` : "Click para gestionar"}
                >
                  <span className="saldo-label">Movistar:</span>
                  <span className="saldo-amount">${saldoMovistar?.toFixed(2)}</span>
                  {notificacionesMovistar > 0 && (
                    <Badge bg="danger" pill className="notification-badge">
                      {notificacionesMovistar}
                    </Badge>
                  )}
                </div>

                {/* Badge total si hay notificaciones */}
                {totalNotificaciones > 0 && (
                  <Badge 
                    bg="warning" 
                    text="dark"
                    className="ms-2"
                    style={{ 
                      fontSize: '0.9rem',
                      animation: 'bounce 1s infinite'
                    }}
                  >
                    {totalNotificaciones} pendientes
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {show && (
          <div
            className="menu-dropdown-modern"
            style={{
              position: "absolute",
              top: "60px",
              right: "0",
              padding: "15px",
              borderRadius: "10px",
              zIndex: 1001,
              width: "220px",
              backgroundColor: "#ffffff",
              boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Nav className="flex-column modern-menu-options">
              {renderMenuOptions()}
              <Nav.Link onClick={handleLogoutClick} className="logout-link">
                Cerrar Sesión
              </Nav.Link>
            </Nav>
          </div>
        )}

        <style>{`
          .custom-navbar {
            min-height: 60px;
          }

          .menu-button {
            position: absolute;
            right: 10px;
          }

          .admin-elements {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 10px;
          }

          .volver-admin-button {
            margin-bottom: 5px;
          }

          .saldos-container {
            display: flex;
            align-items: center;
            gap: 10px;
            color: white;
            font-size: 14px;
            white-space: nowrap;
          }

          .saldo-item {
            position: relative;
            padding: 8px 12px;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            cursor: pointer;
          }

          .saldo-item:hover {
            background-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          }

          .saldo-label {
            font-weight: 500;
          }

          .saldo-amount {
            font-weight: bold;
            font-size: 0.9em;
          }

          .separator {
            color: rgba(255, 255, 255, 0.5);
            font-size: 1.2em;
          }

          .notification-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            font-size: 0.75rem;
            box-shadow: 0 0 10px rgba(220, 53, 69, 0.8);
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.8;
            }
          }

          @keyframes bounce {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-3px);
            }
          }

          @media (min-width: 769px) {
            .admin-elements {
              flex-direction: row;
              position: absolute;
              right: 70px;
              margin-top: 0;
            }

            .volver-admin-button {
              margin-bottom: 0;
              margin-right: 10px;
            }
          }

          @media (max-width: 768px) {
            .admin-elements {
              position: static;
              padding: 0px 15px;
            }

            .saldos-container {
              flex-wrap: wrap;
              justify-content: center;
            }

            .saldo-item {
              font-size: 12px;
              padding: 6px 10px;
            }
          }

          .menu-dropdown-modern {
            animation: fadeIn 0.3s ease;
          }

          .modern-menu-options .nav-link {
            padding: 10px;
            margin: 5px 0;
            background-color: #009bdc;
            border-radius: 5px;
            transition: background-color 0.2s ease;
            color: #ffffff !important;
          }

          .modern-menu-options .nav-link.active {
            background-color: #ff7700;
          }

          .modern-menu-options .nav-link:hover {
            background-color: #222222;
          }

          .logout-link {
            color: red !important;
            font-weight: bold;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}</style>
      </Navbar>

      {/* Modal de Incrementos */}
      <IncrementosModal
        show={showIncrementosModal}
        handleClose={handleCloseIncrementosModal}
        proveedor={proveedorSeleccionado}
      />
    </>
  );
};

export default NavbarComponent;