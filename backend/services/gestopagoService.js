// backend/services/gestopagoService.js
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

class GestopagoService {
  constructor() {
    this.parser = new XMLParser();
    this.urlAbonar = 'https://gestopago.portalventas.net/sistema/service/abonar.do';
    this.urlConfirmar = 'https://gestopago.portalventas.net/sistema/service/confirmaTransaccion.do';
    this.transaccionesEnProceso = new Map();
  }

  /**
   * Determina qué proveedor usar según la operadora
   */
  getProveedor(operadora) {
    const companiasPrimarias = ['Movistar', 'Bait', 'FreedomPop', 'Newww'];
    return companiasPrimarias.includes(operadora) ? 'movistar' : 'general';
  }

  /**
   * Obtiene las credenciales según el proveedor
   */
  getCredencialesPorProveedor(proveedor) {
    if (proveedor === 'movistar') {
      return {
        idDistribuidor: '2612',
        codigoDispositivo: 'GPS2612-TPV-02',
        password: 'eg2612'
      };
    }
    
    return {
      idDistribuidor: '2611',
      codigoDispositivo: 'GPS2611-TPV-02',
      password: '2611eg'
    };
  }

  /**
   * Obtiene las credenciales según la operadora (mantiene compatibilidad)
   */
  getCredenciales(operadora) {
    const proveedor = this.getProveedor(operadora);
    return this.getCredencialesPorProveedor(proveedor);
  }

  verificarDuplicado(usuarioId, telefono, valor) {
    const key = `${usuarioId}-${telefono}-${valor}`;
    
    if (this.transaccionesEnProceso.has(key)) {
      const tiempoTranscurrido = Date.now() - this.transaccionesEnProceso.get(key);
      if (tiempoTranscurrido < 120000) {
        return true;
      }
    }
    
    return false;
  }

  marcarEnProceso(usuarioId, telefono, valor) {
    const key = `${usuarioId}-${telefono}-${valor}`;
    this.transaccionesEnProceso.set(key, Date.now());
    
    setTimeout(() => {
      this.transaccionesEnProceso.delete(key);
    }, 120000);
  }

  liberarTransaccion(usuarioId, telefono, valor) {
    const key = `${usuarioId}-${telefono}-${valor}`;
    this.transaccionesEnProceso.delete(key);
  }

  async realizarRecarga({ usuarioId, operadora, telefono, idServicio, idProducto, valor }) {
    if (this.verificarDuplicado(usuarioId, telefono, valor)) {
      throw { 
        codigo: 'DUPLICADO', 
        mensaje: 'Ya existe una transacción en proceso para este número' 
      };
    }

    this.marcarEnProceso(usuarioId, telefono, valor);

    const proveedor = this.getProveedor(operadora);
    const { idDistribuidor, codigoDispositivo, password } = this.getCredencialesPorProveedor(proveedor);
    
    const params = `idDistribuidor=${idDistribuidor}&codigoDispositivo=${codigoDispositivo}&password=${password}&telefono=${telefono}&idServicio=${idServicio}&idProducto=${idProducto}`;

    try {
      const response = await axios.post(this.urlAbonar, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 62000
      });

      const resultado = this.parsearRespuesta(response.data);
      
      // Agregar el proveedor al resultado
      resultado.proveedor = proveedor;
      
      if (resultado.exitoso || resultado.codigo === 6) {
        this.liberarTransaccion(usuarioId, telefono, valor);
      }
      
      return resultado;

    } catch (error) {
      this.liberarTransaccion(usuarioId, telefono, valor);
      
      if (error.code === 'ECONNABORTED') {
        throw { codigo: 'TIMEOUT', mensaje: 'Tiempo de espera agotado' };
      }
      throw { codigo: 'ERROR_RED', mensaje: error.message };
    }
  }

  async confirmarTransaccion({ operadora, telefono, idServicio, idProducto }) {
    const proveedor = this.getProveedor(operadora);
    const { idDistribuidor, codigoDispositivo, password } = this.getCredencialesPorProveedor(proveedor);
    
    const params = `idDistribuidor=${idDistribuidor}&codigoDispositivo=${codigoDispositivo}&password=${password}&telefono=${telefono}&idServicio=${idServicio}&idProducto=${idProducto}`;

    try {
      const response = await axios.post(this.urlConfirmar, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 30000
      });

      const resultado = this.parsearRespuesta(response.data);
      resultado.proveedor = proveedor;
      
      return resultado;

    } catch (error) {
      throw { codigo: 'ERROR_CONFIRMACION', mensaje: error.message };
    }
  }

  parsearRespuesta(xmlData) {
    try {
      const result = this.parser.parse(xmlData);
      const response = result?.RESPONSE;
      
      const codigo = parseInt(response?.MENSAJE?.CODIGO);
      const texto = response?.MENSAJE?.TEXTO;
      const folio = response?.NUM_AUTORIZACION;
      const saldo = response?.SALDO ? parseFloat(response.SALDO) : null;
      const comision = response?.COMISION ? parseFloat(response.COMISION) : null;

      return {
        exitoso: codigo === 1 || codigo === 6,
        codigo,
        mensaje: texto || 'Sin mensaje',
        folio: folio ? folio.toString() : null,
        saldo: saldo,
        comision: comision
      };
    } catch (error) {
      throw { codigo: 'ERROR_PARSEO', mensaje: 'Error parseando respuesta XML' };
    }
  }
}

module.exports = new GestopagoService();