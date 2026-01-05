import axios from 'axios';

const obtenerSaldo = async () => {
  const response = await axios.get('/api/tienda/saldo', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  return response.data;
};

export default {
  obtenerSaldo
};
