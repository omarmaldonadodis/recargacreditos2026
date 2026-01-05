import axios from 'axios';

const obtenerTiposRecarga = async () => {
  const response = await axios.get('/api/tienda/tipo-recargas', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  return response.data;
};

const realizarRecarga = async (recargaData) => {
  const response = await axios.post('/api/tienda/recargas', recargaData, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  return response.data;
};

export default {
  obtenerTiposRecarga,
  realizarRecarga
};
