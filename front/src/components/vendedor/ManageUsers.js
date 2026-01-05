import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Table,
  Button,
  Modal,
  Form,
  Row,
  Col,
  OverlayTrigger,
  Tooltip,
  Alert,
  InputGroup,
  FormControl,
  ButtonGroup,
} from "react-bootstrap";
import {
  FaTimes,
  FaAddressBook,
  FaCheck,
  FaDollarSign,
  FaPlus,
} from "react-icons/fa";
import axios from "axios";
import "./ToggleSwitch.css";
import { useNavigate } from "react-router-dom";
import api from "../../services/axiosConfig";
import SaldoAcreditado from "../admin/SaldoAcreditado";
import ExcelJS from "exceljs";
import FileSaver from "file-saver";
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

// ToggleSwitch component
const ToggleSwitch = ({ id, checked, onChange }) => {
  return (
    <label className="switch">
      <input type="checkbox" id={id} checked={!checked} onChange={onChange} />
      <span className="slider round"></span>
    </label>
  );
};

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [originalStates, setOriginalStates] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+52");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [userName, setUserName] = useState("");
  const [abonoValues, setAbonoValues] = useState({});
  const [saldoValues, setSaldoValues] = useState({});
  const abonoInputRefs = useRef({});
  const saldoInputRefs = useRef({});
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false); // Para el modal de confirmación
  const [confirmAction, setConfirmAction] = useState({
    nombre_tienda: "",
    id: "",
    activar: false,
  });
  const [nombreTienda, setNombreTienda] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Para el modal de éxito
  const [modalMessage, setModalMessage] = useState(""); // El mensaje que se mostrará en el modal
  const [isProcessing, setIsProcessing] = useState(false);

    const [sortedField, setSortedField] = useState({
    field: null,
    direction: "asc",
  });
  // Función para obtener usuarios desde el backend
  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(
        "https://www.recargacreditos.com.mx/api/admin/obtener-tiendas/usuario",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const usuariosActivos = response.data.filter(
        (item) => item.usuario && !item.usuario.eliminado
      );

      setUsers(response.data);
      setTotalUsers(usuariosActivos.length);
    } catch (error) {
      console.error("Error al obtener los usuarios", error);
    }
  };

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
      const nombre = decodedToken.nombres_apellidos;
      setUserName(nombre || "Usuario");
    } catch (error) {
      console.error("Error al decodificar el token:", error);
      setUserName("Usuario");
    }
  };

  // Obtener la ubicación (latitud y longitud) del navegador
  const fetchGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
        },
        (error) => {
          console.error("Error al obtener la geolocalización", error);
        }
      );
    } else {
      console.error("La geolocalización no es soportada por este navegador.");
    }
  };

  useEffect(() => {
    if (!showModal) {
      setNombreTienda("");
      setPhoneNumber("");
      setCountryCode("+52");
      setMessage({ type: "", text: "" });
    }
  }, [showModal]);

  useEffect(() => {
    fetchUsers();
    fetchUserName();
    fetchGeolocation(); // Obtener geolocalización al cargar el componente
  }, []);

  // Función para restaurar el estado activo original
  const restoreOriginalState = (id) => {
    const restoredActivo = originalStates[id];
    if (restoredActivo !== undefined) {
      updateUserState(id, restoredActivo); // Restaurar el estado original
    }
    setSelectedId(null);
  };

  const updateUserState = async (id, activo) => {
    const token = localStorage.getItem("token");
    try {
      await api.put(
        `/admin/editar-tienda2/${id}`,
        { activo },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error("Error al actualizar el estado del usuario", error);
    }
  };

  const handleFieldClick = (id, user) => {
    const isSelected = selectedId === id;

    if (selectedId && selectedId !== id) {
      // Restaurar el estado del usuario previamente seleccionado
      const previousUser = users.find((u) => u.usuario.id === selectedId);
      if (previousUser) {
        restoreOriginalState(previousUser.usuario.id);
      }
    }

    const originalActivo = user.usuario.activo;

    if (!isSelected) {
      setOriginalStates((prevState) => ({
        ...prevState,
        [id]: originalActivo,
      }));
      setSelectedId(id);
      updateUserState(user.usuario.id, false); // Desactivar temporalmente mientras se selecciona
    }
  };

  // Manejar el clic en el ToggleSwitch
  const handleToggle = (nombre_tienda, id, currentState) => {
    if (selectedId === id) {
      restoreOriginalState(id); // Deselecciona la fila si está seleccionada
    }
    setConfirmAction({ nombre_tienda, id, activar: !currentState }); // Cambiar el estado al opuesto
    setShowConfirmModal(true); // Mostrar modal para confirmación
  };

  // Función para confirmar la acción en el modal
  const confirmToggleAction = async () => {
    const { id, activar } = confirmAction;
    await updateUserState(id, activar); // Actualizar el estado en la base de datos
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.usuario.id === id
          ? { ...user, usuario: { ...user.usuario, activo: activar } }
          : user
      )
    );
    setShowConfirmModal(false); // Cerrar modal de confirmación
  };

  // Función para manejar clics fuera de la fila seleccionada
  const handleClickOutside = (event) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(event.target) &&
      selectedId !== null
    ) {
      const user = users.find((user) => user.usuario.id === selectedId);
      if (user) {
        restoreOriginalState(user.usuario.id); // Restaurar el estado al hacer clic fuera
      }
    }
  };

  const handleBeforeUnload = (event) => {
    if (selectedId !== null) {
      const user = users.find((user) => user.usuario.id === selectedId);
      if (user) {
        restoreOriginalState(user.usuario.id); // Restaurar estado al cerrar la página
      }
    }
  };

  useEffect(() => {
    window.addEventListener("click", handleClickOutside);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [selectedId, originalStates]); // Asegúrate de que los efectos dependan de los estados correctos

  // Función para evitar que se active la lógica de clic cuando interactúas con los botones internos
  const handleButtonClick = (e, id, route) => {
    e.stopPropagation(); // Detener propagación para que no afecte la selección de la fila
    restoreOriginalState(id); // Restaurar el estado antes de navegar
    setTimeout(() => {
      navigate(route); // Navegar al enlace configurado después de restaurar el estado
    }, 0); // Asegurarse de que el estado se restaure antes de navegar
  };

  const handleAbonoChange = (id, value) => {
    // Permite solo un "-" al inicio
    value = value.replace(/(?!^)-/g, "");
  
    // Permite solo un "." y elimina cualquier punto adicional
    const parts = value.split(".");
    if (parts.length > 2) {
      value = parts[0] + "." + parts.slice(1).join("").replace(/\./g, "");
    }
  
    // Limita a dos decimales si ya se han ingresado dos dígitos después del punto
    value = value.replace(/^(-?\d*\.\d{2}).*$/, "$1");
  
    // Valida el formato: dígitos opcionales, un punto opcional y más dígitos
    const regex = /^-?\d*\.?\d*$/;
    if (!regex.test(value)) {
      value = value.replace(/[^0-9.-]/g, "");
    }
  
    // Solo convierte a número si el valor no es "-" ni termina en "."
    // De lo contrario, se mantiene como string para preservar el formato ingresado.
    const processedValue =
      value === "-" || value.endsWith(".") ? value : value;
  
    setAbonoValues((prevState) => ({
      ...prevState,
      [id]: processedValue,
    }));
  };
  
  


  const handleSaldoChange = (id, value) => {
  
    // Permite solo un "-" al inicio
    value = value.replace(/(?!^)-/g, "");
  
    // Permite solo un "." para los decimales
    const parts = value.split(".");
    if (parts.length > 2) {
      value = parts[0] + "." + parts.slice(1).join("").replace(/\./g, "");
    }
  
    // Limita a dos decimales si ya se tienen dos dígitos después del punto
    value = value.replace(/^(-?\d*\.\d{2}).*$/, "$1");
  
    // Permite solo números, un "-" al inicio y un solo "."
    if (!/^(-?\d+(\.\d{0,2})?)?$/.test(value)) {
      value = value.replace(/[^0-9.-]/g, "");
    }
  
    // Aquí, en lugar de convertir inmediatamente a número,
    // se guarda el valor como string para mantener el punto decimal visible.
    setSaldoValues((prevState) => ({
      ...prevState,
      [id]: value,
    }));
  };
  

  const handleAcreditarAbono = async (id) => {
    if (isProcessing) return; // Evitar llamadas repetidas
    setIsProcessing(true);
    const token = localStorage.getItem("token");
    const valor = abonoValues[id];
    const valorFloat = parseFloat(valor);

    if (!isNaN(valor)) {
      try {
        const response = await api.post(
          `/admin/acreditar-saldo2/${id}`,
          {
            valor: valorFloat, // Abono en negativo
            credito: true,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const { tiendaSaldoActual, valorAdeudado } = response.data; // Extraer los valores de la respuesta

        // Actualizar el estado local para reflejar el nuevo saldo y pendiente
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.usuario.id === id
              ? {
                  ...user,
                  saldo: tiendaSaldoActual, // Mostrar tiendaSaldoActual como saldo
                  credito: valorAdeudado, // Mostrar valorAdeudado como pendiente
                }
              : user
          )
        );

       

        if (valor > 0) {
          showSuccessMessage(`${valor} abonado correctamente`); // Mostrar modal de éxito
        } else {
          showSuccessMessage(`${valor} descontados correctamente`); // Mostrar modal de éxito
        }

        setMessage({ type: "success", text: "Abono acreditado exitosamente" });
        setAbonoValues((prevState) => ({ ...prevState, [id]: "" }));
        //  restoreOriginalState(id);
      } catch (error) {
        setMessage({ type: "error", text: "No se pudo acreditar el abono" });
        console.error("Error al acreditar el abono", error);
      } finally {
        setIsProcessing(false); // Liberar bloqueo
      }
    }
  };

  const handleAcreditarSaldo = async (id) => {
    if (isProcessing) return; // Evitar llamadas repetidas
    setIsProcessing(true);
    const token = localStorage.getItem("token");
    const valor = saldoValues[id];
    const valorFloat = parseFloat(valor);
    if (!isNaN(valor)) {
      try {
        const response = await api.post(
          `/admin/acreditar-saldo2/${id}`,
          {
            valor: valorFloat,
            credito: false,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const { tiendaSaldoActual, valorAdeudado, saldoTotal } = response.data; // Extraer los valores de la respuesta
        // Actualizar el estado local para reflejar el nuevo saldo y pendiente
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.usuario.id === id
              ? {
                  ...user,
                  saldo: tiendaSaldoActual, // Mostrar tiendaSaldoActual como saldo
                  credito: valorAdeudado, // Mostrar valorAdeudado como pendiente
                  saldoTotal: saldoTotal,
                }
              : user
          )
        );

        const descimal= saldoTotal.toFixed(2);
        
        if (saldoTotal > 0) {
          showSuccessMessage(`${descimal} agregados correctamente`); // Mostrar modal de éxito
        } else {
          showSuccessMessage(`${-descimal} descontados correctamente`); // Mostrar modal de éxito
        }

        setMessage({
          type: "success",
          text: saldoTotal + " agregados correctamente",
        });
        setSaldoValues((prevState) => ({ ...prevState, [id]: "" }));
        //restoreOriginalState(id);
      } catch (error) {
        setMessage({ type: "error", text: "No se pudo acreditar el saldo" });
        console.error("Error al acreditar el saldo", error);
      } finally {
        setIsProcessing(false); // Liberar bloqueo
      }
    }
  };
  // Función para mostrar el modal de éxito
  const showSuccessMessage = (message) => {
    setModalMessage(message);
    setShowSuccessModal(true);
    setTimeout(() => {
      setShowSuccessModal(false); // Cerrar el modal después de 2 segundos
    }, 2000);
  };
  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleKeyPress = (event, id, isAbono) => {
    if (event.key === "Enter" && !isProcessing) {
      if (isAbono) {
        handleAcreditarAbono(id);
      } else {
        handleAcreditarSaldo(id);
      }
      if (isAbono) {
        abonoInputRefs.current[id].blur();
      } else {
        saldoInputRefs.current[id].blur();
      }
    }
  };

const handleNombreTiendaInput = (e) => {
  const input = e.target.value;
  const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9 ]*$/; // Solo letras, números y espacios
  const sinEspaciosLargos = /\S{14,}/; // Detecta 16 o más caracteres seguidos sin espacio

  if (input.length > 40) {
    setMessage({
      type: "error",
      text: "No se permite más de 40 caracteres",
    });
  } else if (sinEspaciosLargos.test(input)) {
    setMessage({
      type: "error",
      text: "No se permiten más de 13 caracteres seguidos sin espacio",
    });
  } else if (!regex.test(input)) {
    setMessage({
      type: "error",
      text: "No se permiten caracteres especiales en el nombre de la tienda.",
    });
  } else {
    setNombreTienda(input);
    setMessage({ type: "", text: "" }); // Limpiar mensaje si todo es válido
  }
};

  const handleCreateTienda = async () => {
    const contrasenia = `${phoneNumber}`;
    const celular = `${countryCode}${phoneNumber}`;
    const token = localStorage.getItem("token");

    // Validación para el celular
    const regexCelular = /^\+?[1-9]\d{1,14}$/;

    if (!nombreTienda) {
      setMessage({
        type: "error",
        text: "El nombre de la tienda no puede estar vacío.",
      });
      return;
    }

    if (phoneNumber.length !== 10) {
      setMessage({
        type: "error",
        text: "El número de teléfono debe tener exactamente 10 dígitos.",
      });
      return;
    }

    if (!celular || !regexCelular.test(celular)) {
      setMessage({ type: "error", text: "El número de celular no es válido." });
      return;
    }

    if (!latitude || !longitude) {
      setMessage({
        type: "error",
        text: "Debes permitir acceso a la ubicación para agregar la tienda.",
      });
      return;
    }

    try {
      await api.post(
        "/admin/crear-por-tienda",
        {
          nombre_tienda: nombreTienda,
          celular,
          latitud: latitude,
          longitud: longitude,
          contrasenia: contrasenia,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessage({ type: "success", text: "Tienda creada exitosamente" });
      setShowModal(false);
      setNombreTienda("");
      setPhoneNumber("");
      fetchUsers();
    } catch (error) {
      setMessage({ type: "error", text: `${error.response.data.error}` });
      console.error("Error al crear la tienda", error);
    }
  };

  // Nueva función para manejar la entrada del número de teléfono
  const handlePhoneNumberInput = (e) => {
    const input = e.target.value;
    const numbersOnly = input.replace(/\D/g, "");
    const truncatedInput = numbersOnly.slice(0, 10);
    setPhoneNumber(truncatedInput);
  };

  // Filtro por nombre de tienda
  const filteredUsers = users.filter((user) => {
    const nameMatch = user.usuario.nombre_tienda
      ? user.usuario.nombre_tienda
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      : false;
    return nameMatch;
  });

  // Declaración de la variable pressTimer fuera de las funciones
  let pressTimer = null;

  const handleSelectTienda = async (id) => {
    console.log("Entrando al método");
    const token = localStorage.getItem("token"); // Obtener el token si es necesario
    const tienda = users.find((user) => user.id === id); // Buscar la tienda seleccionada

    if (tienda) {
      try {
        // Suponiendo que haces una petición al backend para seleccionar la tienda
        const response = await api.put(
          `/admin/seleccionar-tienda/${id}`,
          {}, // Si necesitas enviar algún dato extra, lo agregas aquí
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const { tiendaSeleccionada, estado } = response.data; // Extraer los datos de la respuesta del backend
        // Actualizar el estado local para reflejar la tienda seleccionada
        setUsers((prevUsers) =>
          prevUsers.map(
            (user) =>
              user.id === id
                ? {
                    ...user,
                    seleccionado: true, // Actualizar el estado local si es necesario
                  }
                : { ...user, seleccionado: false } // Asegúrate de que las demás tiendas no estén seleccionadas
          )
        );
       //fetchUsers();
      } catch (error) {
        console.error("Error al seleccionar la tienda", error);
      }
    }
  };

  // Funciones para manejar el presionado prolongado
  const handlePressStart = (id) => {
    pressTimer = setTimeout(() => {
      handleSelectTienda(id); // Llamada a la función cuando se mantiene presionado
    }, 500); // 2 segundos
  };

  const handlePressEnd = () => {
    clearTimeout(pressTimer); // Limpiar el temporizador si se suelta antes de los 2 segundos
  };

  const countries = [
    { code: "+52", name: "🇲🇽 +52 México" },
    { code: "+1", name: "🇺🇸 +1 Estados Unidos" },
    { code: "+34", name: "🇪🇸 +34 España" },
    { code: "+93", name: "🇦🇫 +93 Afganistán" },
    { code: "+355", name: "🇦🇱 +355 Albania" },
    { code: "+213", name: "🇩🇿 +213 Argelia" },
    { code: "+376", name: "🇦🇩 +376 Andorra" },
    { code: "+244", name: "🇦🇴 +244 Angola" },
    { code: "+1264", name: "🇬🇸 +1264 Anguila" },
    { code: "+1268", name: "🇦🇮 +1268 Antigua y Barbuda" },
    { code: "+54", name: "🇦🇷 +54 Argentina" },
    { code: "+374", name: "🇦🇲 +374 Armenia" },
    { code: "+297", name: "🇦🇼 +297 Aruba" },
    { code: "+61", name: "🇦🇺 +61 Australia" },
    { code: "+43", name: "🇦🇹 +43 Austria" },
    { code: "+994", name: "🇦🇿 +994 Azerbaiyán" },
    { code: "+1242", name: "🇧🇸 +1242 Bahamas" },
    { code: "+973", name: "🇧🇭 +973 Bahréin" },
    { code: "+880", name: "🇧🇩 +880 Bangladés" },
    { code: "+1246", name: "🇧🇧 +1246 Barbados" },
    { code: "+375", name: "🇧🇾 +375 Bielorrusia" },
    { code: "+32", name: "🇧🇪 +32 Bélgica" },
    { code: "+501", name: "🇧🇿 +501 Belice" },
    { code: "+229", name: "🇧🇯 +229 Benín" },
    { code: "+975", name: "🇧🇹 +975 Bután" },
    { code: "+591", name: "🇧🇴 +591 Bolivia" },
    { code: "+387", name: "🇧🇦 +387 Bosnia y Herzegovina" },
    { code: "+267", name: "🇧🇼 +267 Botsuana" },
    { code: "+55", name: "🇧🇷 +55 Brasil" },
    { code: "+673", name: "🇧🇳 +673 Brunéi" },
    { code: "+359", name: "🇧🇬 +359 Bulgaria" },
    { code: "+226", name: "🇧🇫 +226 Burkina Faso" },
    { code: "+257", name: "🇧🇮 +257 Burundi" },
    { code: "+855", name: "🇰🇭 +855 Camboya" },
    { code: "+237", name: "🇨🇲 +237 Camerún" },
    { code: "+1", name: "🇨🇦 +1 Canadá" },
    { code: "+238", name: "🇨🇻 +238 Cabo Verde" },
    { code: "+345", name: "🇰🇾 +345 Islas Caimán" },
    { code: "+236", name: "🇨🇫 +236 República Centroafricana" },
    { code: "+56", name: "🇨🇱 +56 Chile" },
    { code: "+86", name: "🇨🇳 +86 China" },
    { code: "+61", name: "🇨🇬 +61 Islas Cocos" },
    { code: "+57", name: "🇨🇴 +57 Colombia" },
    { code: "+269", name: "🇰🇲 +269 Comoras" },
    { code: "+242", name: "🇨🇩 +242 Congo" },
    { code: "+243", name: "🇨🇩 +243 Congo (República Democrática del Congo)" },
    { code: "+682", name: "🇨🇰 +682 Islas Cook" },
    { code: "+506", name: "🇨🇷 +506 Costa Rica" },
    { code: "+225", name: "🇨🇮 +225 Costa de Marfil" },
    { code: "+385", name: "🇭🇷 +385 Croacia" },
    { code: "+53", name: "🇨🇺 +53 Cuba" },
    { code: "+357", name: "🇨🇾 +357 Chipre" },
    { code: "+420", name: "🇨🇿 +420 Chequia" },
    { code: "+45", name: "🇩🇰 +45 Dinamarca" },
    { code: "+253", name: "🇩🇯 +253 Yibuti" },
    { code: "+1", name: "🇩🇲 +1 Dominica" },
    { code: "+593", name: "🇪🇨 +593 Ecuador" },
    { code: "+20", name: "🇪🇬 +20 Egipto" },
    { code: "+503", name: "🇸🇻 +503 El Salvador" },
    { code: "+240", name: "🇬🇶 +240 Guinea Ecuatorial" },
    { code: "+291", name: "🇪🇷 +291 Eritrea" },
    { code: "+372", name: "🇪🇪 +372 Estonia" },
    { code: "+251", name: "🇪🇹 +251 Etiopía" },
    { code: "+500", name: "🇬🇸 +500 Islas Malvinas" },
    { code: "+298", name: "🇫🇴 +298 Islas Feroe" },
    { code: "+679", name: "🇫🇯 +679 Fiyi" },
    { code: "+58", name: "🇻🇪 +58 Venezuela" },
    { code: "+33", name: "🇫🇷 +33 Francia" },
    { code: "+594", name: "🇬🇫 +594 Guayana Francesa" },
    { code: "+241", name: "🇬🇦 +241 Gabón" },
    { code: "+220", name: "🇬🇳 +220 Gambia" },
    { code: "+995", name: "🇬🇪 +995 Georgia" },
    { code: "+233", name: "🇬🇭 +233 Ghana" },
    { code: "+350", name: "🇬🇮 +350 Gibraltar" },
    { code: "+30", name: "🇬🇷 +30 Grecia" },
    { code: "+299", name: "🇬🇸 +299 Groenlandia" },
    { code: "+1473", name: "🇬🇩 +1473 Granada" },
    { code: "+502", name: "🇬🇹 +502 Guatemala" },
    { code: "+224", name: "🇬🇳 +224 Guinea" },
    { code: "+245", name: "🇬🇼 +245 Guinea-Bisáu" },
    { code: "+595", name: "🇬🇾 +595 Guyana" },
    { code: "+509", name: "🇭🇹 +509 Haití" },
    { code: "+504", name: "🇭🇳 +504 Honduras" },
    { code: "+36", name: "🇭🇺 +36 Hungría" },
    { code: "+354", name: "🇮🇸 +354 Islandia" },
    { code: "+91", name: "🇮🇳 +91 India" },
    { code: "+62", name: "🇮🇩 +62 Indonesia" },
    { code: "+98", name: "🇮🇷 +98 Irán" },
    { code: "+964", name: "🇮🇶 +964 Irak" },
    { code: "+353", name: "🇮🇪 +353 Irlanda" },
    { code: "+972", name: "🇮🇱 +972 Israel" },
    { code: "+39", name: "🇮🇹 +39 Italia" },
    { code: "+81", name: "🇯🇵 +81 Japón" },
    { code: "+962", name: "🇯🇴 +962 Jordania" },
    { code: "+254", name: "🇰🇪 +254 Kenia" },
    { code: "+686", name: "🇰🇮 +686 Kiribati" },
    { code: "+383", name: "🇽🇰 +383 Kosovo" },
    { code: "+965", name: "🇰🇼 +965 Kuwait" },
    { code: "+996", name: "🇰🇬 +996 Kirguistán" },
    { code: "+856", name: "🇱🇦 +856 Laos" },
    { code: "+371", name: "🇱🇻 +371 Letonia" },
    { code: "+961", name: "🇱🇧 +961 Líbano" },
    { code: "+266", name: "🇱🇸 +266 Lesoto" },
    { code: "+231", name: "🇱🇷 +231 Liberia" },
    { code: "+218", name: "🇱🇾 +218 Libia" },
    { code: "+423", name: "🇱🇮 +423 Liechtenstein" },
    { code: "+370", name: "🇱🇹 +370 Lituania" },
    { code: "+352", name: "🇱🇺 +352 Luxemburgo" },
    { code: "+853", name: "🇲🇴 +853 Macao" },
    { code: "+389", name: "🇲🇰 +389 Macedonia del Norte" },
    { code: "+261", name: "🇲🇬 +261 Madagascar" },
    { code: "+265", name: "🇲🇼 +265 Malaui" },
    { code: "+60", name: "🇲🇾 +60 Malasia" },
    { code: "+223", name: "🇲🇱 +223 Malí" },
    { code: "+356", name: "🇲🇹 +356 Malta" },
    { code: "+692", name: "🇲🇰 +692 Islas Marshall" },
    { code: "+596", name: "🇲🇶 +596 Martinica" },
    { code: "+222", name: "🇲🇷 +222 Mauritania" },
    { code: "+230", name: "🇲🇺 +230 Mauricio" },
    { code: "+262", name: "🇾🇹 +262 Mayotte" },
    { code: "+52", name: "🇲🇽 +52 México" },
    { code: "+691", name: "🇲🇷 +691 Micronesia" },
    { code: "+373", name: "🇲🇩 +373 Moldavia" },
    { code: "+976", name: "🇲🇳 +976 Mongolia" },
    { code: "+382", name: "🇲🇪 +382 Montenegro" },
    { code: "+1664", name: "🇹🇨 +1664 Islas Turcas y Caicos" },
    { code: "+1", name: "🇲🇽 +52 México" },
    { code: "+691", name: "🇲🇸 +691 Micronesia" },
    { code: "+373", name: "🇲🇩 +373 Moldavia" },
    { code: "+976", name: "🇲🇳 +976 Mongolia" },
    { code: "+382", name: "🇲🇪 +382 Montenegro" },
    { code: "+1664", name: "🇹🇨 +1664 Islas Turcas y Caicos" },
    { code: "+976", name: "🇲🇳 +976 Mongolia" },
    { code: "+27", name: "🇿🇦 +27 Sudáfrica" },
    { code: "+34", name: "🇪🇸 +34 España" },
    { code: "+94", name: "🇱🇰 +94 Sri Lanka" },
    { code: "+249", name: "🇸🇩 +249 Sudán" },
    { code: "+597", name: "🇸🇷 +597 Surinam" },
    { code: "+268", name: "🇸🇿 +268 Suazilandia" },
    { code: "+46", name: "🇸🇪 +46 Suecia" },
    { code: "+41", name: "🇨🇭 +41 Suiza" },
    { code: "+963", name: "🇸🇾 +963 Siria" },
    { code: "+886", name: "🇹🇼 +886 Taiwán" },
    { code: "+992", name: "🇹🇯 +992 Tayikistán" },
    { code: "+255", name: "🇹🇿 +255 Tanzania" },
    { code: "+66", name: "🇹🇭 +66 Tailandia" },
    { code: "+670", name: "🇹🇱 +670 Timor Oriental" },
    { code: "+228", name: "🇹🇬 +228 Togo" },
    { code: "+690", name: "🇹🇴 +690 Tonga" },
    { code: "+1", name: "🇹🇹 +1 Trinidad y Tobago" },
    { code: "+216", name: "🇹🇳 +216 Túnez" },
    { code: "+90", name: "🇹🇷 +90 Turquía" },
    { code: "+993", name: "🇹🇲 +993 Turkmenistán" },
    { code: "+1", name: "🇺🇸 +1 Estados Unidos" },
    { code: "+256", name: "🇺🇬 +256 Uganda" },
    { code: "+380", name: "🇺🇦 +380 Ucrania" },
    { code: "+971", name: "🇦🇪 +971 Emiratos Árabes Unidos" },
    { code: "+44", name: "🇬🇧 +44 Reino Unido" },
    { code: "+598", name: "🇺🇾 +598 Uruguay" },
    { code: "+998", name: "🇺🇿 +998 Uzbekistán" },
    { code: "+379", name: "🇻🇦 +379 Vaticano" },
    { code: "+58", name: "🇻🇪 +58 Venezuela" },
    { code: "+84", name: "🇻🇳 +84 Vietnam" },
    { code: "+1", name: "🇻🇮 +1 Islas Vírgenes de los EE. UU." },
    { code: "+260", name: "🇿🇲 +260 Zambia" },
    { code: "+263", name: "🇿🇼 +263 Zimbabue" },
  ];

  const handleSort = (field) => {
    const isAsc =
      sortedField.field === field && sortedField.direction === "asc";
    const direction = isAsc ? "desc" : "asc";
    setSortedField({ field, direction });
    setUsers(
      [...users].sort((a, b) => {
        if (field === "nombre_tienda") {
          return direction === "asc"
            ? a.usuario.nombre_tienda.localeCompare(b.usuario.nombre_tienda)
            : b.usuario.nombre_tienda.localeCompare(a.usuario.nombre_tienda);
        } else if (field === "saldo") {
          return direction === "asc" ? b.saldo - a.saldo : a.saldo - b.saldo;
        }  else if (field === "orden") {
            return direction === "asc" ? a.orden - b.orden : b.orden - a.orden;
        }  else if (field === "pendiente") {
            return direction === "asc" ? b.credito - a.credito : a.credito - b.credito;
        }  else if (field === "promedio") {
              return direction === "asc" ? b.promedioSemanal - a.promedioSemanal : a.promedioSemanal - b.promedioSemanal;
        
        
        } else if (field === "congelado") {
          console.log(a.usuario.activo)
       // 1. Agrupamiento por congelado según dirección
         return direction === "asc"
      ? (a.usuario.activo ? 1:-1)
      : (a.usuario.activo ? -1: 1);
        }return 0;
      })
    );
  };
 
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Vendedores");
  
    // Definir las columnas con encabezados
    worksheet.columns = [
      { header: "Tienda", key: "nombre", width: 30 },
      { header: "Saldo", key: "saldo", width: 15 },
      { header: "Pendiente", key: "credito", width: 15 },
      { header: "Activo", key: "activo", width: 15 },
      { header: "Pago de Contado", key: "contado", width: 20 },
      { header: "Promedio Semanal", key: "promedio", width: 20 },
    ];
  
    // Aplicar estilos a los encabezados
    worksheet.columns.forEach((column, index) => {
      const cell = worksheet.getCell(1, index + 1); // Encabezados están en la fila 1
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; // Negrita y letras blancas
      cell.alignment = { vertical: "middle", horizontal: "center" }; // Centrado
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF00AAE4" }, // Color celeste (Azure)
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  
    // Agregar autofiltros para ordenar desde Excel
    worksheet.autoFilter = {
      from: "A1", // Celda inicial (A1)
      to: `F1`, // Celda final (F1, en este caso)
    };
  
    // Agregar las filas de datos
    filteredUsers.forEach((user) => {
      worksheet.addRow({
        nombre: user.orden + " " + user.usuario.nombre_tienda,
        saldo: typeof user.saldo === "number"
              ? parseFloat(user.saldo.toFixed(2))
              : 0,
        credito: typeof user.credito === "number"
              ? parseFloat(user.credito.toFixed(2))
              : 0,    
        activo: user.usuario.activo ? "Sí" : "No", // Booleano convertido a texto
        contado: user.contado ? "Sí" : "No", // Booleano convertido a texto
        promedio: typeof user.promedioSemanal === "number"
              ? parseFloat(user.promedioSemanal.toFixed(2))
              : 0,
      });
    });
  
    // Crear y descargar el archivo Excel
    const buffer = await workbook.xlsx.writeBuffer();
    FileSaver.saveAs(new Blob([buffer]), "Tiendas.xlsx");
  };
  
  const formatValue = (value) =>
    typeof value === "number" ? value.toFixed(2) : "";

const formatTextByChunks = (text, chunkSize = 15) => {
  if (!text) return;

  let formatted = '';
  for (let i = 0; i < text.length; i += chunkSize) {
    const part = text.slice(i, i + chunkSize);
    const isLast = i + chunkSize >= text.length;
    formatted += part + (isLast ? '\n' : '-\n');
  }

  return text;
};

  return (
    <Container ref={containerRef}>
      <Row className="my-2 align-items-center">
        <Col xs={7} md={8} className="mt-2 mb-1">
          <h4 className="text-left" style={{ marginBottom: "0.4rem" }}>
           {userName}
          </h4>
          <p
            className="text-left text-muted"
            style={{ fontSize: "1.0rem", marginBottom: "0.2rem" }}
          >
            Numero de tiendas: {totalUsers}
          </p>
        </Col>

        <Col
  xs={5}
  md={4}
  className="d-flex flex-column justify-content-start align-items-end"
>
  <Button
    variant="primary"
    onClick={() => setShowModal(true)}
    style={{
      backgroundColor: "#0A74DA",
      color: "#fff",
      marginBottom: "0.5rem",
      width: "100px",
    }}
  >
    <FaPlus style={{ marginRight: "8px" }} /> Nueva
  </Button>
  <Button
    variant="success"
    onClick={exportToExcel}
    style={{
      marginBottom: "0.5rem",
      width: "100px",
    }}
  >
    Descargar
  </Button>
</Col>

      </Row>

      {/*message.text && (
        <Alert variant={message.type === "success" ? "success" : "danger"}>
          {message.text}
        </Alert>
      )*/}

      <InputGroup className="mb-3">
        <FormControl
          placeholder="Buscar por nombre de tienda"
          onChange={handleSearch}
        />
      </InputGroup>

        {/* Ordenadores para móvil */}
        <Row className="my-1 d-block d-md-none">
<Col className="d-flex justify-content-center">
Ordenar por:
      </Col>
      <Col className="d-flex justify-content-center">
          <ButtonGroup className="mb-2">
            <Button
              variant="outline-secondary"
              onClick={() => handleSort("orden")}
            >
              Orden
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => handleSort("nombre_tienda")}
            >
            Nombre
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => handleSort("saldo")}
            >
           Saldo
            </Button>

          </ButtonGroup>
        </Col>
        <Col className="d-flex justify-content-center">
        
                  <ButtonGroup className="mb-2">
               <Button
              variant="outline-secondary"
              onClick={() => handleSort("pendiente")}
            >
           Pendiente
            </Button>
                   <Button
              variant="outline-secondary"
              onClick={() => handleSort("promedio")}
            >
           Promedio
            </Button>
        
                     <Button
                      variant="outline-secondary"
                      onClick={() => handleSort("congelado")}
                    >
                      Congelado
                    </Button>
                 
                    
        
                      
                  </ButtonGroup>
                  
                  
                </Col>
      </Row>


      <Table hover className="text-nowrap custom-table d-none d-md-table">
        <thead>
          <tr >
            <th onClick={() => handleSort("nombre_tienda")}
              style={{ cursor: "pointer" }}>Tienda {" "}
              {sortedField.field === "nombre_tienda" &&
                (sortedField.direction === "asc" ? "▲" : "▼")}
                </th>
            <th onClick={() => handleSort("saldo")}
              style={{ cursor: "pointer" }}>Saldo{" "}
              {sortedField.field === "saldo" &&
                (sortedField.direction === "asc" ? "▲" : "▼")}
              </th>
             <th
              onClick={() => handleSort("congelado")}
              style={{ cursor: "pointer" }}
            >
              Congelar{" "}
              {sortedField.field === "congelado" &&
                (sortedField.direction === "asc" ? "▲" : "▼")}
            </th>
            <th onClick={() => handleSort("pendiente")}
              style={{ cursor: "pointer" }}>Pendiente{" "}
              {sortedField.field === "pendiente" &&
                (sortedField.direction === "asc" ? "▲" : "▼")}
              </th>
            <th>Abono</th>
            <th>+ Saldo</th>
            <th onClick={() => handleSort("promedio")}
              style={{ cursor: "pointer" }}>Promedio{" "}
              {sortedField.field === "promedio" &&
                (sortedField.direction === "asc" ? "▲" : "▼")}
              </th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user) => (
            <tr
              key={user.usuario.id}
              className={`${user.seleccionado ? "selected-row" : ""} ${
                user.contado ? "contado-row" : ""
              } ${user.usuario.eliminado ? "eliminated-row" : ""}`}
              onMouseDown={() => handlePressStart(user.id)}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={() => handlePressStart(user.id)} // Para móviles
              onTouchEnd={handlePressEnd} // Para móviles
            >
            <td style={{  whiteSpace: 'pre-line' }}>
  <a
    href={`https://www.google.com/maps?q=${user.latitud},${user.longitud}`}
    target="_blank"
    rel="noopener noreferrer"
  >
     {formatTextByChunks(user.orden+". " +user.usuario.nombre_tienda)}
  </a>
</td>

              <td>{user.saldo.toFixed(2)}</td>
              <td>
                <ToggleSwitch
                  id={`activo-switch-${user.usuario.id}`}
                  checked={user.usuario.activo}
                  onChange={() =>
                    handleToggle(
                      user.usuario.nombre_tienda,
                      user.usuario.id,
                      user.usuario.activo
                    )
                  }
                />
              </td>

              <td>{user.credito.toFixed(2)}</td>
              <td>
                <Form.Control
                  type="text"
                  inputMode="numeric"
                  placeholder="Abono"
                  value={abonoValues[user.usuario.id] || ""}
                  onChange={(e) =>
                    handleAbonoChange(user.usuario.id, e.target.value)
                  }
                  //onClick={() => handleFieldClick(user.usuario.id, user)}
                  onKeyPress={(e) => handleKeyPress(e, user.usuario.id, true)}
                  ref={(el) => (abonoInputRefs.current[user.usuario.id] = el)}
                />
              </td>
              <td>
                <Form.Control
                  type="text"
                  placeholder="+ Saldo"
                  value={saldoValues[user.usuario.id] || ""}
                  onChange={(e) =>
                    handleSaldoChange(user.usuario.id, e.target.value)
                  }
                  //onClick={() => handleFieldClick(user.usuario.id, user)}
                  onKeyPress={(e) => handleKeyPress(e, user.usuario.id, false)}
                  ref={(el) => (saldoInputRefs.current[user.usuario.id] = el)}
                />
              </td>
              <td>
  {user.promedioSemanal % 1 === 0
    ? user.promedioSemanal
    : user.promedioSemanal.toFixed(2)}
</td>              <td>
                <ButtonGroup>
                  {/* Botón con Tooltip para FaDollarSign */}
                  <Tippy content="Historial" placement="top">
                  
                 
                      <Button
                        variant="link"
                        onClick={(e) =>
                          handleButtonClick(
                            e,
                            user.usuario.id,
                            `/vendedor/usuario/${user.usuario.id}`
                          )
                        }
                      >
                        <FaDollarSign />
                      </Button>
                      </Tippy>

                  {/* Botón con Tooltip para FaAddressBook */}
                    <Tippy content="Configuración" placement="top">

                    <Button
                      variant="link"
                      onClick={(e) => {
                        e.preventDefault();
                        const url = `/vendedor/usuario-configuracion/${user.id}`;
                        window.open(url, "_blank");
                      }}
                    >
                      <FaAddressBook />
                    </Button>
                      </Tippy>

                </ButtonGroup>

                <div className="user-detail"></div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
    <tr>
      <td><strong>Totales</strong></td>
      <td>
          {filteredUsers.reduce((total, user) => total + user.saldo, 0).toFixed(2)}
      </td>
      <td></td>
      <td>
          {filteredUsers.reduce((total, user) => total + user.credito, 0).toFixed(2)}
        
      </td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  </tfoot>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Agregar Nueva Tienda</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {message.text && (
            <Alert variant={message.type === "success" ? "success" : "danger"}>
              {message.text}
            </Alert>
          )}
          <Form>
            <Form.Group controlId="formNombreTienda">
              <Form.Label>Nombre de la Tienda</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ingresa el nombre de la tienda"
                value={nombreTienda}
                onChange={handleNombreTiendaInput}
                required
              />
            </Form.Group>
            <br />

            <Form.Group controlId="formPhoneNumber">
              <Form.Label>Número de WhatsApp</Form.Label>
              <Row>
                <Col md={4}>
                  <Form.Control
                    as="select"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                  >
                    {/* Primero los países que deseas mostrar al inicio */}
                    {countries.slice(0, 3).map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                    {/* Luego el resto de los países */}
                    {countries.slice(3).map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </Form.Control>
                </Col>
                <Col md={8}>
                  <Form.Control
                    type="tel"
                    placeholder="Ingresa el número de teléfono"
                    value={phoneNumber}
                    onChange={handlePhoneNumberInput}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateTienda();
                      }
                    }}
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
            style={{ backgroundColor: "#0A74DA", color: "#fff" }}
            onClick={handleCreateTienda}
          >
            Crear Tienda
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de éxito */}
      <Modal
        show={showSuccessModal}
        onHide={() => setShowSuccessModal(false)}
        centered
      >
        <Modal.Body className="text-center">
          <div>{modalMessage}</div>
          <button
            className="close-button"
            onClick={() => setShowSuccessModal(false)} // Permitir cerrar con la X
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              border: "none",
              background: "transparent",
            }}
          >
            <FaTimes size={20} />
          </button>
        </Modal.Body>
      </Modal>

      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmación de Acción</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {confirmAction.activar ? (
            <p>
              ¿Seguro que quieres habilitar a{" "}
              <strong>{confirmAction.nombre_tienda}</strong>?
            </p>
          ) : (
            <p>
              ¿Seguro que quieres congelar a{" "}
              <strong>{confirmAction.nombre_tienda}</strong>?
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowConfirmModal(false)}
          >
            Cancelar
          </Button>
          <Button variant="primary" onClick={confirmToggleAction}>
            {confirmAction.activar ? "Habilitar" : "Congelar"}
          </Button>
        </Modal.Footer>
      </Modal>

      <div className="d-md-none user-cards">
        {filteredUsers.map((user) => (
          <div
            key={user.usuario.id}
            className={`user-card ${user.seleccionado ? "selected-row" : ""} ${
              user.contado ? "contado-row" : ""
            }${user.usuario.eliminado ? "eliminated-row" : ""}`}
            onMouseDown={() => handlePressStart(user.id)}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={() => handlePressStart(user.id)} // Para móviles
            onTouchEnd={handlePressEnd} // Para móviles
          >
            <div className="user-row">
              <div className="user-detail left-align">
                <a
                  href={`https://www.google.com/maps?q=${user.latitud},${user.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
              {formatTextByChunks(user.orden+". " +user.usuario.nombre_tienda)}
                </a>
              </div>
              <div className="user-detail">
                <strong>Saldo:</strong> <br></br>
                {user.saldo.toFixed(2)}
              </div>
              <div className="user-detail">
                <strong>Congelar:</strong>
                <br />
                <ToggleSwitch
                  id={`activo-switch-${user.usuario.id}`}
                  checked={user.usuario.activo}
                  onChange={() =>
                    handleToggle(
                      user.usuario.nombre_tienda,
                      user.usuario.id,
                      user.usuario.activo
                    )
                  }
                />
              </div>
            </div>
            <div className="user-row">
              <div className="user-detail">
                <strong>Pendiente:</strong> <br></br>
                {user.credito.toFixed(2)}
              </div>

              <div className="user-detail">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAcreditarAbono(user.usuario.id);
                  }}
                >
                  <Form.Control
                    type="text"
                    pattern="^-?(\d+)?(\.\d{0,2})?$"
      		    autoComplete="off"  // Deshabilitar autocompletar
      		    autoCorrect="off"   // Deshabilitar autocorrección
      		    spellCheck="false"  // Deshabilitar revisión ortográfica
                    placeholder="Abono"
                    value={abonoValues[user.usuario.id] || ""}
                    onChange={(e) =>
                      handleAbonoChange(user.usuario.id, e.target.value)
                    }
                    //  onClick={() => handleFieldClick(user.usuario.id, user)}
                    ref={(el) => (abonoInputRefs.current[user.usuario.id] = el)}
//autoFocus
                  />
                </form>
              </div>
              <div className="user-detail">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAcreditarSaldo(user.usuario.id);
                  }}
                >
                  <Form.Control
                    type="text"
                    pattern="^-?(\d+)?(\.\d{0,2})?$"
      		    autoComplete="off"  // Deshabilitar autocompletar
      		    autoCorrect="off"   // Deshabilitar autocorrección
      		    spellCheck="false"  // Deshabilitar revisión ortográfica
                    placeholder="+ Saldo"
                    value={saldoValues[user.usuario.id] || ""}
                    onChange={(e) =>
                      handleSaldoChange(user.usuario.id, e.target.value)
                    }
                    // onClick={() => handleFieldClick(user.usuario.id, user)}
                    ref={(el) => (saldoInputRefs.current[user.usuario.id] = el)}
//autoFocus
                  />
                </form>
              </div>
            </div>
            <div className="user-row">
              <div className="user-detail">
                <strong>Promedio:</strong>
                <br></br> 
  {user.promedioSemanal % 1 === 0
    ? user.promedioSemanal
    : user.promedioSemanal.toFixed(2)}

              </div>
              <div className="user-detail">
                <Button
                  variant="link"
                  onClick={(e) =>
                    handleButtonClick(
                      e,
                      user.usuario.id,
                      `/vendedor/usuario/${user.usuario.id}`
                    )
                  }
                >
                  <FaDollarSign /> <br></br>Historial
                </Button>
              </div>
              <div className="user-detail">
                <Button
                  variant="link"
                  onClick={(e) => {
                    e.preventDefault();
                    const url = `/vendedor/usuario-configuracion/${user.id}`;
                    window.open(url, "_blank");
                  }}
                >
                  <FaAddressBook /> <br />
                  Configuración
                </Button>
              </div>
            </div>

          </div>
        ))}
                    <div className="user-row">
            <div className="user-detail">
               <strong>Total Pendiente: </strong>

          {filteredUsers.reduce((total, user) => total + user.credito, 0).toFixed(2)}
          </div>
            <div className="user-detail">

            <strong>Total Saldo: </strong>
          {filteredUsers.reduce((total, user) => total + user.saldo, 0).toFixed(2)}
          
         </div>
          <div className="user-detail">
            </div>

          </div>
      </div>

      <style>{`


        .custom-table {
          border-collapse: collapse;
          overflow-y: hidden; /* Oculta el scroll vertical */
         scrollbar-gutter: stable; /* Mantiene espacio para el scrollbar */
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
        .custom-table td,
        .custom-table th {
          border: none;
          padding: 12px 15px;
        }
        .selected-row {
          background-color: #ffd5b1 !important;
        }
        .eliminated-row{
          background-color: #ffbbbb !important;
        }
        .contado-row {
          background-color: #ffdddd !important;  /* Un rojo claro */
        }
          .selected-row.contado-row {
  background-color: #ffd5b1 !important;
}

        .user-cards {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .user-card {
          padding: 10px 0;
          border-bottom: 1px solid #ddd;
          background-color: #fff;
          transition: background-color 0.3s ease;
        }

        .user-card.selected-row {
          background-color: #f7bd56;
        }

        .user-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
        }

        .user-detail {
          flex: 1;
          text-align: left;
        }

        .user-detail:nth-child(2) {
          text-align: center;
        }

        .user-detail:nth-child(3) {
          text-align: right;
        }
      
  .left-align {
    text-align: left;
  }
  .center-align {
    text-align: center;
  }
  .right-align {
    text-align: right;
    
  }
    .fixed-width-cell {
  max-width: 200px; /* Ajustado aprox para 10 caracteres */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

    .fixed-width-cell2 {
  max-width: 180px; /* Ajustado aprox para 10 caracteres */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


        @media (max-width: 1000px) {
          .custom-table {
            display: none;
          }
        }
      `}</style>
    </Container>
  );
};

export default ManageUsers;
