const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

class GestopagoService {
  constructor() {
    this.parser = new XMLParser();
    this.urlAbonar = 'https://gestopago.portalventas.net/sistema/service/abonar.do';
    this.urlConfirmar = 'https://gestopago.portalventas.net/sistema/service/confirmaTransaccion.do';
    
    // Cache para prevenir doble click (guarda en memoria por 2 minutos)
    this.transaccionesEnProceso = new Map();
  }

  /**
   * Obtiene las credenciales según la operadora
   */
  getCredenciales(operadora) {
    const companiasPrimarias = ['Movistar', 'Bait', 'FreedomPop', 'Newww'];
    
    if (companiasPrimarias.includes(operadora)) {
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
   * Verifica si hay una transacción duplicada en proceso
   */
  verificarDuplicado(usuarioId, telefono, valor) {
    const key = `${usuarioId}-${telefono}-${valor}`;
    
    if (this.transaccionesEnProceso.has(key)) {
      const tiempoTranscurrido = Date.now() - this.transaccionesEnProceso.get(key);
      if (tiempoTranscurrido < 120000) { // 2 minutos
        return true; // Es duplicado
      }
    }
    
    return false;
  }

  /**
   * Marca una transacción como en proceso
   */
  marcarEnProceso(usuarioId, telefono, valor) {
    const key = `${usuarioId}-${telefono}-${valor}`;
    this.transaccionesEnProceso.set(key, Date.now());
    
    // Auto-limpiar después de 2 minutos
    setTimeout(() => {
      this.transaccionesEnProceso.delete(key);
    }, 120000);
  }

  /**
   * Libera una transacción del cache
   */
  liberarTransaccion(usuarioId, telefono, valor) {
    const key = `${usuarioId}-${telefono}-${valor}`;
    this.transaccionesEnProceso.delete(key);
  }

  /**
   * Realiza una recarga en GestoPago
   */
  async realizarRecarga({ usuarioId, operadora, telefono, idServicio, idProducto, valor }) {
    // Verificar duplicado
    if (this.verificarDuplicado(usuarioId, telefono, valor)) {
      throw { 
        codigo: 'DUPLICADO', 
        mensaje: 'Ya existe una transacción en proceso para este número' 
      };
    }

    // Marcar como en proceso
    this.marcarEnProceso(usuarioId, telefono, valor);

    const { idDistribuidor, codigoDispositivo, password } = this.getCredenciales(operadora);
    
    const params = `idDistribuidor=${idDistribuidor}&codigoDispositivo=${codigoDispositivo}&password=${password}&telefono=${telefono}&idServicio=${idServicio}&idProducto=${idProducto}`;

    try {
      const response = await axios.post(this.urlAbonar, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 62000
      });

      const resultado = this.parsearRespuesta(response.data);
      
      // Si es exitoso o duplicado, liberar
      if (resultado.exitoso || resultado.codigo === 6) {
        this.liberarTransaccion(usuarioId, telefono, valor);
      }
      
      return resultado;

    } catch (error) {
      // Liberar en caso de error
      this.liberarTransaccion(usuarioId, telefono, valor);
      
      if (error.code === 'ECONNABORTED') {
        throw { codigo: 'TIMEOUT', mensaje: 'Tiempo de espera agotado' };
      }
      throw { codigo: 'ERROR_RED', mensaje: error.message };
    }
  }

  /**
   * Confirma una transacción en GestoPago
   */
  async confirmarTransaccion({ operadora, telefono, idServicio, idProducto }) {
    const { idDistribuidor, codigoDispositivo, password } = this.getCredenciales(operadora);
    
    const params = `idDistribuidor=${idDistribuidor}&codigoDispositivo=${codigoDispositivo}&password=${password}&telefono=${telefono}&idServicio=${idServicio}&idProducto=${idProducto}`;

    try {
      const response = await axios.post(this.urlConfirmar, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 30000
      });

      return this.parsearRespuesta(response.data);

    } catch (error) {
      throw { codigo: 'ERROR_CONFIRMACION', mensaje: error.message };
    }
  }

  /**
   * Parsea la respuesta XML de GestoPago
   */
  parsearRespuesta(xmlData) {
    try {
      const result = this.parser.parse(xmlData);
      const codigo = parseInt(result?.RESPONSE?.MENSAJE?.CODIGO);
      const texto = result?.RESPONSE?.MENSAJE?.TEXTO;
      const folio = result?.RESPONSE?.NUM_AUTORIZACION;

      return {
        exitoso: codigo === 1 || codigo === 6,
        codigo,
        mensaje: texto || 'Sin mensaje',
        folio: folio ? folio.toString() : null
      };
    } catch (error) {
      throw { codigo: 'ERROR_PARSEO', mensaje: 'Error parseando respuesta XML' };
    }
  }
}

module.exports = new GestopagoService();