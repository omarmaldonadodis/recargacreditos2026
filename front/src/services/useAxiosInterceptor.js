import { useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useAxiosInterceptor = () => {
  const { logout } = useContext(AuthContext);

  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      config => {
        const token = localStorage.getItem('token');

        // Verificar si la solicitud es a GestoPago
        if (!config.url.includes('gestopago')) {
          // Solo añadir el encabezado Authorization si NO es una solicitud a GestoPago
          if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
          }
        }

        return config;
      },
      error => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          logout(); // Cerrar la sesión en el contexto
          window.location.href = '/login'; // Redirige al login sin usar `useNavigate`
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [logout]);
};

export default useAxiosInterceptor;
