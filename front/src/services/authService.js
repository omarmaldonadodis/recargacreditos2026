import axios from 'axios';
import { jwtDecode } from 'jwt-decode';  // Import named export
 // Importación correcta de jwtDecode

const getUserFromToken = (token) => {
  if (!token) return null;  // Si no hay token, retorna null
  try {
    const decodedToken = jwtDecode(token);

    console.log(decodedToken.rol);

    return {
      decodedToken,
      correo: decodedToken.correo,  // Extrae correo del token
      rol: decodedToken.rol // Extrae el rol del token
      
      // Puedes agregar más datos si están presentes en el token
    };
  } catch (error) {
    console.error("Token inválido:", error);  // Maneja el error si el token es inválido
    return null;  // Retorna null si el token no es válido
  }
};

const login = async (credentials) => {
  try {
    // Realiza la solicitud POST al backend para autenticar al usuario
    const response = await axios.post('https://www.recargacreditos.com.mx/api/auth/login', credentials);
    
    // Extrae el token de la respuesta
    const { token } = response.data;

    // Guarda el token en el almacenamiento local
    localStorage.setItem('token', token);
    
    // Decodifica el token para obtener los datos del usuario (correo, rol, etc.)
    const user = getUserFromToken(token);
    
    return user;  // Devuelve los datos del usuario al frontend
  } catch (error) {
    // Captura el mensaje de error del backend y lánzalo
    const errorMessage = error.response?.data?.error || 'Error en el inicio de sesión';
    throw new Error(errorMessage);
  }
};

const logout = () => {
  // Elimina el token de localStorage al cerrar sesión
  localStorage.removeItem('token');
  localStorage.removeItem('token_admin'); // Limpia el token de administrador si existe
  
};


const confirmarCodigoRecuperacion = async ({ correo, codigoVerificacion, nuevaContrasenia }) => {
  try {
    console.log("authService");
    const response = await axios.put(`https://www.recargacreditos.com.mx/api/auth/recuperar-contrasenia-confirmar`, {
      correo,
      codigoVerificacion,
      nueva_contrasenia: nuevaContrasenia,
    });

    const { token, message } = response.data;
    console.log(token);
    console.log(message);


    if (token) {
      localStorage.setItem('token', token); // Guarda el nuevo token en localStorage
      const user = getUserFromToken(token); // Decodifica el nuevo token
      return user; // Retorna el mensaje y los datos del usuario
    }

    return { message }; // Si no hay token, solo retorna el mensaje
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Error al confirmar el código de recuperación');
  }
};



const authService = {
  login,
  logout,
  getUserFromToken,
  confirmarCodigoRecuperacion
};

export default authService;
