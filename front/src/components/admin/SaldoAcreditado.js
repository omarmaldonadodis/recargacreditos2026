// src/components/admin/SaldoAcreditado.js

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const SaldoAcreditado = () => {
  const { user } = useParams();


  useEffect(() => {
  }, [user]);

  return (
    <div>
      <h1>Saldo Acreditado</h1>
      <p>Mostrando saldo acreditado para el usuario con ID: {user}</p>
     
    </div>
  );
};

export default SaldoAcreditado;
