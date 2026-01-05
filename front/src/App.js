import React, { useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import NavbarComponent from "./components/common/NavbarComponent";
import Login from "./pages/Login";
import AdminDashboard from "./components/admin/AdminDashboard";
import VendedorDashboard from "./components/vendedor/VendedorDashboard";
import TiendaDashboard from "./components/tienda/TiendaDashboard";
import ManageUsers from "./components/admin/ManageUsers";
import ManageUsers2 from "./components/vendedor/ManageUsers";
import AddSaldo from "./components/vendedor/AddSaldo"; // Importa el componente
import VerSaldo from "./components/tienda/VerSaldo"; // Importa el componente
import HacerRecarga from "./components/tienda/HacerRecarga"; // Importa el componente
import ProtectedRoute from "./components/common/ProtectedRoute";
import SaldoAcreditado from "./components/admin/SaldoAcreditado";
import ManageSellers from "./components/admin/ManageSellers";
import ManageVentas from "./components/tienda/ManageVentas";
import ManageSaldo from "./components/tienda/ManageSaldo";
import ManageSaldoVendedor from "./components/vendedor/ManageSaldoVendedor";
import ManageSaldoAdmin from "./components/admin/ManageSaldoAdmin";
import ManageVentasTienda from "./components/vendedor/ManageVentasTienda";
import HacerRecargaVendedor from "./components/vendedor/HacerRecargaVendedor"; // Importa el componente
import Historial from "./components/vendedor/Historial";
import Historial2 from "./components/admin/Historial2";
import Historial3 from "./components/admin/Historial3";
import Configuracion from "./components/tienda/Configuracion";
import Configuracion2 from "./components/vendedor/Configuracion";
import Configuracion3 from "./components/admin/Configuracion3";
import ConfiguracionUsuario from "./components/vendedor/ConfiguracionUsuario";
import useAxiosInterceptor from "./services/useAxiosInterceptor";
import ConfiguracionUsuario2 from "./components/admin/ConfiguracionUsuario2";

import { AuthProvider } from './context/AuthContext';

const App = () => {
  useAxiosInterceptor();

  // const authContext = useContext(AuthContext);
  // const { user } = authContext || {};

  // if (!authContext) {
  //   return null; // O muestra un spinner o mensaje de cargando
  // }
  const { user, logout } = useContext(AuthContext);


  const getDashboardComponent = () => {
    switch (user?.rol) {
      case "administrador":
        return <ManageSellers />;
      case "vendedor":
        return <ManageUsers2/>;
      case "tienda":
        return <HacerRecarga />;
      default:
        return <Navigate to="/login" />;
    }
  };

  return (
   

    <Router>
      
      <NavbarComponent />
      
      <Routes>
        <Route path="/login" 
            element={
            user?.rol ? <Navigate to="/" /> : <Login />
          }
        />
        <Route
          path="/"
          element={<ProtectedRoute>{getDashboardComponent()}</ProtectedRoute>}
        />
        {/* Rutas específicas para administrador */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute role={['administrador']}>
              <ManageUsers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/saldo-acreditado/:correo" // Nueva ruta para SaldoAcreditado
          element={
            <ProtectedRoute role={['administrador']}>
              <SaldoAcreditado />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/vendedores" // Nueva ruta para SaldoAcreditado
          element={
            <ProtectedRoute role={['administrador']}>
              <ManageSellers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/historial/:id"
          element={
            <ProtectedRoute role={['administrador']}>
              <Historial2 />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/historial"
          element={
            <ProtectedRoute role={['administrador']}>
              <Historial3 />
            </ProtectedRoute>
          }
        />

        {/* Rutas específicas para vendedor */}

        <Route
          path="/vendedor/add-saldo"
          element={
            <ProtectedRoute role={['vendedor']}>
              <AddSaldo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendedor/users"
          element={
            <ProtectedRoute role={['vendedor']}>
              <ManageUsers2 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vendedor/users"
          element={
            <ProtectedRoute role={['administrador']}>
              <ManageUsers2 />
            </ProtectedRoute>
          }
        />

        {/* Rutas específicas para tienda */}
        <Route
          path="/tienda/ver-saldo"
          element={
            <ProtectedRoute role={['tienda']}>
              <VerSaldo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tienda/hacer-recarga"
          element={
            <ProtectedRoute role={['tienda']}>
              <HacerRecarga />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tienda/recargas"
          element={
            <ProtectedRoute role={['tienda']}>
              <ManageUsers2 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tienda/saldos"
          element={
            <ProtectedRoute role={['tienda']}>
              <ManageSaldo />
            </ProtectedRoute>
          }
        />
        {/* <Route
          path="/vendedor/saldos"
          element={
            <ProtectedRoute role={['vendedor']}>
              <ManageSaldoVendedor />
            </ProtectedRoute>
          }
        /> */}

        <Route
          path="/vendedor/hacer-recarga"
          element={
            <ProtectedRoute role={['vendedor']}>
              <HacerRecargaVendedor />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tienda/configuracion"
          element={
            <ProtectedRoute role={['tienda']}>
              <Configuracion />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vendedor/configuracion"
          element={
            <ProtectedRoute role={['vendedor']}>
              <Configuracion2 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tienda/ventas"
          element={
            <ProtectedRoute role={['tienda']}>
              <ManageVentas />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vendedor/historial"
          element={
            <ProtectedRoute role={['vendedor']}>
              <Historial />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vendedor/usuario/:correo"
          element={
            <ProtectedRoute role={['vendedor']}>
              <ManageVentasTienda />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendedor/usuario-configuracion/:id"
          element={
            <ProtectedRoute role={['vendedor']}>
              <ConfiguracionUsuario />
            </ProtectedRoute>
          }
        />
         <Route
          path="/admin/usuario-configuracion/:id"
          element={
            <ProtectedRoute role={['administrador']}>
              <ConfiguracionUsuario2 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/usuario/:correo"
          element={
            <ProtectedRoute role={['administrador']}>
              <ManageSaldoAdmin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/configuracion"
          element={
            <ProtectedRoute role={['administrador']}>
              <Configuracion3/>
            </ProtectedRoute>
          }
        />
        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>


  );
};

export default App;
