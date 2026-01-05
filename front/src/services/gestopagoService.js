import axios from 'axios';

const realizarRecarga = async (datosRecarga) => {
  console.log("Entra a gestopagoService");

  const response = await axios.post('https://api.gestopago.com/recargas', datosRecarga, {
    
    headers: {
      
      
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  return response.data;
};

export default {
  realizarRecarga
};
