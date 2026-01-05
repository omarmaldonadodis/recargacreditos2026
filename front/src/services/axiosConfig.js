// axiosConfig.js
import axios from 'axios';
import authService from './authService';
import eventEmitter from './eventEmitter';

const api = axios.create({
  baseURL: 'https://www.recargacreditos.com.mx/api',
});

// Interceptor para verificar el estado activo del usuario antes de cada solicitud
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token');
    console.log("entra a axiosConfig");
        // Verifica si la solicitud es para GestoPago y omite la autorización
        if (config.url.includes('gestopago.portalventas.net')) {
          // No agregar el token para solicitudes a GestoPago
          return config;
        }
        
    
    if (token) {
      try {
        // Hacemos una petición al servidor para verificar si el usuario está activo
        const statusResponse = await axios.get('https://www.recargacreditos.com.mx/api/auth/usuario/estado', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const isActive = statusResponse.data.activo;

        if (!isActive) {

            eventEmitter.emit('usuarioInactivo');

          // Si el usuario no está activo, rechazamos la petición
          return Promise.reject({
            response: {
              status: 403,
              data: { mensaje: 'Usuario inactivo' },
            },
          });
        }

        // Si el usuario está activo, añadimos el token a las cabeceras
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Error al verificar el estado del usuario', error);
        // Puedes gestionar errores adicionales aquí si es necesario
        return Promise.reject(error);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

