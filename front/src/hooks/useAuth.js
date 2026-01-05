import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const useAuth = () => {
  const { user, login, logout, confirmarCodigoRecuperacion } = useContext(AuthContext);

  return { user, login, logout, confirmarCodigoRecuperacion };
}; 

export default useAuth;
