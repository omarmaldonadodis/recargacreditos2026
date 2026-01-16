import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Table,
  Button,
  OverlayTrigger,
  Modal,
  Form,
  Row,
  Col,
  Alert,
  InputGroup,
  FormControl,
  Pagination,
  ButtonGroup,
  Dropdown,
  DropdownButton,
  Tooltip,
} from "react-bootstrap";
import { FaPlus, FaAddressBook, FaTimes } from "react-icons/fa";
import axios from "axios";
import "./ToggleSwitch.css";
import { useNavigate } from "react-router-dom";
import api from "../../services/axiosConfig";
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { isMobile } from "react-device-detect";


const ToggleSwitch = ({ id, checked, onChange }) => (
  <label className="switch">
    <input type="checkbox" id={id} checked={!checked} onChange={onChange} />
    <span className="slider round"></span>
  </label>
);

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const saldoInputRefs = useRef({});

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+52");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [vendedores, setVendedores] = useState([]);
  const [sortedField, setSortedField] = useState({
    field: null,
    direction: "asc",
  });
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const [nombreTienda, setNombreTienda] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [saldoValues, setSaldoValues] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false); // Para el modal de éxito
  const [modalMessage, setModalMessage] = useState(""); // El mensaje que se mostrará en el modal

  // Función para mostrar el modal de éxito
  const showSuccessMessage = (message) => {
    setModalMessage(message);
    setShowSuccessModal(true);
    setTimeout(() => {
      setShowSuccessModal(false); // Cerrar el modal después de 2 segundos
    }, 2000);
  };

  const fetchVendedores = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await api.get("/admin/vendedores", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setVendedores(response.data);
    } catch (error) {
      console.error("Error al obtener los vendedores", error);
    }
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await api.get("/admin/obtener-tiendas", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUsers(
        response.data.sort((a, b) => {
          const nombreA = a.usuario.nombre_tienda || ""; // Usar una cadena vacía si no está definido
          const nombreB = b.usuario.nombre_tienda || ""; // Usar una cadena vacía si no está definido
          return nombreA.localeCompare(nombreB);
        })
      );
    } catch (error) {
      console.error("Error al obtener los usuarios", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchVendedores();
    fetchGeolocation(); // Obtener geolocalización al cargar el componente
  }, []);

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
          return direction === "asc" ? a.saldo - b.saldo : b.saldo - a.saldo;
         } else if (field === "promedio") {
          return direction === "asc" ? b.promedioSemanal - a.promedioSemanal : a.promedioSemanal- b.promedioSemanal;
       
        } else if (field === "vendedor") {
          return direction === "asc"
            ? a.creador.correo.localeCompare(b.creador.correo)
            : b.creador.correo.localeCompare(a.creador.correo);
         } else if (field === "congelado") {
          console.log(a.usuario.activo)
       // 1. Agrupamiento por congelado según dirección
         return direction === "asc"
      ? (a.usuario.activo ? 1:-1)
      : (a.usuario.activo ? -1: 1);
}
        
        return 0;
      })
    );
  };
  // Control de nombre de tienda: solo permite letras, números y espacios
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

  const handleAcreditarSaldo = async (id) => {
    if (isProcessing) return; // Evitar llamadas repetidas
    setIsProcessing(true);

    const token = localStorage.getItem("token");
    const valor = saldoValues[id];
    const valorFloat = parseFloat(valor);

    if (!isNaN(valorFloat)) {
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
        const saldoTotal = response.data.saldoTotal;
        const descimal= parseFloat(saldoTotal.toFixed(2));
        
        
        console.log("Entrando al if");

        if (valor > 0) {
          console.log("Entre al if");
          showSuccessMessage(`${descimal} acreditado correctamente`); // Mostrar modal de éxito
        } else {
          showSuccessMessage(`${descimal} descontados correctamente`); // Mostrar modal de éxito
        }

        setMessage({ type: "success", text: "Saldo acreditado exitosamente" });
        fetchVendedores();
        saldoInputRefs.current[id].blur();
        setSaldoValues("");
      } catch (error) {
        setMessage({ type: "error", text: "No se pudo acreditar el saldo" });
        console.error("Error al acreditar el saldo", error);
      } finally {
        setIsProcessing(false); // Liberar bloqueo
      }
    }
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
  

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e));
    setCurrentPage(1);
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleReassignVendedor = async (tiendaId, nuevoVendedorId) => {
    const token = localStorage.getItem("token");
    try {
      await api.patch(
        `/admin/reasignar/${tiendaId}`,
        { nuevoVendedorId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessage({ type: "success", text: "Vendedor reasignado exitosamente" });
      fetchUsers();
    } catch (error) {
      setMessage({ type: "error", text: "No se pudo reasignar el vendedor" });
      console.error("Error al reasignar el vendedor", error);
    }
  };
  // Función para evitar que se active la lógica de clic cuando interactúas con los botones internos
  const handleButtonClick = (e, id, route) => {
    e.stopPropagation(); // Detener propagación para que no afecte la selección de la fila
    setTimeout(() => {
      navigate(route); // Navegar al enlace configurado después de restaurar el estado
    }); // Asegurarse de que el estado se restaure antes de navegar
  };

const handleToggle = async (userId, field) => {
  const token = localStorage.getItem("token");

  const userIndex = users.findIndex(
    (item) => item.usuario && item.usuario.id === userId
  );
  if (userIndex === -1) return;

  const user = users[userIndex];
  const previousState = { ...user };

  try {
    user.usuario[field] = !user.usuario[field];
    setUsers([...users]);

    await api.put(
      `/admin/editar-tienda2/${userId}`,
      {
        [field]: user.usuario[field],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setMessage({
      type: "success",
      text: `El campo ${field} ha sido actualizado`,
    });
    setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 5000);
  } catch (error) {
    setUsers((prevUsers) => {
      prevUsers[userIndex] = previousState;
      return [...prevUsers];
    });
    setMessage({
      type: "error",
      text: `No se pudo actualizar el campo ${field}`,
    });
    console.error(`Error al actualizar el campo ${field}`, error);
  }
};

  // Nueva función para manejar la entrada del número de teléfono
  const handlePhoneNumberInput = (e) => {
    const input = e.target.value;
    const numbersOnly = input.replace(/\D/g, "");
    const truncatedInput = numbersOnly.slice(0, 10);
    setPhoneNumber(truncatedInput);
  };

  const handleCreateTienda = async () => {
    const celular = `${countryCode}${phoneNumber}`;
    const token = localStorage.getItem("token");
    const contrasenia = `${phoneNumber}`;

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
          contrasenia,
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

  const handleDelete = async () => {
    const token = localStorage.getItem("token");
    try {
      await api.post(`/admin/eliminar-tienda/${userToDelete.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMessage({
        type: "success",
        text: "Tienda eliminados correctamente.",
      });

      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 3000);

      setShowDeleteModal(false);
      fetchUsers();
    } catch (error) {
      setMessage({
        type: "error",
        text: "Error al eliminar la tienda y el usuario.",
      });
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 3000);
      console.error("Error al eliminar la tienda y el usuario:", error);
    }
  };

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

  const handleOpenDeleteModal = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };
  const handleKeyPress = (event, id) => {
    if (event.key === "Enter" && !isProcessing) {
      handleAcreditarSaldo(id);

      saldoInputRefs.current[id].blur();
      setSaldoValues("");
    }
  };

  const filteredUsers = users.filter((user) => {
    const emailMatch = user.usuario.nombre_tienda
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const nameMatch = user.usuario.nombres_apellidos
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const dniMatch = user.usuario.dni?.includes(searchTerm);
    return emailMatch || nameMatch || dniMatch;
  });

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  const formatTextByChunks = (text) => {
    if (!text) return ;

    const chunkSize = isMobile ? 16 : 40;

    const words = text.split(' ');
    let lines = [];
    let currentLine = '';

    for (const word of words) {
      // 🚨 palabra más larga que el límite → forzar corte
      if (word.length > chunkSize) {
        // guardar lo que ya había
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }

        for (let i = 0; i < word.length; i += chunkSize) {
          const part = word.slice(i, i + chunkSize);
          const isLast = i + chunkSize >= word.length;
          lines.push(part + (isLast ? '' : '-'));
        }
        continue;
      }

      // ¿Cabe la palabra en la línea actual?
      const testLine = currentLine
        ? currentLine + ' ' + word
        : word;

      if (testLine.length <= chunkSize) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  };

  return (
    <Container>
      <Row className="my-4">
        <Col>
          <h1 className="text-left" style={{ color: "#0A74DA" }}>
            Tiendas
          </h1>
        </Col>
        <Col className="text-right">
          <Button
            variant="primary"
            style={{ backgroundColor: "#0A74DA", color: "#fff" }}
            onClick={() => setShowModal(true)}
          >
            <FaPlus /> Nueva
          </Button>
        </Col>
      </Row>

      {/*message.text && (
        <Alert variant={message.type === "success" ? "success" : "danger"}>
          {message.text}
        </Alert>
      )*/}

      {/* Filtros y controles para móvil */}
      <Row className="mb-3">
        <Col md={12} className="d-flex flex-wrap gap-2">
          <InputGroup>
            <FormControl
              placeholder="Buscar por nombre"
              onChange={handleSearch}
            />
            <DropdownButton
              as={ButtonGroup}
              variant="outline-secondary"
              title={`Mostrar ${itemsPerPage}`}
              id="dropdown-items-per-page"
              onSelect={handleItemsPerPageChange}
              className="mb-2"
            >
              <Dropdown.Item eventKey="10">10</Dropdown.Item>
              <Dropdown.Item eventKey="20">20</Dropdown.Item>
              <Dropdown.Item eventKey="50">50</Dropdown.Item>
              <Dropdown.Item eventKey="100">100</Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item eventKey={filteredUsers.length.toString()}>
                Todo
              </Dropdown.Item>
            </DropdownButton>
          </InputGroup>
        </Col>
      </Row>

      {/* Ordenadores para móvil */}
      <Row className="my-1 d-block d-md-none">
        <Col className="d-flex justify-content-center">Ordenar por:</Col>
        <Col className="d-flex justify-content-center">
          <ButtonGroup className="mb-2">
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
            <Button
              variant="outline-secondary"
              onClick={() => handleSort("vendedor")}
            >
              Vendedor
            </Button>
            


          </ButtonGroup>
          </Col>
                               <Col className="d-flex justify-content-center">

          <ButtonGroup className="mb-2">
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

      {/* Versión de tabla para pantallas grandes */}
      <Table hover className="custom-table d-none d-md-table">
        <thead>
          <tr>
            <th
              onClick={() => handleSort("nombre_tienda")}
              style={{ cursor: "pointer" }}
            >
              Nombre{" "}
              {sortedField.field === "nombre_tienda" &&
                (sortedField.direction === "asc" ? "▲" : "▼")}
            </th>
            <th
              onClick={() => handleSort("saldo")}
              style={{ cursor: "pointer" }}
            >
              Saldo{" "}
              {sortedField.field === "saldo" &&
                (sortedField.direction === "asc" ? "▲" : "▼")}
            </th>
            <th>+ Saldo</th>
               <th
              onClick={() => handleSort("promedio")}
              style={{ cursor: "pointer" }}
            >
              Promedio Semanal{" "}
              {sortedField.field === "promedio" &&
                (sortedField.direction === "asc" ? "▼":"▲" )}
            </th>

            
            <th
              onClick={() => handleSort("vendedor")}
              style={{ cursor: "pointer" }}
            >
              Vendedor{" "}
              {sortedField.field === "vendedor" &&
                (sortedField.direction === "asc" ? "▲" : "▼")}
            </th>
            <th>Ubicación</th>
              <th
              onClick={() => handleSort("congelado")}
              style={{ cursor: "pointer" }}
            >
              Congelado{" "}
              {sortedField.field === "congelado" &&
                (sortedField.direction === "asc" ? "▲" : "▼")}
            </th>

           
            {/* <th>Verificado</th> */}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {paginatedUsers.map((user, index) => (
            <tr key={index}>
              <td>
                {user.usuario.eliminado
                  ?  formatTextByChunks(user.usuario.nombre_tienda.replace(/D3leTe6$/, ""))
                  :  formatTextByChunks(user.usuario.nombre_tienda)}
              </td>

              <td>{user.saldo.toFixed(2)}</td>
              <td>
                <Form.Control
                  type="text"
                  placeholder="+ Saldo"
                  value={saldoValues[user.usuario.id] || ""}
                  onChange={(e) =>
                    handleSaldoChange(user.usuario.id, e.target.value)
                  }
                  onKeyPress={(e) => handleKeyPress(e, user.usuario.id, false)}
                  ref={(el) => (saldoInputRefs.current[user.usuario.id] = el)}
                />
              </td>
              <td>{user.promedioSemanal.toFixed(2)}</td>
              <td>
                <Form.Select
                  value={
                    vendedores.find((v) => v.correo === user.creador.correo)
                      ?.id || user.creador.id
                  }
                  onChange={(e) =>
                    handleReassignVendedor(user.id, e.target.value)
                  }
                  style={{
                    borderRadius: "4px",
                    borderColor: "#0A74DA",
                    padding: "5px",
                    transition: "border-color 0.3s ease",
                    outline: "none",
                  }}
                >
                  {vendedores.map((vendedor) => (
                    <option key={vendedor.id} value={vendedor.id}>
                      {vendedor.nombres_apellidos
                        ? vendedor.nombres_apellidos
                        : "Daniel Fosado"}
                    </option>
                  ))}
                </Form.Select>
              </td>
              <td>
                {user.latitud && user.longitud ? (
                  <a
                    href={`https://www.google.com/maps?q=${user.latitud},${user.longitud}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {`${user.latitud.toFixed(6)} | ${user.longitud.toFixed(6)}`}
                  </a>
                ) : (
                  "N/A"
                )}
              </td>
              <td>
                  <ToggleSwitch
                    id={`activo-switch-${user.usuario.id}`}
                    checked={user.usuario.activo}
                    onChange={() => handleToggle(user.usuario.id, "activo")}
                  />
              </td>
              {/* <td>
                <ToggleSwitch
                  id={`verificado-switch-${index}`}
                  checked={user.usuario.verificado}
                  onChange={() => handleToggle(index, 'verificado')}
                />
              </td> */}
              <td>
                {" "}
                <ButtonGroup>
                  {!user.usuario.eliminado && (
                    <Tippy content="Eliminar" placement="top">
                      <Button
                        variant="link"
                        style={{ color: "red", fontSize: "1.25rem" }}
                        onClick={() => handleOpenDeleteModal(user)}
                      >
                        <FaTimes />
                      </Button>
                      </Tippy>
                  )}

                  {/* Botón con Tooltip para FaAddressBook */}
                  <Tippy content="Configuración" placement="top">

                    <Button
                      variant="link"
                      onClick={(e) => {
                        e.preventDefault();
                        const url = `/admin/usuario-configuracion/${user.id}`;
                        window.open(url, "_blank");
                      }}
                    >
                      <FaAddressBook />
                    </Button>
                    </Tippy>
                    </ButtonGroup>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Versión de tarjetas para pantallas pequeñas */}
      <div className="d-md-none user-cards">
        {paginatedUsers.map((user, index) => (
          <div key={index} className="user-card">
            <div className="user-row">
              <div className="user-detail left-align">
                <span>
                  {user.usuario.eliminado
                    ? formatTextByChunks( user.usuario.nombre_tienda.replace(/D3leTe6$/, ""))
                    : formatTextByChunks (user.usuario.nombre_tienda)}
                </span>
              </div>
              <div className="user-detail center-align">
                <strong>Saldo:</strong>
              </div>
              <div className="user-detail right-align">
                <strong>+ Saldo:</strong>
              </div>
            </div>
            <div className="user-row">
              <div className="user-detail left-align">
                <span></span>
              </div>
              <div className="user-detail center-align">
                <span className="user-data">${user.saldo.toFixed(2)}</span>
              </div>
              <div className="user-detail right-align">
                <div className="saldo-input-container">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAcreditarSaldo(user.usuario.id);
                    }}
                  >
                    <Form.Control
                    type="text"
                    pattern="^-?(\d+)?(\.\d{0,2})?$"

                      autoComplete="off" // Deshabilitar autocompletar
                      autoCorrect="off" // Deshabilitar autocorrección
                      spellCheck="false" // Deshabilitar revisión ortográfica
                      placeholder="Saldo"
                      value={saldoValues[user.usuario.id] || ""}
                      onChange={(e) =>
                        handleSaldoChange(user.usuario.id, e.target.value)
                      }
                      ref={(el) =>
                        (saldoInputRefs.current[user.usuario.id] = el)
                      }
                      style={{
                        width: "90px", // Ajusta el ancho según sea necesario
                        float: "right", // Alinea a la derecha
                      }}
                    />
                  </form>
                </div>
              </div>
            </div>
            <div className="user-row">
              <div className="user-detail left-align">
                <strong>Promedio:</strong>
              </div>
              <div className="user-detail center-align">
                <strong>Vendedor:</strong>
              </div>
              <div className="user-detail right-align">
                <strong>Ubicación:</strong>
              </div>
            </div>

            <div className="user-row">
              <div className="user-detail left-align">
                <span className="user-data">
                  ${user.promedioSemanal.toFixed(2)}
                </span>
              </div>
              <div className="user-detail center-align">
                <span className="user-data">
                  <Form.Select
                    value={
                      vendedores.find((v) => v.correo === user.creador.correo)
                        ?.id || user.creador.id
                    }
                    onChange={(e) =>
                      handleReassignVendedor(user.id, e.target.value)
                    }
                    style={{
                      borderRadius: "4px",
                      borderColor: "#0A74DA",
                      padding: "5px",
                      transition: "border-color 0.3s ease",
                      outline: "none",
                      width: "120px", // Ajusta el ancho según sea necesario

                      textAlign: "center", // Alinear el texto dentro del select
                    }}
                  >
                    {vendedores.map((vendedor) => (
                      <option key={vendedor.id} value={vendedor.id}>
                        {vendedor.nombres_apellidos
                          ? vendedor.nombres_apellidos
                          : "Daniel Fosado"}
                      </option>
                    ))}
                  </Form.Select>
                </span>
              </div>

              <div className="user-detail right-align">
                <span className="user-data">
                  {user.latitud && user.longitud ? (
                    <a
                      href={`https://www.google.com/maps?q=${user.latitud},${user.longitud}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      {`${user.latitud.toFixed(6)}`}
                      <br /> {` ${user.longitud.toFixed(6)}`}
                    </a>
                  ) : (
                    "N/A"
                  )}
                </span>
              </div>
            </div>

            <div className="user-row">
              <div className="user-detail left-align">
                <div className="action-item">
                  <strong>Congelar:</strong>
                  <ToggleSwitch
                    id={`activo-switch-${user.usuario.id}`}
                    checked={user.usuario.activo}
                    onChange={() => handleToggle(user.usuario.id, "activo")}
                  />
                </div>
              </div>

              {/* <div className="action-item">
          <strong>Verificado:</strong> 
          <ToggleSwitch
            id={`verificado-switch-${index}`}
            checked={user.usuario.verificado}
            onChange={() => handleToggle(index, 'verificado')}
          />
        </div> */}

              <div className="user-detail center-align">
                {!user.usuario.eliminado && (
                  <Button
                    variant="outline-danger"
                    onClick={() => handleOpenDeleteModal(user)}
                    style={{
                      width: "90px", // Ajusta el ancho según sea necesario
                    }}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
              <div className="user-detail right-align">
                <Button
                  variant="outline-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    const url = `/admin/usuario-configuracion/${user.id}`;
                    window.open(url, "_blank");
                  }}
                  style={{
                    width: "90px", // Ajusta el ancho según sea necesario
                  }}
                >
                  Config.
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Pagination className="justify-content-center">
        {[...Array(Math.ceil(filteredUsers.length / itemsPerPage)).keys()].map(
          (number) => (
            <Pagination.Item
              key={number + 1}
              className={number + 1 === currentPage ? "active" : ""} // Añade la clase "active"
              onClick={() => handlePageChange(number + 1)}
            >
              {number + 1}
            </Pagination.Item>
          )
        )}
      </Pagination>
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

      {/* Modal de Confirmación de Eliminación */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {userToDelete
            ? `¿Estás seguro de eliminar ${userToDelete.usuario.nombre_tienda}?`
            : ""}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>

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
    cursor: pointer;
  }
  .custom-table tbody tr {
    transition: background-color 0.3s ease;
  }
  .custom-table tbody tr:hover {
    background-color: #f1f1f1;
  }

      .user-card {
    padding: 10px 0;
    border-bottom: 1px solid #ddd;
    background-color: #fff;
    transition: background-color 0.3s ease;
    align-items: center; /* Centra verticalmente los elementos */

  }

  .user-info {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
  }
     .user-row {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
    align-items: center; /* Centra verticalmente los elementos */
  }
 .user-detail {
    flex: 1;
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
  .correo-container {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 2px; /* Espacio mínimo entre "Correo:" y el dato */
  }
  .correo-container strong {
    margin-right: 2px; /* Reduce el margen entre "Correo:" y el dato */
  }
  .correo-data {
    text-align: left;
    flex-grow: 1; /* Permite que el dato del correo se mantenga alineado a la izquierda */
    margin-left: 0; /* Elimina cualquier margen adicional */
    white-space: nowrap; /* Evita que el texto del correo se rompa en líneas */
  }
  .actions-container {
    display: flex;
    align-items: center; /* Centra los elementos verticalmente */
    justify-content: space-between; /* Espacia los elementos uniformemente */
    margin-top: 10px; /* Espacio superior para separar de otros bloques */
  }
  .action-item {
    display: flex;
    gap: 5px; /* Espacio entre el texto y el botón */
  }
  .action-item strong {
    margin-right: 5px; /* Ajusta el espaciado entre el texto y el interruptor */
  }
  .switch {
    display: inline-flex; /* Asegura que el interruptor se mantenga alineado */
    align-items: center; /* Centra verticalmente dentro del contenedor */
  }
`}</style>
    </Container>
  );
};

export default ManageUsers;
