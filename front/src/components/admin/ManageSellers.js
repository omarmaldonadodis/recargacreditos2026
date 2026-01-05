import React, { useState, useEffect, useContext, useRef } from "react";
import {
  Container,
  Table,
  Button,
  Modal,
  Form,
  Row,
  Col,
  Alert,
  InputGroup,
  FormControl,
  OverlayTrigger,
  Tooltip,
  ButtonGroup,
} from "react-bootstrap";
import {
  FaCheck,
  FaTimes,
  FaPlus,
  FaDollarSign,
  FaArrowRight,
  FaAddressBook
} from "react-icons/fa";
import axios from "axios";
import "./ToggleSwitch.css";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext"; // Importa el contexto de autenticación
import api from "../../services/axiosConfig";
import Tippy from '@tippyjs/react';



const ToggleSwitch = ({ id, checked, onChange }) => {
  return (
    <label className="switch">
      <input type="checkbox" id={id} checked={!checked} onChange={onChange} />
      <span className="slider round"></span>
    </label>
  );
};


const ManageSellers = () => {
  const [users, setUsers] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [nombres_apellidos, setNombresApellidos] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState("+52");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showSaldoModal, setShowSaldoModal] = useState(false);
  const [valor, setValor] = useState("");
  const [porcentaje, setPorcentaje] = useState(4);
  const navigate = useNavigate();
  const [actingAsSeller, setActingAsSeller] = useState(false);
  const { updateUserRole } = useContext(AuthContext);
  const [editingSaldoIndex, setEditingSaldoIndex] = useState(null);
  const [editableSaldoValue, setEditableSaldoValue] = useState("");

  const [editableValue, setEditableValue] = useState("");
  const [editType, setEditType] = useState("");
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  

  
  // Nuevas variables de estado para los campos editables
  const [editedEmail, setEditedEmail] = useState("");
  const [editedUsuarioPorcentaje, setEditedUsuarioPorcentaje] = useState("");
  const [editedPorcentaje, setEditedPorcentaje] = useState("");
  const [usuarioPorcentajeError, setUsuarioPorcentajeError] = useState("");
  const [porcentajeError, setPorcentajeError] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);

  const [userToDelete, setUserToDelete] = useState(null);
  





  const [showSuccessModal, setShowSuccessModal] = useState(false); // Para el modal de éxito
  const [modalMessage, setModalMessage] = useState(""); // El mensaje que se mostrará en el modal
 
  const [sortedField, setSortedField] = useState({
    field: null,
    direction: "asc",
  });
    // Función para mostrar el modal de éxito
    const showSuccessMessage = (message) => {
      setModalMessage(message);
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false); // Cerrar el modal después de 2 segundos
      }, 2000);
    };



  // Validación de email
  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  // Efecto para actualizar los campos cuando se selecciona un usuario
  useEffect(() => {
    if (selectedUser) {
      setEditedEmail(selectedUser.usuario.correo);
      setEditedUsuarioPorcentaje(selectedUser.usuario.porcentaje);
      setEditedPorcentaje(selectedUser.porcentaje);
    }
  }, [selectedUser]);

  // Manejo de cambios y validaciones en tiempo real
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEditedEmail(value);

    if (validateEmail(value)) {
      setEmailError("");
    } else {
      setEmailError("El correo electrónico no es válido");
    }
  };

  const handleUsuarioPorcentajeChange = (e) => {
    const value = e.target.value;
    setEditedUsuarioPorcentaje(value);

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 2) {
      setUsuarioPorcentajeError("El porcentaje debe estar entre 0 y 2");
    } else {
      setUsuarioPorcentajeError("");
    }
  };

  const handlePorcentajeChange = (e) => {
    const value = e.target.value;
    setEditedPorcentaje(value);

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 7) {
      setPorcentajeError("El porcentaje debe estar entre 0 y 7");
    } else {
      setPorcentajeError("");
    }
  };

  // Métodos para enviar los datos al backend
  const handleEmailSubmit = async () => {
    if (emailError) {
      return;
    }
    const token = localStorage.getItem("token");
    try {
      await api.put(
        `/admin/editar-correo/${selectedUser.usuario.id}`,
        {
          correo: editedEmail,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessage({ type: "success", text: "Correo actualizado exitosamente" });
      setSelectedUser((prev) => ({
        ...prev,
        usuario: {
          ...prev.usuario,
          correo: editedEmail,
        },
      }));
      fetchUsers();
    } catch (error) {
      setMessage({ type: "error", text: "No se pudo actualizar el correo" });
      console.error("Error al actualizar el correo", error);
    }
  };

  const handleUsuarioPorcentajeSubmit = async () => {
    if (usuarioPorcentajeError) {
      return;
    }
    const token = localStorage.getItem("token");
    try {
      await api.post(
        `/admin/actualizar-porcentaje-usuario`,
        {
          usuarioId: selectedUser.usuario.id,
          porcentaje: parseFloat(editedUsuarioPorcentaje),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessage({
        type: "success",
        text: "Porcentaje del usuario actualizado exitosamente",
      });
      setSelectedUser((prev) => ({
        ...prev,
        usuario: {
          ...prev.usuario,
          porcentaje: parseFloat(editedUsuarioPorcentaje),
        },
      }));
    } catch (error) {
      setMessage({
        type: "error",
        text: "No se pudo actualizar el porcentaje del usuario",
      });
      console.error("Error al actualizar el porcentaje del usuario", error);
    }
  };

  const handlePorcentajeSubmit = async () => {
    if (porcentajeError) {
      return;
    }
    const token = localStorage.getItem("token");
    try {
      await api.post(
        `/admin/actualizar-porcentaje`,
        {
          tiendaId: selectedUser.id,
          porcentaje: parseFloat(editedPorcentaje),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessage({
        type: "success",
        text: "Porcentaje actualizado exitosamente",
      });
      setSelectedUser((prev) => ({
        ...prev,
        porcentaje: parseFloat(editedPorcentaje),
      }));
    } catch (error) {
      setMessage({
        type: "error",
        text: "No se pudo actualizar el porcentaje",
      });
      console.error("Error al actualizar el porcentaje", error);
    }
  };

const validateName = (name) => {
  const soloLetrasYEspacios = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]*$/;
  const sinSecuenciaLarga = !/\S{16,}/.test(name); // No debe haber más de 15 caracteres sin espacio
  return name.length <= 40 && soloLetrasYEspacios.test(name) && sinSecuenciaLarga;
};


  

  const validatePhoneNumber = (value) => {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(value);
  };

  // Validar el formulario en tiempo real
  const [formIsValid, setFormIsValid] = useState(false);

  // Fetch users and geolocation on component mount
  useEffect(() => {
    fetchUsers();
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
    }
  }, []);

  // Fetch users from backend
  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await api.get("/admin/obtener-vendedor", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUsers(response.data);
    } catch (error) {
      console.error("Error al obtener los usuarios", error);
    }
  };

  // Handle saldo editing
  const handleSaldoClick = (index) => {
    setEditingSaldoIndex(index);
    setEditableSaldoValue("");
  };
  const handleSaldoChange = (e) => {
    let value = e.target.value;
  
    // Permite solo un "-" al inicio
    value = value.replace(/(?!^)-/g, '');
  
    // Permite solo un "."
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('').replace(/\./g, '');
    }
  
    // Limita a dos decimales
    value = value.replace(/^(-?\d*\.\d{2}).*$/, '$1');
  
    // Permite solo números, un "-" al inicio y un solo "."
    if (!/^(-?\d+(\.\d{0,2})?)?$/.test(value)) {
      value = value.replace(/[^0-9.-]/g, '');
    }
  
    e.target.value = value;
    setEditableSaldoValue(e.target.value);
  };
  


  const handleSaldoBlur = async (user) => {
    if (isProcessing) return; // Evitar llamadas repetidas
    setIsProcessing(true);
    if (editableSaldoValue.trim() === "") {
      setEditingSaldoIndex(null);
      return;
    }
  
    const token = localStorage.getItem("token");
    try {
      const response = await api.post(
        `/admin/acreditar-saldo2/${user.usuario.id}`,
        {
          valor: parseFloat(editableSaldoValue),
          porcentaje: 4,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      // Suponiendo que la API devuelve el saldo actualizado en response.data.saldoTotal
      const saldoTotal = response.data.saldoTotal;
      const descimal= saldoTotal.toFixed(2);
      if (parseFloat(editableSaldoValue) > 0) {
        showSuccessMessage(`${descimal} acreditado correctamente`);
      } else {
        showSuccessMessage(`${descimal} descontado correctamente`);
      }
  
      setMessage({ type: "success", text: "Saldo actualizado exitosamente" });
      setEditingSaldoIndex(null);
      fetchUsers();
    } catch (error) {
      setMessage({ type: "error", text: "No se pudo actualizar el saldo" });
      console.error("Error al actualizar el saldo", error);
      setEditingSaldoIndex(null);
    } finally {
      setIsProcessing(false);
    }
  };
  

  const handleSaldoKeyDown = (e, user) => {
    if (e.key === "Enter" && !isProcessing) {
      handleSaldoBlur(user);
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  // Toggle active state
  const handleToggle = async (index, field) => {
    const token = localStorage.getItem("token");
    const user = users[index];
    const previousState = { ...user };
    try {
      user.usuario[field] = !user.usuario[field];
      setUsers([...users]);
      await api.put(
        `/admin/editar-tienda2/${user.usuario.id}`,
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
    } catch (error) {
      setUsers((prevUsers) => {
        prevUsers[index] = previousState;
        return [...prevUsers];
      });
      setMessage({
        type: "error",
        text: `No se pudo actualizar el campo ${field}`,
      });
      console.error(`Error al actualizar el campo ${field}`, error);
    }
  };

  // Handle editing of deposit and recharge values
  const handleEditClick = (index, type) => {
    setEditingIndex(index);
    setEditType(type);
    setEditableValue("");
  };

  const handleValueChange = (e) => {
    let value = e.target.value;
  
    // Permite solo un "-" al inicio
    value = value.replace(/(?!^)-/g, '');
  
    // Permite solo un "."
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('').replace(/\./g, '');
    }
  
    // Limita a dos decimales
    value = value.replace(/^(-?\d*\.\d{2}).*$/, '$1');
  
    // Permite solo números, un "-" al inicio y un solo "."
    if (!/^(-?\d+(\.\d{0,2})?)?$/.test(value)) {
      value = value.replace(/[^0-9.-]/g, '');
    }
  
    e.target.value = value;
    setEditableValue(value);
  };
  
  const handleRowClick = (event, rowIndex) => {
    // Verifica si el clic fue dentro de una celda editable
    if (editingIndex !== null && editingIndex !== rowIndex) {
      // Si se hace clic en otra celda o fuera del campo de edición, restaura la vista predeterminada
      setEditingIndex(null);
      setEditingSaldoIndex(null);
      setEditableValue("");
      setEditableSaldoValue("");
    }
  };

  const handleValueKeyDown = (e, user) => {
    if (e.key === "Enter" && !isProcessing) {
      handleValueSubmit(user);
    }
  };

  const handleValueSubmit = async (user) => {
    if (isProcessing) return; // Evitar llamadas repetidas
    setIsProcessing(true);

    const token = localStorage.getItem("token");

    if (editableValue.trim() === "") {
      setEditingIndex(null);
      return;
    }

    console.log("Entrando a value");

    const valor = parseFloat(editableValue);
    if (!isNaN(valor)) {
      try {
        let response;

        if (editType === "Deposito") {
          // API para Depósitos
          response = await api.post(
            `/admin/pago-vendedor/${user.usuario.correo}`,
            {
              valor: valor,
              tipo: "Deposito",
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        } else if (editType === "Recarga") {
          // API para Recargas
          response = await api.post(
            `/admin/acreditar-saldo2/${user.usuario.id}`,
            {
              valor: valor,
              credito: true,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        }
        if (valor > 0) {
          showSuccessMessage(`${valor} acreditado correctamente`); // Mostrar modal de éxito
        } else {
          showSuccessMessage(`${valor} descontados correctamente`); // Mostrar modal de éxito
        }

        setMessage({ type: "success", text: response.data.mensaje });
        setEditingIndex(null);
        fetchUsers();
      } catch (error) {
        setMessage({ type: "error", text: "No se pudo procesar la operación" });
        console.error("Error al procesar la operación", error);
      } finally {
        setIsProcessing(false); // Liberar bloqueo
      }
    }
  };


   // useEffect para limpiar el mensaje después de 3 segundos
   useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleShowSaldoModal = (user) => {
    setSelectedUser(user);
    setShowSaldoModal(true);
  };

  const handleCloseSaldoModal = () => {
    setSelectedUser(null);
    setShowSaldoModal(false);
  };

  const handleAcreditarSaldo = async () => {
    const token = localStorage.getItem("token");

    try {
      await api.post(
        `/admin/acreditar-saldo2/${selectedUser.usuario.id}`,
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
      setShowSaldoModal(false);
      fetchUsers();
    } catch (error) {
      setMessage({ type: "error", text: "No se pudo acreditar el saldo" });
      console.error("Error al acreditar el saldo", error);
    }
  };

  useEffect(() => {
    if (
      email &&
      nombres_apellidos &&
      phoneNumber &&
      !emailError &&
      !nameError &&
      !phoneError
    ) {
      setFormIsValid(true);
    } else {
      setFormIsValid(false);
    }
  }, [
    email,
    nombres_apellidos,
    phoneNumber,
    emailError,
    nameError,
    phoneError,
  ]);

  const handleCreateUser = async () => {
    const celular = `${countryCode}${phoneNumber}`;
    const token = localStorage.getItem("token");
    const contrasenia = `${phoneNumber}`;

    if (!validatePhoneNumber(phoneNumber)) {
      setPhoneError("El número debe ser de 10 dígitos y solo números");
      return;
    }
    if (!validateEmail(email)) {
      setEmailError("El Email debe ser válido");
      return;
    }

    // Limpiar errores previos
    setEmailError("");
    setNameError("");
    setPhoneError("");
    setMessage({ type: "", text: "" });

    if (latitude && longitude) {
      try {
        await api.post(
          "/admin/crear-vendedor",
          {
            correo: email,
            contrasenia: contrasenia,
            celular: celular,
            nombres_apellidos: nombres_apellidos,
            latitud: latitude,
            longitud: longitude,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setMessage({ type: "success", text: "Usuario creado exitosamente" });
        setShowModal(false);
        setEmail("");
        setPassword("");
        setCountryCode("+52");
        setPhoneNumber("");
        setNombresApellidos("");
        fetchUsers();
      } catch (error) {
        const errorMessage =
          error.response && error.response.data && error.response.data.error
            ? error.response.data.error
            : "No se pudo crear el usuario";

        // Mostrar el error específico en el campo correspondiente
        if (errorMessage.includes("correo")) {
          setEmailError(errorMessage);
        } else if (errorMessage.includes("celular")) {
          setPhoneError(errorMessage);
        } else if (errorMessage.includes("nombre")) {
          setNameError(errorMessage);
        } else {
          setMessage({ type: "error", text: errorMessage });
        }
        console.error("Error al crear el usuario", error);
        
      }
    } else {
      setMessage({
        type: "error",
        text: "No se pudo obtener la geolocalización.",
      });
      console.error("No se pudo obtener la geolocalización.");
    }

    setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 5000);
  };

  useEffect(() => {
    if (!showModal) {
      // Restablecer los campos del formulario y los errores cuando se cierra el modal
      setEmail("");
      setNombresApellidos("");
      setCountryCode("+52");
      setPhoneNumber("");
      setEmailError("");
      setNameError("");
      setPhoneError("");
    }
  }, [showModal]);

    // Nueva función para manejar la entrada del número de teléfono
    const handlePhoneNumberInput = (e) => {
      const input = e.target.value;
      const numbersOnly = input.replace(/\D/g, "");
      const truncatedInput = numbersOnly.slice(0, 10);
      setPhoneNumber(truncatedInput);
    };
  

  const actAsSeller = async (user) => {
    const tokenAdmin = localStorage.getItem("token");
    try {
      const response = await api.post(
        "/auth/actuar_como_vendedor",
        { vendedorId: user.UsuarioId },
        { headers: { Authorization: `Bearer ${tokenAdmin}` } }
      );

      localStorage.setItem("token_admin", tokenAdmin);
      localStorage.setItem("token", response.data.token_vendedor);

      updateUserRole(response.data.token_vendedor);

      setActingAsSeller(true);
      navigate("/vendedor/users");
    } catch (error) {
      console.error("Error al actuar como vendedor", error);
    }
  };

  // Exit editing mode when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setEditingIndex(null);
        setEditingSaldoIndex(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredUsers = users.filter((user) => {
    const emailMatch = user.usuario.correo
      ? user.usuario.correo.toLowerCase().includes(searchTerm.toLowerCase())
      : false;
    const nameMatch = user.usuario.nombres_apellidos
      ? user.usuario.nombres_apellidos
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      : false;

    return emailMatch || nameMatch;
  });

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
        if (field === "nombres_apellidos") {
          return direction === "asc"
            ? a.usuario.nombres_apellidos.localeCompare(b.usuario.nombres_apellidos)
            : b.usuario.nombres_apellidos.localeCompare(a.usuario.nombres_apellidos);
        } else if (field === "total_tiendas") {
          return direction === "asc" ? a.usuario.total_tiendas - b.usuario.total_tiendas : b.usuario.total_tiendas - a.usuario.total_tiendas;
        } else if (field === "valor_depositar") {
          return direction === "asc"
            ? a.usuario.valor_depositar.localeCompare(b.usuario.valor_depositar)
            : b.usuario.valor_depositar.localeCompare(a.usuario.valor_depositar);
        }
        return 0;
      })
    );
  };

  const handleOpenDeleteModal = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
      const token = localStorage.getItem("token");
      console.log(userToDelete.id)
      try {
        await api.post(`/admin/eliminar-vendedor/${userToDelete.UsuarioId}`, {
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

  const handleCloseModal = () => {
    setShowSuccessModal(false); // Cerrar el modal
    setModalMessage(""); // Vaciar el mensaje
  };
  
  return (
    <Container ref={containerRef}>
      <Row className="my-4">
        <Col>
          <h2 className="text-left" style={{ color: "#0A74DA" }}>
            Vendedores
          </h2>
        </Col>
        <Col className="text-right">
          <Button
            variant="primary"
            style={{ backgroundColor: "#0A74DA", color: "#fff" }}
            onClick={() => setShowModal(true)}
          >
          <FaPlus /> Nuevo
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
          placeholder="Buscar por vendedor o correo"
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
              onClick={() => handleSort("nombres_apellidos")}
            >
             Vendedor
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => handleSort("total_tiendas")}
            >
              Tiendas
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => handleSort("valor_depositar")}
            >
              Depósitos
            </Button>
          </ButtonGroup>
        </Col>
      </Row>

      {/* Desktop Table View */}
      <Table hover className="custom-table d-none d-md-table">
        <thead>
          <tr>
            <th>Vendedor</th>
            <th>Tiendas</th>
            <th>Historial</th>
            <th>Depósitos</th>
            <th>Depósitos recargas</th>
            <th>Saldo</th>
            <th>Congelar</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user, index) => (
            <tr key={index}>
              <td>
                <button
                  onClick={() => actAsSeller(user)}
                 
                  style={{
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: '#0A74DA',
                    textAlign: "left", // Asegura que el texto se alinee a la izquierda
                    display: "block", // Evita que se centre cuando hay varias líneas
                    width: "100%", // Asegura que ocupe todo el espacio disponible
                  }}
                >
                  {user.usuario.nombres_apellidos}
                </button>
              </td>
              <td>{user.usuario.total_tiendas}</td>
              <td>
                <Button
                  variant="outline-primary"
                  style={{ marginTop: "-3px",padding: "5px 10px", fontSize: "14px", alignItems: "center"}}
                  onClick={() => navigate(`admin/historial/${user.usuario.id}`)}
                >
                  Historial
                </Button>
              </td>
              <td
                onClick={() => handleEditClick(index, "Deposito")}
                style={{ cursor: "pointer" }}
              >
                {editingIndex === index && editType === "Deposito" ? (
                  <FormControl
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9\-]*"
                    value={editableValue}
                    onChange={handleValueChange}
                    onKeyDown={(e) => handleValueKeyDown(e, user)}
                    autoFocus
                    placeholder="Ingrese valor"
                  />
                ) : (
                  <span>{user.usuario.valor_depositar.toFixed(2)}</span>
                )}
              </td>
              <td
                onClick={() => handleEditClick(index, "Recarga")}
                style={{ cursor: "pointer" }}
              >
                {editingIndex === index && editType === "Recarga" ? (
                  <FormControl
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9\-]*"
                    value={editableValue}
                    onChange={handleValueChange}
                    onKeyDown={(e) => handleValueKeyDown(e, user)}
                    autoFocus
                    placeholder="Ingrese valor"
                  />
                ) : (
                  <span>{user.credito.toFixed(2)}</span>
                )}
              </td>
              <td
                onClick={() => handleSaldoClick(index)}
                style={{ cursor: "pointer" }}
              >
                {editingSaldoIndex === index ? (
                  <FormControl
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9\-]*"
                    value={editableSaldoValue}
                    onChange={handleSaldoChange}
                    onKeyDown={(e) => handleSaldoKeyDown(e, user)}
                    autoFocus
		    placeholder="Ingrese valor"
                  />
                ) : (
                  <span>{user.saldo.toFixed(2)}</span>
                )}
              </td>
<td style={{ verticalAlign: "middle" }}>
                <ToggleSwitch
                  id={`activo-switch-${index}`}
                  checked={user.usuario.activo}
                  onChange={() => handleToggle(index, "activo")}
                
                />
              </td>
            <td>
  <ButtonGroup style={{ marginTop: "-7px", alignItems: "center" }}>
    {!user.usuario.eliminado && (
      <Tippy content="Eliminar" placement="top">
        <Button
          variant="link"
          style={{
            color: "red",
            fontSize: "18px",
            padding: "4px 6px",
            display: "flex",
            alignItems: "center",
          }}
          onClick={() => handleOpenDeleteModal(user)}
        >
          <FaTimes />
        </Button>
      </Tippy>
    )}

    <Tippy content="Configuración" placement="top">
      <Button
        variant="link"
        style={{
          fontSize: "18px",
          padding: "4px 6px",
          display: "flex",
          alignItems: "center",
        }}
        onClick={() => handleShowSaldoModal(user)}
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

      {/* Mobile View Cards */}
      <div className="d-md-none user-cards">
        {filteredUsers.map((user, index) => (
          <div key={index} className="user-card">
            {/* Primera fila: Correo y Tiendas */}
            <div className="user-row" onClick={(e) => handleRowClick(e, index)}>
              <div className="user-detail left-align">
                <strong>Vendedor:</strong>
              </div>
              <div className="user-detail center-align">
                <strong>Tiendas:</strong>
              </div>
              <div className="user-detail right-align">
                <strong>Depósitos:</strong>
              </div>
            </div>

            <div className="user-row" onClick={(e) => handleRowClick(e, index)}>
              <div className="user-detail left-align">
              <span
    onClick={() => actAsSeller(user)}

      style={{
        cursor: "pointer",
        background: "none",
        border: "none",
        padding: 0,
        color: '#0A74DA',
        textAlign: "left", // Asegura que el texto se alinee a la izquierda
        display: "block", // Evita que se centre cuando hay varias líneas
        width: "100%", // Asegura que ocupe todo el espacio disponible
    }}
  >
    {user.usuario.nombres_apellidos}
  </span>
              </div>
              <div className="user-detail center-align">
              {user.usuario.total_tiendas}
              </div>
              <div className="user-detail right-align">
                           {/* Lógica para editar Depósitos */}
                           {editingIndex === index && editType === "Deposito" ? (
                  <FormControl
                    ref={inputRef}
                    type="text"
                    pattern="^-?(\d+)?(\.\d{0,2})?$"
      		    autoComplete="off"  // Deshabilitar autocompletar
      		    autoCorrect="off"   // Deshabilitar autocorrección
      		    spellCheck="false"  // Deshabilitar revisión ortográfica
                    value={editableValue}

                    onChange={(e) => handleValueChange(e)}
                    onKeyDown={(e) => handleValueKeyDown(e, user)}
                    autoFocus
                    placeholder="Ingrese valor"
                    onBlur={() => setEditingIndex(null)}

                  />

                ) : (
                  <span
                    onClick={() => handleEditClick(index, "Deposito")}
                    style={{ cursor: "pointer" }}
                  >
                    {user.usuario.valor_depositar.toFixed(2)}
                  </span>
                )}
              </div>
            </div>


                        {/* Primera fila: Correo y Tiendas */}


            {/* Segunda fila: Depósitos, Recargas y Saldo */}
            <div className="user-row" onClick={(e) => handleRowClick(e, index)}>
              <div className="user-detail left-align">
              <strong>Depósito Recargas:</strong>
              </div>
              <div className="user-detail center-align">
              <strong>Saldo:</strong>
              </div>
              <div className="user-detail right-align">
              <strong>Congelar:</strong>
              </div>
            </div>

            <div className="user-row" onClick={(e) => handleRowClick(e, index)}>
              <div className="user-detail left-align">
                {/* Lógica para editar Recargas */}
                {editingIndex === index && editType === "Recarga" ? (
                  <FormControl
                    ref={inputRef}
                    type="text"
                    pattern="^-?(\d+)?(\.\d{0,2})?$"
      		    autoComplete="off"  // Deshabilitar autocompletar
      		    autoCorrect="off"   // Deshabilitar autocorrección
      		    spellCheck="false"  // Deshabilitar revisión ortográfica
                    value={editableValue}
                    onChange={(e) => handleValueChange(e)}
                    onKeyDown={(e) => handleValueKeyDown(e, user)}
                    autoFocus
                    placeholder="Ingrese valor"
                    onBlur={() => setEditingIndex(null)}
                  />
                ) : (
                  <span
                    onClick={() => handleEditClick(index, "Recarga")}
                    style={{ cursor: "pointer" }}
                  >
                    {user.credito.toFixed(2)}
                  </span>
                )}              </div>
              <div className="user-detail center-align">
                {/* Lógica para editar Saldo */}
                {editingSaldoIndex === index ? (
                  <FormControl
                    ref={inputRef}
                    type="text"
                    pattern="^-?(\d+)?(\.\d{0,2})?$"
      		    autoComplete="off"  // Deshabilitar autocompletar
      		    autoCorrect="off"   // Deshabilitar autocorrección
      		    spellCheck="false"  // Deshabilitar revisión ortográfica
                    value={editableSaldoValue}
                    onChange={(e) => handleSaldoChange(e)}
                    onKeyDown={(e) => handleSaldoKeyDown(e, user)}
                    autoFocus
                   placeholder="Ingrese valor"
                    onBlur={() => setEditingSaldoIndex(null)}
                  />
                ) : (
                  <span
                    onClick={() => handleSaldoClick(index)}
                    style={{ cursor: "pointer" }}
                  >
                    {user.saldo.toFixed(2)}
                  </span>
                )}              </div>
              <div className="user-detail right-align">
              <ToggleSwitch
                    id={`activo-switch-${index}`}
                    checked={user.usuario.activo}
                    onChange={() => handleToggle(index, "activo")}
                  /> 
                  </div>
            </div>


            {/* Tercera fila: Historial, Activo, Configuración */}
            <div className="user-row">
              <div className="user-detail left-align">
                <Button
                  variant="outline-primary"
                  style={{ width: "110px",padding: "5px 5px", fontSize: "14px" }}
                  onClick={() => navigate(`admin/historial/${user.usuario.id}`)}
                >
                  Historial
                </Button>
              </div>
              <div className="user-detail center-align">
                         {!user.usuario.eliminado && (
                                <Button
                                  variant="outline-danger"
                                  onClick={() => handleOpenDeleteModal(user)}
                  style={{ width: "110px",padding: "5px 5px", fontSize: "14px" }}

                                >
                                  Eliminar
                                </Button>
                              )}
              </div>


               

              <div className="user-detail right-align">
                <Button
                  variant="outline-primary"
                  style={{ width: "110px",padding: "5px 5px", fontSize: "14px" }}
                  onClick={() => handleShowSaldoModal(user)}
                >
                  Configuración
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div></div>

      {/* Modal for Adding New User */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Agregar Nuevo Vendedor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formEmail">
              <Form.Label>Correo</Form.Label>
              <Form.Control
                type="email"
                placeholder="Ingresa el correo"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validateEmail(e.target.value)) {
                    setEmailError("");
                  } else {
                    setEmailError("El correo electrónico no es válido");
                  }
                }}
                required
                isInvalid={!!emailError}
              />
              <Form.Control.Feedback type="invalid">
                {emailError}
              </Form.Control.Feedback>
            </Form.Group>
      <Form.Group controlId="formNombre">
  <Form.Label>Nombre</Form.Label>
  <Form.Control
    type="text"
    placeholder="Ingresa el nombre"
    value={nombres_apellidos}
    onChange={(e) => {
      const input = e.target.value;

      // No permitir más de 40 caracteres
      if (input.length > 40) {
        setNameError("El nombre no puede tener más de 40 caracteres.");
        return;
      }

      // No permitir más de 15 caracteres seguidos sin espacio
      if (/\S{16,}/.test(input)) {
        setNameError("No se permiten más de 15 caracteres seguidos sin espacio.");
        return;
      }

      // No permitir caracteres no válidos
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]*$/.test(input)) {
        setNameError("El nombre solo puede contener letras y espacios.");
        return;
      }

      // Si pasa todas las validaciones, actualiza el estado y limpia error
      setNombresApellidos(input);
      setNameError("");
    }}
    required
    isInvalid={!!nameError}
  />
  <Form.Control.Feedback type="invalid">
    {nameError}
  </Form.Control.Feedback>
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
                    ))}{" "}
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
                        handleCreateUser();
                      }
                    }}
                    required
                    isInvalid={!!phoneError}
                    pattern="\d*" // Permite solo números
                    inputMode="numeric" // Asegura que el teclado numérico sea mostrado en dispositivos móviles
                  />
                  <Form.Control.Feedback type="invalid">
                    {phoneError}
                  </Form.Control.Feedback>
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
            onClick={handleCreateUser}
          >
            Crear Usuario
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Modal para editar los datos */}
      <Modal show={showSaldoModal} onHide={handleCloseSaldoModal}>
        <Modal.Header closeButton>
          <Modal.Title>Editar Datos</Modal.Title>
        </Modal.Header>
        <Modal.Body>
        {message.text && (
        <Alert variant={message.type === "success" ? "success" : "danger"}>
          {message.text}
        </Alert>
      )}

          {selectedUser ? (
            <> 
 <div>
 <form onSubmit={(e) => { e.preventDefault(); handleEmailSubmit(); }}>

                <Form.Group controlId="formCorreo" className="mb-3">
                <Form.Label>Correo</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="email"
                    value={editedEmail}
                    onChange={handleEmailChange}
                    isInvalid={!!emailError}
                    enterKeyHint="done" // Para forzar que se muestre "Enter" o "Done"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleEmailSubmit();
                        e.target.blur();
                      }
                    }}
                  />
                  <Button variant="primary" onClick={handleEmailSubmit}>
                    <FaArrowRight />
                  </Button>
                  <Form.Control.Feedback type="invalid">
                    {emailError}
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
              </form>

              </div>

               <div>
               <form onSubmit={(e) => { e.preventDefault(); handleEmailSubmit(); }}>

              <Form.Group controlId="formUsuarioPorcentaje" className="mb-3">
                <Form.Label>Porcentaje por venta (0 - 2)</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    value={editedUsuarioPorcentaje}
                    onChange={handleUsuarioPorcentajeChange}
                    isInvalid={!!usuarioPorcentajeError}
                    enterKeyHint="done" // Para forzar que se muestre "Enter" o "Done"

                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleUsuarioPorcentajeSubmit();
                        e.target.blur();
                      }
                    }}
                  />{" "}
                  <Button
                    variant="primary"
                    onClick={handleUsuarioPorcentajeSubmit}
                  >
                    <FaArrowRight />
                  </Button>
                  <Form.Control.Feedback type="invalid">
                    {usuarioPorcentajeError}
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
              </form>

              </div>
              <div>
              <form onSubmit={(e) => { e.preventDefault(); handleEmailSubmit(); }}>

              <Form.Group controlId="formPorcentaje" className="mb-3">
                <Form.Label>Porcentaje recargas personales (0 - 7)</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    value={editedPorcentaje}
                    onChange={handlePorcentajeChange}
                    isInvalid={!!porcentajeError}
                    enterKeyHint="done" // Para forzar que se muestre "Enter" o "Done"

                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handlePorcentajeSubmit();
                        e.target.blur();
                      }
                    }}
                  />
                  <Button variant="primary" onClick={handlePorcentajeSubmit}>
                    <FaArrowRight />
                  </Button>
                  <Form.Control.Feedback type="invalid">
                    {porcentajeError}
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
              </form>
              </div>
               </> 
          ) : (
            <p>Cargando detalles...</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseSaldoModal}>
            Cerrar
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
            onClick={() => handleCloseModal()} // Permitir cerrar con la X
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
                  ? `¿Estás seguro de eliminar ${userToDelete.usuario.nombres_apellidos}?`
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
      

      

      <style>{`
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
    align-items: center; /* Centra verticalmente los elementos */

  }
 .user-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
   /* align-items: center;  Centra verticalmente los elementos */
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
    .user-detail.correo {
    flex: 2; /* 'Correo' ocupa 2 partes del espacio */
  }
  .user-detail.tiendas {
    flex: 1; /* 'Tiendas' ocupa 1 parte del espacio */
  }
    .activo-container {
  display: flex;
    flex-direction: row;
    align-items: left;
  }

    .activo-container .switch {
  margin-top: 3px; /* Ajusta este valor según sea necesario */
}
`}</style>
    </Container>
  );
};

export default ManageSellers;
