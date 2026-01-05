import React from 'react';
import { Nav } from 'react-bootstrap';

const Sidebar = ({ user }) => {
  return (
    <Nav className="col-md-12 d-none d-md-block bg-light sidebar">
      <div className="sidebar-sticky">
        {user && user.role === 'administrador' && (
          <>
            <Nav.Link href="/admin/dashboard">Dashboard Admin</Nav.Link>
            <Nav.Link href="/admin/users">Gestionar Usuarios</Nav.Link>
            <Nav.Link href="/admin/recargas">Gestionar Recargas</Nav.Link>
          </>
        )}
        {user && user.role === 'vendedor' && (
          <>
            <Nav.Link href="/vendedor/dashboard">Dashboard Vendedor</Nav.Link>
            <Nav.Link href="/vendedor/tiendas">Gestionar Tiendas</Nav.Link>
            <Nav.Link href="/vendedor/add-saldo">Acreditar Saldo</Nav.Link>
          </>
        )}
        {user && user.role === 'tienda' && (
          <>
            <Nav.Link href="/tienda/dashboard">Dashboard Tienda</Nav.Link>
            <Nav.Link href="/tienda/ver-saldo">Ver Saldo</Nav.Link>
            <Nav.Link href="/tienda/hacer-recarga">Hacer Recarga</Nav.Link>
          </>
        )}
      </div>
    </Nav>
  );
};

export default Sidebar;
