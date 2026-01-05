import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { user } = useContext(AuthContext);

  if (!user) {
    // Si no está autenticado, redirige al login
    return <Navigate to="/login" />;
  }

  if (role && !role.includes(user.rol)) {
    // Si el usuario no tiene el rol adecuado, redirige a una página de no autorizado
    return <Navigate to="/" replace />;
  }


  // Si está autenticado y autorizado, renderiza los componentes hijos
  return children;
};

export default ProtectedRoute;
