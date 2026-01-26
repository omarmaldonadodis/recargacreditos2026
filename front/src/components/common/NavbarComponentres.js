import React, { useContext, useEffect, useState } from "react";
import { Navbar, Nav, Container, Image, Button, Modal } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext"; // Importar el contexto de autenticación
import axios from "axios";
import logo from "../../assets/recargacreditos-02.svg";
import { XMLParser } from "fast-xml-parser"; // Importar fast-xml-parser
import api from "../../services/axiosConfig";

import ReCAPTCHA from "react-google-recaptcha"; // Importa el componente reCAPTCHA


const NavbarComponent = () => {
  const { user, logout, updateUserRole } = useContext(AuthContext); // Obtener updateUserRole del contexto
  const [saldo, setSaldo] = useState(null);
  const [pendiente, setPendiente] = useState(null);
  const [promedioVentaSemanal, setPromedioVentaSemanal] = useState(null);
  const [cupo, setCupo] = useState(null);
  const [show, setShow] = useState(false); // Menú oculto por defecto
  const [historialExpanded, setHistorialExpanded] = useState(false); // Estado para el submenú de historial
  const location = useLocation(); // Para obtener la ruta actual
  const navigate = useNavigate(); // Para redirigir
  const token = localStorage.getItem("token");
  const tokenAdmin = localStorage.getItem("token_admin"); // Verificar si hay token de administrador
  const [saldoGestopagos, setSaldoGestopagos] = useState(null); // Saldo Gestopagos (XML)
  const [saldoMovistar, setSaldoMovistar] = useState(null); // Saldo Movistar (XML)
  const [captchaToken, setCaptchaToken] = useState(null); // Para almacenar el token de reCAPTCHA
  const [showCaptchaModal, setShowCaptchaModal] = useState(false); // Controla el modal de reCAPTCHA
  
  // Escuchar cambios en el usuario (rol)
  useEffect(() => {
    if (user) {
      setShow(false);
      if (user.rol === "administrador") {
        // Obtener los saldos si el usuario es administrador
        obtenerSaldoMovistar();
        obtenerSaldoGestopagos();
      }
    }
    fetchUserName();
  }, [user]);

   // Función para abrir el modal de CAPTCHA
   const handleLogoutClick = () => {
    logout();

    //setShowCaptchaModal(true); // Muestra el modal cuando el usuario intenta cerrar sesión
  };

  // Maneja el cambio en el valor de CAPTCHA
  const onCaptchaChange = (value) => {
    setCaptchaToken(value); // Almacena el token de reCAPTCHA
      // Aquí puedes llamar a tu función de logout automáticamente
      handleLogout();

      // Cierra el modal después de completar el captcha
      setShowCaptchaModal(false);
  };

  // Función para verificar el CAPTCHA y luego realizar el logout
  const handleCaptchaSubmit = async () => {
    if (!captchaToken) {
      alert("Por favor, completa el CAPTCHA");
      return;
    } else {
      logout();
      setShowCaptchaModal(false); // Cierra el modal
      setShow(false);
    } 

  
  };

    const [userName, setUserName] = useState("");
  
    // Obtener el nombre del usuario desde el token
    const fetchUserName = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setUserName("Usuario");
        return;
      }
  
      try {
        // Decodificar el payload del token usando una función compatible con UTF-8
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


  // Función para obtener saldo de Gestopagos (externo - XML)
  const obtenerSaldoGestopagos = async () => {
    try {
      const response = await axios.post(
        "https://gestopago.portalventas.net/sistema/service/getSaldo.do",
        "idDistribuidor=2611&codigoDispositivo=GPS2611-TPV-02&password=2611eg",
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      // Convertir la respuesta XML a JSON usando fast-xml-parser
      const parser = new XMLParser();
      const result = parser.parse(response.data);
      const saldo = result?.RESPONSE?.SALDO;
      setSaldoGestopagos(parseFloat(saldo));
    } catch (error) {
      console.error("Error al obtener el saldo de Gestopagos:", error);
    }
  };

  // Función para obtener saldo de Movistar (externo - XML)
  const obtenerSaldoMovistar = async () => {
    try {
      const response = await axios.post(
        "https://gestopago.portalventas.net/sistema/service/getSaldo.do",
        "idDistribuidor=2612&codigoDispositivo=GPS2612-TPV-02&password=eg2612",
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      // Convertir la respuesta XML a JSON usando fast-xml-parser
      const parser = new XMLParser();
      const result = parser.parse(response.data);
      const saldo = result?.RESPONSE?.SALDO;
      setSaldoMovistar(parseFloat(saldo));
    } catch (error) {
      console.error("Error al obtener el saldo de Movistar", error);
    }
  };

  // Función para alternar el estado del menú y hacer la solicitud a la API
  const toggleMenu = () => {
    setShow(!show); // Alterna el estado del menú al hacer clic

    if (!show && user && user.rol === "tienda") {
      // Solo realiza la solicitud si el menú se está abriendo y el rol es tienda
      axios
        .get("https://www.recargacreditos.com.mx/api/tiendas/solo-credito", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          setSaldo(response.data.saldo_disponible);
          setCupo(response.data.cupo);
          setPromedioVentaSemanal(response.data.promedioSemanal);
          setPendiente(response.data.credito); // Actualización para "crédito"
        })
        .catch((error) => {
          console.error("Error al obtener saldo y cupo:", error);
        });
    }

    if (!show && user && user.rol === "vendedor") {
      // Solo realiza la solicitud si el menú se está abriendo y el rol es vendedor
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

  const toggleHistorial = () => {
    setHistorialExpanded(!historialExpanded); // Alterna el submenú de historial
  };

  const  handleLogout = () => {
    logout();
  };

  

  // Función para volver como administrador
  const returnAsAdmin = () => {
    if (tokenAdmin) {
      updateUserRole(tokenAdmin); // Volver a usar el token del administrador
      localStorage.removeItem("token_admin"); // Eliminar el token de vendedor
      navigate("/admin/dashboard"); // Redirigir al dashboard del administrador
    }
  };

  const isActive = (path) => location.pathname === path; // Función para verificar la ruta activa

  const renderMenuOptions = () => {
    if (!user) return null;

    if (user.rol === "tienda") {
      return (
        <>
          <Nav.Link disabled>
            {userName}
          </Nav.Link>{" "}
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
          </Nav.Link>{" "}
          {/* Mostrando el crédito */}
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
          {/*<Nav.Link disabled>Saldo por pagar ${saldo?.toFixed(2)}</Nav.Link>{" "}*/}
          <Nav.Link
            href="/vendedor/historial"
            className={isActive("/vendedor/historial") ? "active" : ""}
          >
            Historial
          </Nav.Link>
          {/* <Nav.Link
            href="/vendedor/saldos"
            className={isActive("/vendedor/saldos") ? "active" : ""}
          >
            Pagos
          </Nav.Link> */}

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
    <Navbar
      style={{ backgroundColor: "#009bdc" }}
      variant="dark"
      expand={false}
      className="custom-navbar"
      

    >
      <Container fluid className="d-flex align-items-left justify-content-between">
        {/* Logotipo */}
        <Navbar.Brand href="/" className="navbar-brand-left">
          <Image
            src={logo}
            height="30"
            className="d-inline-block align-top"
            alt="Logotipo"
          />
        </Navbar.Brand>

        {/* Botón de menú */}
        <Button
          variant="outline-light"
          onClick={toggleMenu}
          className="menu-button"
        >
          &#9776; {/* Ícono de sándwich */}
        </Button>
      </Container>

      {/* Botón "Volver como Administrador" y saldos */}
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
            <div className="saldos">
              General: ${saldoGestopagos?.toFixed(2)} / Movistar: $
              {saldoMovistar?.toFixed(2)}
            </div>
          )}
        </div>
      )}

      {/* Menú desplegable */}
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


      {/* CSS adicional para el estilo */}
      <style>{`
        .custom-navbar {
          min-height: 60px;
         
          
        }

        .navbar-brand-center {
          margin: 0 auto;
          left:400px;
          

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

        .saldos {
          color: white;
          font-size: 14px;
          text-align: center;
          white-space: nowrap;
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
            margin-right: 0px;
            top: 10px;
          }

          .saldos {
            text-align: center;
        
            top: 16px;
          }
        }

        @media (max-width: 768px) {
          .admin-elements {
            position: static;
            padding: 0px 15px ;
          }

          .saldos {
            text-align: right;
            padding: 0px 0px ;
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
          color: red;
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
  );
};

export default NavbarComponent;
