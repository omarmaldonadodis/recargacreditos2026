import React, { useState, useEffect, useRef } from "react";
import { Modal,Container, Row, Col, Card, Button, Spinner } from "react-bootstrap";
import { FaArrowLeft, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import axios from "axios";
import telcelLogo from "../../assets/Telcel-Logo.jpg";
import movistarLogo from "../../assets/logo-Movista.png";
import unefoneLogo from "../../assets/Unefon.png";
import attLogo from "../../assets/ATT.svg";
import abibLogo from "../../assets/ATT.svg";
import viriginMobileLogo from "../../assets/Virgin_Mobile.png";

import virginLogo from "../../assets/Virgin.jpg";
import { XMLParser } from "fast-xml-parser"; // Importar fast-xml-parser
import "./HacerRecarga.css";
import api from "../../services/axiosConfig";
const HacerRecarga = () => {
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState("");
  const [activo, setActivo] = useState(false);

  const [recargaType, setRecargaType] = useState("");
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [transactionSuccess, setTransactionSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [userVerified, setUserVerified] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [saldo, setSaldo] = useState(null);
  const [geoPermissionRequested, setGeoPermissionRequested] = useState(false);
  const headerRef = useRef(null); // Referencia al header para observarlo
  const [isSticky, setIsSticky] = useState(false);

  const [loading, setLoading] = useState(false); // Estado de carga

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // entry.isIntersecting será true si el header está en la vista
        setIsSticky(!entry.isIntersecting); // Si no está intersectando, activamos sticky
      },
      { root: null, threshold: 0, rootMargin: "-60px" } // rootMargin se ajusta para tomar en cuenta el navbar
    );

    if (headerRef.current) {
      observer.observe(headerRef.current); // Observamos el header
    }

    return () => {
      if (headerRef.current) {
        observer.unobserve(headerRef.current); // Limpiamos la observación al desmontar
      }
    };
  }, []);

  const companies = [
    { name: "Telcel", logo: telcelLogo },
    { name: "Movistar", logo: movistarLogo },
    { name: "Unefon", logo: unefoneLogo },
    { name: "AT&T", logo: attLogo },
    { name: "Virgin", logo: viriginMobileLogo },
    {
      name: "Abib",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/2284.png",
    },
    {
      name: "Axios",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/2035.png",
    },
    {
      name: "Bait",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/1487.png",
    },

    {
      name: "Beneleit",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/2281.png",
    },
    {
      name: "ComparTfon",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/157.png",
    },
    {
      name: "Diri",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/1446.png",
    },
    {
      name: "Flash",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/683.png",
    },
    {
      name: "FreedomPop",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/1128.png",
    },

    {
      name: "Internet para el Bienestar",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/2962.png",
    },
    {
      name: "JRMovil",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/1532.png",
    },
    {
      name: "LikePhone",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/140.png",
    },
    {
      name: "MiMovil",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/1386.png",
    },
    {
      name: "Netwey",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/126.png",
    },
    {
      name: "Newww",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/1538.png",
    },

    {
      name: "Oui Movil",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/78.png",
    },
    {
      name: "Pillofon",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/1449.png",
    },
    {
      name: "Rincel",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/2122.png",
    },
    {
      name: "Simon",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/161.png",
    },
    {
      name: "Soriana Movil",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/1458.png",
    },
    {
      name: "Telmovil",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/1493.png",
    },
    {
      name: "Tricomx",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/1526.png",
    },
    {
      name: "Ultracel",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/2152.png",
    },

    {
      name: "Valor",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/1263.png",
    },

    {
      name: "WIK",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/2023.png",
    },
    {
      name: "WiMoMovil",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/696.png",
    },

    {
      name: "Yobi",
      logo: "https://gestopago.portalventas.net/sistema/images/gestopago/servicios/1428.png",
    },
  ];

  // // Tipos y montos de recarga para cada operadora
  // const recargasConfig = {
  //   Telcel: {
  //     types: [
  //       { name: "Paquete", idServicio: "3" },
  //       { name: "Llamada", idServicio: "4" },
  //       { name: "Internet", idServicio: "5" },
  //     ],

  //     amounts: [
  //       { value: 50, idProducto: "3" },
  //       { value: 100, idProducto: "4" },
  //       // Agrega más valores según corresponda
  //     ],types: ["Paquete", "Llamada", "Internet"],
  //     amounts: [
  //       { value: 50, idProducto: "3" },
  //       { value: 100, idProducto: "4" },
  //       // Agrega más valores según corresponda
  //     ],
  //   },
  //   Movistar: {
  //     types: ["Paquete"],
  //     amounts: [
  //       { value: 10, idProducto: "373" },
  //       { value: 20, idProducto: "374" },
  //       { value: 30, idProducto: "375" },
  //       { value: 40, idProducto: "376" },
  //       { value: 50, idProducto: "377" },
  //       { value: 60, idProducto: "378" },
  //       { value: 70, idProducto: "379" },
  //       { value: 80, idProducto: "380" },
  //       { value: 100, idProducto: "381" },
  //       { value: 120, idProducto: "382" },
  //       { value: 150, idProducto: "383" },
  //       { value: 200, idProducto: "384" },
  //       { value: 250, idProducto: "385" },
  //       { value: 300, idProducto: "386" },
  //       { value: 400, idProducto: "387" },
  //       { value: 500, idProducto: "388" },
  //     ],
  //   },
  //   Unefone: {
  //     types: ["Llamada", "Internet"],
  //     amounts: [
  //       { value: 50, idProducto: "50" },
  //       { value: 100, idProducto: "100" },
  //       // Agrega más valores según corresponda
  //     ],
  //   },
  //   "AT&T": {
  //     types: ["Paquete", "Llamada"],
  //     amounts: [
  //       { value: 50, idProducto: "50" },
  //       { value: 100, idProducto: "100" },
  //       // Agrega más valores según corresponda
  //     ],
  //   },
  //   Virgin: {
  //     types: ["Paquete", "Internet"],
  //     amounts: [
  //       { value: 30, idProducto: "30" },
  //       { value: 50, idProducto: "50" },
  //       // Agrega más valores según corresponda
  //     ],
  //   },
  // };

  // Tipos y montos de recarga para cada operadora
  const recargasConfig = {
    Telcel: {
      types: [
        {
          name: "Telcel",
          idServicio: "133",
          amounts: [
            { value: 10, idProducto: "582" },
            { value: 20, idProducto: "403" },
            { value: 30, idProducto: "404" },
            { value: 50, idProducto: "405" },
            { value: 80, idProducto: "7222" },
            { value: 100, idProducto: "406" },
            { value: 150, idProducto: "407" },
            { value: 200, idProducto: "408" },
            { value: 300, idProducto: "409" },
            { value: 500, idProducto: "410" },
          ],
        },
        {
          name: "Paquete Amigo",
          idServicio: "159",
          amounts: [
            { value: 20, idProducto: "5760" },
            { value: 30, idProducto: "638" },
            { value: 50, idProducto: "639" },
            { value: 80, idProducto: "7219" },
            { value: 100, idProducto: "640" },
            { value: 150, idProducto: "641" },
            { value: 200, idProducto: "642" },
            { value: 300, idProducto: "643" },
            { value: 500, idProducto: "644" },
          ],
        },
        {
          name: "Paquetes de Datos",
          idServicio: "160",
          amounts: [
            { value: 20, idProducto: "543" },
            { value: 30, idProducto: "7033" },
            { value: 50, idProducto: "544" },
            { value: 100, idProducto: "545" },
            { value: 150, idProducto: "546" },
            { value: 200, idProducto: "548" },
            { value: 300, idProducto: "547" },
            { value: 500, idProducto: "552" },
          ],
        },
      ],
    },
    Movistar: {
      types: [
        {
          name: "Paquete",
          idServicio: "124",
          amounts: [
            { value: 10, idProducto: "373" },
            { value: 20, idProducto: "374" },
            { value: 30, idProducto: "375" },
            { value: 40, idProducto: "376" },
            { value: 50, idProducto: "377" },
            { value: 60, idProducto: "378" },
            { value: 70, idProducto: "379" },
            { value: 80, idProducto: "380" },
            { value: 100, idProducto: "381" },
            { value: 120, idProducto: "382" },
            { value: 150, idProducto: "383" },
            { value: 200, idProducto: "384" },
            { value: 250, idProducto: "385" },
            { value: 300, idProducto: "386" },
            { value: 400, idProducto: "387" },
            { value: 500, idProducto: "388" },
          ],
        },
      ],
    },
    Unefon: {
      types: [
        {
          name: "Recarga",
          idServicio: "116",
          amounts: [
            { value: 10.0, idProducto: "579" },
            { value: 15.0, idProducto: "7725" },
            { value: 20.0, idProducto: "499" },
            { value: 30.0, idProducto: "500" },
            { value: 50.0, idProducto: "306" },
            { value: 70.0, idProducto: "580" },
            { value: 100.0, idProducto: "307" },
            { value: 150.0, idProducto: "308" },
            { value: 200.0, idProducto: "309" },
            { value: 300.0, idProducto: "310" },
            { value: 500.0, idProducto: "311" },
          ],
        },
      ],
    },
    "AT&T": {
      types: [
        {
          name: "Recarga",
          idServicio: "115",
          amounts: [
            { value: 10, idProducto: "577" },
            { value: 15, idProducto: "7722" },
            { value: 20, idProducto: "495" },
            { value: 30, idProducto: "496" },
            { value: 50, idProducto: "298" },
            { value: 70, idProducto: "578" },
            { value: 100, idProducto: "299" },
            { value: 150, idProducto: "300" },
            { value: 200, idProducto: "301" },
            { value: 300, idProducto: "302" },
            { value: 500, idProducto: "303" },
          ],
        },
      ],
    },
    Virgin: {
      types: [
        {
          name: "Recarga",
          idServicio: "104",
          amounts: [
            { value: 10, idProducto: "18583" },
            { value: 20, idProducto: "261" },
            { value: 30, idProducto: "262" },
            { value: 40, idProducto: "263" },
            { value: 50, idProducto: "264" },
            { value: 80, idProducto: "18584" },
            { value: 100, idProducto: "265" },
            { value: 150, idProducto: "266" },
            { value: 200, idProducto: "267" },
            { value: 250, idProducto: "5746" },
            { value: 300, idProducto: "268" },
            { value: 400, idProducto: "18550" },
            { value: 500, idProducto: "269" },
            { value: 700, idProducto: "18551" },
          ],
        },
      ],
    },
    Abib: {
      types: [
        {
          name: "Internet",
          idServicio: "2284",
          amounts: [
            { value: 45.0, idProducto: "18575", descripcion: "3 DÍAS 4GB" },
            { value: 55.0, idProducto: "18102", descripcion: "55 7 DÍAS" },
            {
              value: 55.0,
              idProducto: "18576",
              descripcion: "7 DÍAS 3GB+Redes",
            },
            {
              value: 65.0,
              idProducto: "18577",
              descripcion: "7 DÍAS 10GB+Redes",
            },
            { value: 85.0, idProducto: "18104", descripcion: "10 DÍAS" },
            { value: 100.0, idProducto: "18578", descripcion: "15D/6GB+Redes" },
            { value: 115.0, idProducto: "18580", descripcion: "30D/3GB+RSSS" },
            { value: 120.0, idProducto: "18581", descripcion: "30D/5GB+RSSS" },
            { value: 125.0, idProducto: "18579", descripcion: "15D/20GB+RSSS" },
            { value: 200.0, idProducto: "18109", descripcion: "15GB ILIM 30D" },
            { value: 220.0, idProducto: "18110", descripcion: "40GB 30 DÍAS" },
            {
              value: 297.0,
              idProducto: "18111",
              descripcion: "40GB PLUS 3 DÍAS",
            },
            { value: 499.0, idProducto: "18112", descripcion: "100GB 30 DÍAS" },
          ],
        },
      ],
    },
    Axios: {
      types: [
        {
          name: "Paquete",
          idServicio: "2035",
          amounts: [
            { value: 12.0, idProducto: "18303" },
            { value: 25.0, idProducto: "18113" },
            { value: 35.0, idProducto: "18304" },
            { value: 50.0, idProducto: "12676" },
            { value: 100.0, idProducto: "18115", descripcion: "Mas Dias" },
            { value: 100.0, idProducto: "18116", descripcion: "Mas Megas" },
            {
              value: 120.0,
              idProducto: "18305",
              descripcion: "Ilimitado Mas Megas",
            },
            { value: 150.0, idProducto: "12682" },
            { value: 200.0, idProducto: "18118", descripcion: "Ilimitado 200" },
            {
              value: 230.0,
              idProducto: "18119",
              descripcion: "Ilimitado 40 GB",
            },
            { value: 300.0, idProducto: "12688" },
            {
              value: 300.0,
              idProducto: "18120",
              descripcion: "TRIMESTRAL 5 GB",
            },
            { value: 500.0, idProducto: "12691", descripcion: "500" },
            {
              value: 550.0,
              idProducto: "18122",
              descripcion: "SEMESTRAL 5 GB",
            },
            {
              value: 550.0,
              idProducto: "18121",
              descripcion: "TRIMESTRAL 40 GB",
            },
            { value: 1000.0, idProducto: "18124", descripcion: "ANUAL 5 GB" },
            {
              value: 1050.0,
              idProducto: "18123",
              descripcion: "SEMESTRAL 40 GB",
            },
            { value: 2000.0, idProducto: "18125", descripcion: "ANUAL 40 GB" },
          ],
        },
      ],
    },
    Beneleit: {
      types: [
        {
          name: "Paquete",
          idServicio: "2281",
          amounts: [
            { value: 35.0, idProducto: "14251", descripcion: "Conecta 3" },
            { value: 80.0, idProducto: "18356", descripcion: "CONECTA 7 RRSS" },
            { value: 105.0, idProducto: "18357", descripcion: "TOTAL 7 RRSS" },
            {
              value: 125.0,
              idProducto: "18359",
              descripcion: "CONEXION 15 RRSS",
            },
            { value: 165.0, idProducto: "18358", descripcion: "TOTAL 15 RRSS" },
            { value: 170.0, idProducto: "18361", descripcion: "CONECTA RRSS" },
            {
              value: 240.0,
              idProducto: "18360",
              descripcion: "EXPANSION RRSS",
            },
            { value: 290.0, idProducto: "18363", descripcion: "CONEXION RRSS" },
            { value: 350.0, idProducto: "18362", descripcion: "TOTAL RRSS" },
            { value: 400.0, idProducto: "14287", descripcion: "Total plus" },
            { value: 700.0, idProducto: "14290", descripcion: "Premium" },
          ],
        },
      ],
    },
    ComparTfon: {
      types: [
        {
          name: "Paquete",
          idServicio: "157",
          amounts: [
            { value: 10.0, idProducto: "8019" },
            { value: 20.0, idProducto: "524" },
            { value: 30.0, idProducto: "525" },
            { value: 40.0, idProducto: "8022" },
            { value: 50.0, idProducto: "526" },
            { value: 70.0, idProducto: "8028" },
            { value: 100.0, idProducto: "527" },
            { value: 150.0, idProducto: "8037" },
            { value: 200.0, idProducto: "528" },
          ],
        },
      ],
    },
    Diri: {
      types: [
        {
          name: "Recarga",
          idServicio: "1446",
          amounts: [
            { value: 80.0, idProducto: "9807", descripcion: "Plan Conoce" },
            { value: 120.0, idProducto: "14350", descripcion: "Plan Fan" },
            { value: 150.0, idProducto: "9810", descripcion: "Plan Explora" },
            { value: 200.0, idProducto: "14353", descripcion: "Plan Causa" },
            { value: 275.0, idProducto: "18321", descripcion: "Plan Superfan" },
            { value: 300.0, idProducto: "9813", descripcion: "Plan Disfruta" },
            { value: 400.0, idProducto: "9816", descripcion: "Plan Comparte" },
            { value: 500.0, idProducto: "9819", descripcion: "Plan Vuela" },
          ],
        },
      ],
    },
    Flash: {
      types: [
        {
          name: "Recarga",
          idServicio: "683",
          amounts: [
            { value: 10.0, idProducto: "5639" },
            { value: 20.0, idProducto: "5640" },
            { value: 30.0, idProducto: "5641" },
            { value: 40.0, idProducto: "5642" },
            { value: 50.0, idProducto: "5643" },
            { value: 60.0, idProducto: "5644" },
            { value: 70.0, idProducto: "5645" },
            { value: 80.0, idProducto: "6539" },
            { value: 100.0, idProducto: "6542" },
            { value: 120.0, idProducto: "6545" },
            { value: 200.0, idProducto: "6548" },
            { value: 250.0, idProducto: "6551" },
            { value: 300.0, idProducto: "6554" },
            { value: 400.0, idProducto: "6557" },
            { value: 500.0, idProducto: "6560" },
          ],
        },
      ],
    },
    "Internet para el Bienestar": {
      types: [
        {
          name: "Paquete",
          idServicio: "2962",
          amounts: [
            {
              value: 50.0,
              idProducto: "18141",
              descripcion: "50 RS Ilimitado",
            },
            {
              value: 60.0,
              idProducto: "18140",
              descripcion: "60 RS Ilimitado",
            },
            {
              value: 99.0,
              idProducto: "18144",
              descripcion: "99 RS Ilimitado",
            },
            {
              value: 100.0,
              idProducto: "18142",
              descripcion: "100 RS Ilimitado",
            },
            {
              value: 119.0,
              idProducto: "18612",
              descripcion: "119 RS Ilimitado",
            },
            {
              value: 120.0,
              idProducto: "18143",
              descripcion: "120 RS Ilimitado",
            },
            {
              value: 140.0,
              idProducto: "18613",
              descripcion: "140 RS Ilimitado",
            },
            {
              value: 200.0,
              idProducto: "18146",
              descripcion: "200 RS Ilimitado",
            },
            {
              value: 230.0,
              idProducto: "18145",
              descripcion: "230 RS Ilimitado",
            },
          ],
        },
      ],
    },
    JRMovil: {
      types: [
        {
          name: "Paquete",
          idServicio: "1532",
          amounts: [
            { value: 50.0, idProducto: "18289", descripcion: "Jr 50+" },
            { value: 60.0, idProducto: "18288", descripcion: "JR 60" },
            { value: 99.0, idProducto: "10283", descripcion: "Plan JR Basico" },
            { value: 120.0, idProducto: "18291", descripcion: "Jr 120+" },
            { value: 130.0, idProducto: "18085", descripcion: "JR 130" },
            { value: 200.0, idProducto: "18293", descripcion: "Jr 200+" },
            { value: 230.0, idProducto: "18292", descripcion: "Jr 230" },
          ],
        },
        {
          name: "Mifi",
          idServicio: "1529",
          amounts: [
            { value: 130.0, idProducto: "10259", descripcion: "JR5 MiFi" },
            { value: 230.0, idProducto: "10262", descripcion: "JR10 MiFi" },
            { value: 290.0, idProducto: "10265", descripcion: "JR20 MiFi" },
            { value: 520.0, idProducto: "10268", descripcion: "JR30 MiFi" },
            { value: 650.0, idProducto: "10271", descripcion: "JR50 MiFi" },
          ],
        },
      ],
    },
    LikePhone: {
      types: [
        {
          name: "Recarga",
          idServicio: "140",
          amounts: [
            { value: 75.0, idProducto: "18668", descripcion: "LIKE FLEX" },
            { value: 87.0, idProducto: "18662", descripcion: "LIKE SKINNY" },
            { value: 159.0, idProducto: "18669", descripcion: "LIKE SOCIAL" },
            { value: 169.0, idProducto: "18670", descripcion: "LIKE CONNECT" },
            { value: 182.0, idProducto: "18663", descripcion: "LIKE SLIM" },
            { value: 189.0, idProducto: "18664", descripcion: "LIKE WIDE" },
            { value: 255.0, idProducto: "18671", descripcion: "LIKE TRENDY" },
            { value: 296.0, idProducto: "18665", descripcion: "LIKE REGULAR" },
            { value: 349.0, idProducto: "18666", descripcion: "LIKE RELAX" },
            { value: 715.0, idProducto: "18667", descripcion: "LIKE EXTRA" },
          ],
        },
      ],
    },
    MiMovil: {
      types: [
        {
          name: "Paquete",
          idServicio: "1386",
          amounts: [
            {
              value: 50.0,
              idProducto: "9516",
              descripcion: "Plan $50 (7 dias 5000MB)",
            },
            {
              value: 65.0,
              idProducto: "12775",
              descripcion: "Plan $65 (10 dias 5000MB)",
            },
            { value: 80.0, idProducto: "18147", descripcion: "PLAN 80" },
            {
              value: 100.0,
              idProducto: "9519",
              descripcion: "Plan $100 (30 dias 5000MB)",
            },
            { value: 150.0, idProducto: "18148", descripcion: "PLAN 150" },
            {
              value: 165.0,
              idProducto: "17293",
              descripcion: "Plan $165 (30 dias 5000MB)",
            },
            {
              value: 200.0,
              idProducto: "9522",
              descripcion: "Plan $200 (30 dias MB ilimitados)",
            },
            { value: 280.0, idProducto: "18149", descripcion: "PLAN 280" },
            {
              value: 300.0,
              idProducto: "9525",
              descripcion: "Plan $300 (30 dias MB ilimitados HotSpot)",
            },
            { value: 400.0, idProducto: "18150", descripcion: "PLAN 400" },
            {
              value: 750.0,
              idProducto: "18151",
              descripcion: "Plan 5GB  x 6 meses",
            },
            {
              value: 1350.0,
              idProducto: "18152",
              descripcion: "Plan 5GB x 12 meses",
            },
            {
              value: 1400.0,
              idProducto: "18153",
              descripcion: "Plan 40GB x 6 meses",
            },
            {
              value: 2500.0,
              idProducto: "18154",
              descripcion: "Plan 40GB x 12 meses",
            },
          ],
        },
      ],
    },
    Netwey: {
      types: [
        {
          name: "Internet Prepagado Hogar",
          idServicio: "126",
          amounts: [
            {
              value: 109.0,
              idProducto: "390",
              descripcion: "Hogar Semanal (20GB - 7dias)",
            },
            {
              value: 139.0,
              idProducto: "7962",
              descripcion: "Hogar Semanal Grande (30GB - 7dias)",
            },
            {
              value: 389.0,
              idProducto: "7965",
              descripcion: "Hogar Mensual Basico (90GB - 30dias)",
            },
            {
              value: 499.0,
              idProducto: "7968",
              descripcion: "Hogar Mensual Grande (120GB - 30dias)",
            },
            {
              value: 549.0,
              idProducto: "7971",
              descripcion: "Hogar Mensual Gigante (140GB - 30dias)",
            },
          ],
        },
        {
          name: "Internet Prepagado Movil",
          idServicio: "126",
          amounts: [
            {
              value: 89.0,
              idProducto: "12340",
              descripcion: "Movil Semanal (10GB - 7dias)",
            },
            {
              value: 149.0,
              idProducto: "12343",
              descripcion: "Movil Semanal Grande (20GB - 7dias)",
            },
            {
              value: 429.0,
              idProducto: "12346",
              descripcion: "Movil Mensual (30GB - 30dias)",
            },
            {
              value: 549.0,
              idProducto: "12349",
              descripcion: "Movil Mensual Grande (50GB - 30dias)",
            },
          ],
        },
        {
          name: "Movil",
          idServicio: "88",
          amounts: [
            {
              value: 40.0,
              idProducto: "626",
              descripcion: "Paquete $40 (3 dias - 2GB - 250min)",
            },
            {
              value: 65.0,
              idProducto: "218",
              descripcion: "Paquete $65 (7 dias - 5GB - 500min)",
            },
            {
              value: 125.0,
              idProducto: "8001",
              descripcion: "Paquete $125 (30 dias - 5GB - 1500min)",
            },
            {
              value: 250.0,
              idProducto: "8004",
              descripcion: "Paquete $250 (30 dias - 20GB - 1500min)",
            },
          ],
        },
      ],
    },
    "Oui Movil": {
      types: [
        {
          name: "Recarga",
          idServicio: "78",
          amounts: [
            { value: 10.0, idProducto: "12871" },
            { value: 15.0, idProducto: "12874" },
            { value: 20.0, idProducto: "12877" },
            { value: 25.0, idProducto: "12880" },
            { value: 30.0, idProducto: "208" },
            { value: 35.0, idProducto: "12883" },
            { value: 40.0, idProducto: "219" },
            { value: 45.0, idProducto: "12886" },
            { value: 50.0, idProducto: "220" },
            { value: 60.0, idProducto: "221" },
            { value: 80.0, idProducto: "222" },
            { value: 100.0, idProducto: "223" },
            { value: 120.0, idProducto: "12889" },
            { value: 150.0, idProducto: "225" },
            { value: 200.0, idProducto: "226" },
            { value: 240.0, idProducto: "12892" },
            { value: 300.0, idProducto: "7429" },
            { value: 350.0, idProducto: "7432" },
          ],
        },
      ],
    },
    Pillofon: {
      types: [
        {
          name: "Plan",
          idServicio: "1449",
          amounts: [
            { value: 90.0, idProducto: "9840", descripcion: "Recarga Rifate" },
            { value: 150.0, idProducto: "9843", descripcion: "Plan Capo" },
            { value: 200.0, idProducto: "9846", descripcion: "Plan Chido" },
            { value: 300.0, idProducto: "18126", descripcion: "Plan Idolo" },
            { value: 350.0, idProducto: "9849", descripcion: "Plan Crack" },
            { value: 420.0, idProducto: "9852", descripcion: "Plan Perro" },
            { value: 600.0, idProducto: "9855", descripcion: "Plan OLV" },
          ],
        },
      ],
    },
    Rincel: {
      types: [
        {
          name: "Plan",
          idServicio: "2122",
          amounts: [
            { value: 40.0, idProducto: "13348", descripcion: "RIN 03" },
            { value: 50.0, idProducto: "13330", descripcion: "RIN 3" },
            {
              value: 80.0,
              idProducto: "18373",
              descripcion: "RIN 7 ILIMITADO",
            },
            { value: 110.0, idProducto: "18378", descripcion: "RIN 30 RRSS" },
            {
              value: 135.0,
              idProducto: "18375",
              descripcion: "RIN 15 ILIMITADO",
            },
            {
              value: 150.0,
              idProducto: "18377",
              descripcion: "RIN 30 ILIMITADO",
            },
            { value: 200.0, idProducto: "18380", descripcion: "RINO RRSS" },
            {
              value: 250.0,
              idProducto: "18379",
              descripcion: "RINO ILIMITADO",
            },
            { value: 299.0, idProducto: "13345", descripcion: "RINO +" },
          ],
        },
      ],
    },
    Simon: {
      types: [
        {
          name: "Plan",
          idServicio: "161",
          amounts: [
            { value: 50.0, idProducto: "562", descripcion: "Toston" },
            { value: 100.0, idProducto: "563", descripcion: "Fregon" },
            { value: 150.0, idProducto: "564", descripcion: "Perron" },
            { value: 200.0, idProducto: "565", descripcion: "Picudon" },
            { value: 500.0, idProducto: "17684", descripcion: "Freson" },
          ],
        },
      ],
    },
    "Soriana Movil": {
      types: [
        {
          name: "Plan",
          idServicio: "1458",
          amounts: [
            {
              value: 30.0,
              idProducto: "9876",
              descripcion: "Mas Ahorro 3 dias",
            },
            {
              value: 50.0,
              idProducto: "9879",
              descripcion: "Mas Ahorro 7 dias",
            },
            {
              value: 100.0,
              idProducto: "9882",
              descripcion: "Mas Ahorro 15 dias",
            },
            {
              value: 130.0,
              idProducto: "9885",
              descripcion: "Mas Ahorro 26 dias",
            },
            {
              value: 150.0,
              idProducto: "9888",
              descripcion: "Mas Ahorro 30 dias",
            },
            {
              value: 250.0,
              idProducto: "9891",
              descripcion: "Mas Ahorro 30 dias Plus",
            },
          ],
        },
      ],
    },
    Telmovil: {
      types: [
        {
          name: "Plan",
          idServicio: "1493",
          amounts: [
            {
              value: 30.0,
              idProducto: "10088",
              descripcion: "Telmov 30-3D ilimitado",
            },
            {
              value: 50.0,
              idProducto: "10091",
              descripcion: "Telmov 50-7D ilimitado",
            },
            {
              value: 100.0,
              idProducto: "10094",
              descripcion: "Telmov 30D-100",
            },
            {
              value: 200.0,
              idProducto: "10097",
              descripcion: "Telmov 200-30D ilimitado",
            },
            {
              value: 300.0,
              idProducto: "10100",
              descripcion: "Telmov 300-30D Todos",
            },
          ],
        },
      ],
    },
    Tricomx: {
      types: [
        {
          name: "Plan",
          idServicio: "1526",
          amounts: [
            { value: 50.0, idProducto: "10235" },
            { value: 100.0, idProducto: "10238" },
            { value: 150.0, idProducto: "10241" },
            { value: 200.0, idProducto: "10244" },
          ],
        },
      ],
    },
    Ultracel: {
      types: [
        {
          name: "Paquete",
          idServicio: "2152",
          amounts: [
            { value: 55.0, idProducto: "18093" },
            { value: 65.0, idProducto: "18092" },
            { value: 105.0, idProducto: "18095" },
            { value: 110.0, idProducto: "18097" },
            { value: 125.0, idProducto: "18094" },
            { value: 135.0, idProducto: "18096" },
            { value: 210.0, idProducto: "18099" },
            { value: 240.0, idProducto: "18098" },
            { value: 330.0, idProducto: "18100" },
            { value: 510.0, idProducto: "18101" },
          ],
        },
        {
          name: "Internet Hogar",
          idServicio: "2155",
          amounts: [
            { value: 99.0, idProducto: "13504" },
            { value: 299.0, idProducto: "13507" },
            { value: 359.0, idProducto: "13510" },
            { value: 399.0, idProducto: "13513" },
            { value: 429.0, idProducto: "13516" },
          ],
        },
        {
          name: "Portatil",
          idServicio: "2158",
          amounts: [
            { value: 125.0, idProducto: "13525" },
            { value: 150.0, idProducto: "13528" },
            { value: 250.0, idProducto: "13531" },
            { value: 399.0, idProducto: "13534" },
            { value: 475.0, idProducto: "13537" },
            { value: 625.0, idProducto: "13540" },
          ],
        },
      ],
    },
    Valor: {
      types: [
        {
          name: "Internet en Casa",
          idServicio: "1263",
          amounts: [
            {
              value: 99.0,
              idProducto: "8661",
              descripcion: "Internet en Casa 5MB 20GB",
            },
            {
              value: 110.0,
              idProducto: "14194",
              descripcion: "Internet en Casa 10MB 20GB",
            },
            {
              value: 349.0,
              idProducto: "8679",
              descripcion: "Internet en Casa 5MB 100GB",
            },
            {
              value: 399.0,
              idProducto: "8667",
              descripcion: "Internet en Casa 10MB 150GB",
            },
            {
              value: 439.0,
              idProducto: "14197",
              descripcion: "Internet en Casa 10MB 180GB",
            },
          ],
        },
        {
          name: "Internet Movil",
          idServicio: "1260",
          amounts: [
            { value: 100.0, idProducto: "18229", descripcion: "MiFi 6GB" },
            { value: 150.0, idProducto: "18354", descripcion: "MiFi 5GB" },
            { value: 239.0, idProducto: "8649", descripcion: "MiFi 10GB" },
            { value: 360.0, idProducto: "8652", descripcion: "MiFi 20GB" },
            { value: 450.0, idProducto: "8655", descripcion: "MiFi 30GB" },
            { value: 590.0, idProducto: "8658", descripcion: "MiFi 50GB" },
          ],
        },
        {
          name: "Telefonía Movil",
          idServicio: "1257",
          amounts: [
            {
              value: 50.0,
              idProducto: "18339",
              descripcion: "Compartir 7 Dias",
            },
            {
              value: 60.0,
              idProducto: "18338",
              descripcion: "Redes Sociales 7 Dias",
            },
            {
              value: 100.0,
              idProducto: "18341",
              descripcion: "Compartir 6GB 15 Dias",
            },
            {
              value: 120.0,
              idProducto: "18340",
              descripcion: "Redes Sociales 15 Dias",
            },
            {
              value: 140.0,
              idProducto: "18342",
              descripcion: "Redes Sociales 30 Dias 5G",
            },
            {
              value: 230.0,
              idProducto: "18343",
              descripcion: "Redes Sociales 30 Dias 40GB",
            },
            {
              value: 300.0,
              idProducto: "18344",
              descripcion: "Compartir 40GB 30 Dias",
            },
            {
              value: 499.0,
              idProducto: "18226",
              descripcion: "Compartir 100GB 30 Dias",
            },
          ],
        },
      ],
    },
    WIK: {
      types: [
        {
          name: "General",
          idServicio: "2023",
          amounts: [
            {
              value: 70.0,
              idProducto: "18421",
              descripcion: "WIK 7 Dias 10 GB",
            },
            {
              value: 110.0,
              idProducto: "18423",
              descripcion: "WIK 15 Dias 6 GB",
            },
            {
              value: 130.0,
              idProducto: "18424",
              descripcion: "WIK 30 Dias 3GB",
            },
            {
              value: 150.0,
              idProducto: "18426",
              descripcion: "WIK 30 Dias 5 GB",
            },
            {
              value: 230.0,
              idProducto: "18425",
              descripcion: "WIK 30 Dias 15 GB",
            },
            {
              value: 250.0,
              idProducto: "18422",
              descripcion: "WIK 30 Dias 40 GB",
            },
            {
              value: 300.0,
              idProducto: "12619",
              descripcion: "Wik ilimitado* 300 p/compartir",
            },
            {
              value: 500.0,
              idProducto: "12622",
              descripcion: "Wik ilimitado* 500 p/compartir",
            },
            {
              value: 550.0,
              idProducto: "18430",
              descripcion: "WIK 6 MESES 40GB",
            },
            {
              value: 670.0,
              idProducto: "18428",
              descripcion: "WIK 6 MESES 5GB",
            },
            {
              value: 1000.0,
              idProducto: "18431",
              descripcion: "WIK 12 MESES 3GB",
            },
            {
              value: 1150.0,
              idProducto: "18429",
              descripcion: "WIK 6 MESES 15GB",
            },
            {
              value: 1200.0,
              idProducto: "18432",
              descripcion: "WIK 12 MESES 5GB",
            },
            {
              value: 1400.0,
              idProducto: "18430",
              descripcion: "WIK 6 MESES 40GB",
            },
            {
              value: 2000.0,
              idProducto: "18433",
              descripcion: "WIK 12 MESES 15GB",
            },
            {
              value: 2500.0,
              idProducto: "18434",
              descripcion: "WIK 12 MESES 40GB",
            },
          ],
        },
        {
          name: "Internet Hogar",
          idServicio: "2026",
          amounts: [
            { value: 85.0, idProducto: "12634", descripcion: "WIK HOGAR 85" },
            { value: 115.0, idProducto: "12637", descripcion: "WIK HOGAR 115" },
            { value: 160.0, idProducto: "12640", descripcion: "WIK HOGAR 160" },
            { value: 370.0, idProducto: "12643", descripcion: "WIK HOGAR 370" },
            { value: 460.0, idProducto: "12646", descripcion: "WIK HOGAR 460" },
            { value: 500.0, idProducto: "12649", descripcion: "WIK HOGAR 500" },
          ],
        },
        {
          name: "Internet MiFi",
          idServicio: "2134",
          amounts: [
            {
              value: 100.0,
              idProducto: "13369",
              descripcion: "WIK MIFI 10 GB 7D",
            },
            {
              value: 125.0,
              idProducto: "13372",
              descripcion: "WIK MIFI 5 GB 30D",
            },
            {
              value: 180.0,
              idProducto: "13375",
              descripcion: "WIK MIFI 20 GB 7D",
            },
            {
              value: 250.0,
              idProducto: "13378",
              descripcion: "WIK MIFI 10 GB 30D",
            },
            {
              value: 350.0,
              idProducto: "13381",
              descripcion: "WIK MIFI 20 GB 30D",
            },
            {
              value: 450.0,
              idProducto: "13384",
              descripcion: "WIK MIFI 30 GB 30D",
            },
            {
              value: 550.0,
              idProducto: "17666",
              descripcion: "WIK MIFI 50 GB 30D",
            },
          ],
        },
      ],
    },
    WiMoMovil: {
      types: [
        {
          name: "Paquete",
          idServicio: "696",
          amounts: [
            { value: 65.0, idProducto: "9048" },
            { value: 80.0, idProducto: "18299" },
            { value: 125.0, idProducto: "9051" },
            { value: 130.0, idProducto: "9057" },
            { value: 145.0, idProducto: "18300" },
            { value: 150.0, idProducto: "18301" },
            { value: 250.0, idProducto: "9054" },
            { value: 280.0, idProducto: "18130" },
          ],
        },
      ],
    },
    Yobi: {
      types: [
        {
          name: "Paquete",
          idServicio: "1428",
          amounts: [
            { value: 30.0, idProducto: "9735" },
            { value: 50.0, idProducto: "9738" },
            { value: 100.0, idProducto: "9741" },
            { value: 150.0, idProducto: "9744" },
            { value: 200.0, idProducto: "9747" },
            { value: 500.0, idProducto: "9750" },
          ],
        },
      ],
    },

    Bait: {
      types: [
        {
          name: "Paquete",
          idServicio: "1487",
          amounts: [
            { value: 30.0, idProducto: "10034", descripcion: "Mi Bait $30" },
            { value: 50.0, idProducto: "10037", descripcion: "Mi Bait $50" },
            { value: 60.0, idProducto: "18230", descripcion: "Mi Bait $60" },
            { value: 100.0, idProducto: "10040", descripcion: "Mi Bait $100" },
            { value: 120.0, idProducto: "18231", descripcion: "Mi Bait $120" },
            { value: 125.0, idProducto: "12154", descripcion: "Mi Bait $125" },
            { value: 200.0, idProducto: "10046", descripcion: "Mi Bait $200" },
            { value: 230.0, idProducto: "18232", descripcion: "Mi Bait $230" },
            { value: 300.0, idProducto: "12157", descripcion: "Mi Bait $300" },
            { value: 550.0, idProducto: "12160", descripcion: "Bait 3 meses" },
            {
              value: 800.0,
              idProducto: "12163",
              descripcion: "Bait 3 meses + HotSpot",
            },
            { value: 1050.0, idProducto: "12166", descripcion: "Bait 6 meses" },
            {
              value: 1500.0,
              idProducto: "12169",
              descripcion: "Bait 6 meses + HotSpot",
            },
            {
              value: 2500.0,
              idProducto: "18461",
              descripcion: "Bait 12 meses Ilimitado",
            },
            {
              value: 2900.0,
              idProducto: "12175",
              descripcion: "Bait 12 meses + HotSpot",
            },
          ],
        },
        {
          name: "Internet en Casa",
          idServicio: "1591",
          amounts: [
            {
              value: 99.0,
              idProducto: "10927",
              descripcion: "Mi Bait en Casa $89 (30GB x 7dias)",
            },
            {
              value: 349.0,
              idProducto: "10930",
              descripcion: "Mi Bait en Casa $329 (120GB x 30dias)",
            },
          ],
        },
        {
          name: "Internet Portátil",
          idServicio: "2170",
          amounts: [
            {
              value: 110.0,
              idProducto: "13564",
              descripcion: "Internet Portátil $110",
            },
            {
              value: 210.0,
              idProducto: "13567",
              descripcion: "Internet Portátil $210",
            },
            {
              value: 410.0,
              idProducto: "13570",
              descripcion: "Internet Portátil $410",
            },
          ],
        },
      ],
    },
    FreedomPop: {
      types: [
        {
          name: "Paquete",
          idServicio: "1128",
          amounts: [
            { value: 30.0, idProducto: "7890" },
            { value: 50.0, idProducto: "7893" },
            { value: 80.0, idProducto: "7896" },
            { value: 100.0, idProducto: "7899" },
            { value: 150.0, idProducto: "7902" },
            { value: 200.0, idProducto: "7905" },
          ],
        },
      ],
    },
    Newww: {
      types: [
        {
          name: "Internet Prepagado",
          idServicio: "1538",
          amounts: [
            {
              value: 150.0,
              idProducto: "13294",
              descripcion: "Mini (5GB / 30 dias)",
            },
            {
              value: 200.0,
              idProducto: "18254",
              descripcion: "MIFI 10GB / 30 DIAS",
            },
            {
              value: 250.0,
              idProducto: "10373",
              descripcion: "Basico (10GB / 30 dias)",
            },
            {
              value: 300.0,
              idProducto: "18255",
              descripcion: "MIFI 20GB / 30 DIAS",
            },
            {
              value: 350.0,
              idProducto: "10376",
              descripcion: "Familiar (20GB / 30 dias)",
            },
            {
              value: 400.0,
              idProducto: "18256",
              descripcion: "MIFI 30GB / 30 DIAS",
            },
            {
              value: 450.0,
              idProducto: "10379",
              descripcion: "Plus (30GB / 30 dias)",
            },
            {
              value: 550.0,
              idProducto: "10382",
              descripcion: "Max (50GB / 30 dias)",
            },
          ],
        },
        {
          name: "Internet Hogar",
          idServicio: "42",
          amounts: [
            { value: 25.0, idProducto: "5741", descripcion: "Adicional 5GB" },
            { value: 45.0, idProducto: "539", descripcion: "Adicional 10GB" },
            { value: 99.0, idProducto: "157", descripcion: "Adicional 25GB" },
            { value: 149.0, idProducto: "158", descripcion: "Adicional 50GB" },
            {
              value: 249.0,
              idProducto: "5742",
              descripcion: "Basico 5Mbps (110GB / 30 dias)",
            },
            {
              value: 309.0,
              idProducto: "159",
              descripcion: "Familiar 5Mbps (140GB / 30 dias)",
            },
            {
              value: 409.0,
              idProducto: "160",
              descripcion: "Basico 10Mbps (140GB / 30 dias)",
            },
            {
              value: 429.0,
              idProducto: "5744",
              descripcion: "Hyper 5Mbps (180GB / 30 dias)",
            },
            {
              value: 429.0,
              idProducto: "5743",
              descripcion: "Familiar 10Mbps (150GB / 30 dias)",
            },
            {
              value: 649.0,
              idProducto: "161",
              descripcion: "Hyper 10Mbps (190GB / 30 dias)",
            },
          ],
        },
        {
          name: "Celular",
          idServicio: "1490",
          amounts: [
            { value: 59.0, idProducto: "18257", descripcion: "NEWWW One R+" },
            { value: 100.0, idProducto: "18259", descripcion: "NEWWW 3GB R+" },
            { value: 120.0, idProducto: "18260", descripcion: "NEWWW 5GB R+" },
            {
              value: 135.0,
              idProducto: "18258",
              descripcion: "NEWWW ilimitado R+",
            },
            { value: 200.0, idProducto: "18261", descripcion: "NEWWW 15GB R+" },
            { value: 230.0, idProducto: "18262", descripcion: "NEWWW 40GB R+" },
            {
              value: 330.0,
              idProducto: "18263",
              descripcion: "NEWWW 40GB HS+",
            },
            { value: 525.0, idProducto: "18264", descripcion: "NEWWW 100GB+" },
          ],
        },
      ],
    },
  };

  const obtenerSaldo = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get("https://www.recargacreditos.com.mx/api/tiendas/solo-saldo", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSaldo(response.data.saldo_disponible);
    } catch (error) {
      console.error("Error al obtener saldo:", error);
    }
  };

  const obtenerSaldo2 = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await api.get("/auth/usuario/estado", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.error("Activo: " + response.data.activo);
      setActivo(response.data.activo);
      return response.data.activo; // Retorna el valor
    } catch (error) {
      setActivo(false);
      console.error("Activo error: " + activo);
      return false; // Retorna false si hay error
    }
  };
  
  useEffect(() => {
    obtenerSaldo(); // Obtener el saldo inicial cuando el componente se monta
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUserVerified(payload.verificado);
      console.log("Verificado", userVerified)
    }
  }, []);

  const [showLocationModal, setShowLocationModal] = useState(false);

  // Efecto para manejar el permiso de geolocalización (solo si el usuario NO está verificado)
  useEffect(() => {
    if (!userVerified) {
      const handleGeoLocationPermission = async () => {
        try {
          const permissionStatus = await navigator.permissions.query({
            name: "geolocation",
          });

          if (permissionStatus.state === "granted" && geoPermissionRequested) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setLocation({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                });
              },
              (error) => {
                console.error("Error obteniendo la ubicación", error);
              },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
            );
          }

          permissionStatus.onchange = () => {
            if (permissionStatus.state === "granted" && geoPermissionRequested) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                  });
                },
                (error) => {
                  console.error("Error obteniendo la ubicación", error);
                },
                
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
              );
            }
          };
        } catch (error) {
          console.error("Error manejando el permiso de geolocalización:", error);
        }
      };

      handleGeoLocationPermission();
    }
  }, [geoPermissionRequested, userVerified]);

  // Efecto para solicitar la geolocalización si el usuario no está verificado
  useEffect(() => {
    if (!userVerified && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setGeoPermissionRequested(true);
        },
        (error) => {
          console.error("Error obteniendo la ubicación", error);
          setGeoPermissionRequested(true);
          // Mostrar modal para solicitar activar la ubicación
          setShowLocationModal(true);
        },
              {
        enableHighAccuracy: true, 
        timeout: 10000,           
        maximumAge: 0,            
      }
      );
    }
  }, [userVerified]);

  // Función que se invoca cuando el usuario presiona "Permitir" en el modal
  const handleAllowLocation = () => {
    setShowLocationModal(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoPermissionRequested(true);
      },
      (error) => {
        console.error("Error obteniendo la ubicación", error);
        // Si continúa el error, se vuelve a mostrar el modal
        setShowLocationModal(true);
      }
    );
  };

  const handleSelectCompany = (selectedCompany) => {
    setCompany(selectedCompany);
    obtenerSaldo();

    // Verificar si la compañía tiene un solo tipo de recarga
    const types = recargasConfig[selectedCompany]?.types;

    if (types && types.length === 1) {
      // Si solo tiene un tipo de recarga, lo seleccionamos automáticamente
      setRecargaType(types[0]);
      setStep(3); // Saltamos al paso 3 directamente (selección de monto)
    } else {
      // Si tiene varios tipos, pasamos al paso de selección de tipo
      setStep(2);
    }
  };

  const handleSelectRecargaType = (selectedType) => {
    setRecargaType(selectedType);
    obtenerSaldo();
    setStep(3);
  };

  const handleSelectAmount = (selectedAmount) => {
    setAmount(selectedAmount); // Almacena el valor del monto
    obtenerSaldo();
    setStep(4);
  };

  const handlePhoneNumberChange = (e) => {
    const input = e.target.value;

    if (/^\d{0,10}$/.test(input)) {
      setPhoneNumber(input);
    }
  };

  const handleConfirm = async () => {
    obtenerSaldo();
    if (phoneNumber.length !== 10) {
      setErrorMessage(
        "El número de teléfono debe tener exactamente 10 dígitos."
      );
      return;
    }

    // Llama a la función obtenerSaldo para actualizar el saldo en el estado

    let idDistribuidor = "";
    let codigoDispositivo = "";
    let password = "";

    // Configuración de GestoPago basada en la compañía seleccionada
    if (
      company === "Movistar" ||
      company === "Bait" ||
      company === "FreedomPop" ||
      company === "Newww"
    ) {
      idDistribuidor = "2612";
      codigoDispositivo = "GPS2612-TPV-02";
      password = "eg2612";
    } else {
      idDistribuidor = "2611";
      codigoDispositivo = "GPS2611-TPV-02";
      password = "2611eg";
    }

    const idServicio = recargaType.idServicio;
    const idProducto = amount.idProducto;

    // let idServicio = "";
    // let idProducto = "";

    // Configuración específica de la compañía y tipo de recarga
    // if (company === "Movistar") {
    //   idServicio = "124";
    //   idProducto = amount.idProducto;
    // } else if (company === "Telcel") {
    //   idServicio = recargaType === "Paquete" ? "3" : "4";
    //   idProducto = amount === 50 ? "3" : "4";
    // }

    // Crear la cadena de texto con los parámetros codificados manualmente
    // const params = `idDistribuidor=${idDistribuidor}&codigoDispositivo=${codigoDispositivo}&password=${password}&telefono=${phoneNumber}&idServicio=${idServicio}&idProducto=${idProducto}`;
    const params = `idDistribuidor=${idDistribuidor}&codigoDispositivo=${codigoDispositivo}&password=${password}&telefono=${phoneNumber}&idServicio=${idServicio}&idProducto=${idProducto}`;

    try {
      setLoading(true); // Iniciar carga

      await obtenerSaldo();
      const esActivo = await obtenerSaldo2(); // Obtiene el valor directamente
      console.log("Handle confirm"+esActivo);

      if(esActivo){
      // Después de obtener y actualizar el saldo, realiza la comparación
      if (saldo < amount.value) {
        // Asume que saldo es parte del estado o variable global
        throw new Error("Saldo insuficiente");
      } else {
        const token = localStorage.getItem("token");
        // Realizar la solicitud POST a GestoPago
        const response = await axios.post(
          "https://gestopago.portalventas.net/sistema/service/abonar.do",
          params, // Aquí enviamos la cadena de texto
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded", // Mantener el mismo tipo de contenido
            },
            timeout: 62000, // Timeout de 60 segundos
          }
        );

        // Verificar el estado de la respuesta
        if (response.status === 200) {
          // Convertir la respuesta XML a JSON
          console.log("Llega al estado 200");
          const parser = new XMLParser();
          const result = parser.parse(response.data);

          // Extraer información relevante del XML
          const mensajeCodigo = result?.RESPONSE?.MENSAJE?.CODIGO;
          const mensajeTexto = result?.RESPONSE?.MENSAJE?.TEXTO;
          const numeroAutorizacion = result?.RESPONSE?.NUM_AUTORIZACION;
          //const saldoFinal = result?.RESPONSE?.SALDO_F;
          console.log(mensajeCodigo);
          // Verificar si la transacción fue exitosa (CODIGO === '01')
          if (mensajeCodigo === 1) {
            // Transacción exitosa
            console.log("???????????)))))En la recarga llega acáLlega acá");

            const recargaData = {
              operadora: company,
              tipo: recargaType.name.toLowerCase(),
              valor: amount.value,
              celular: phoneNumber,
              folio: numeroAutorizacion.toString(),
            };

            if (!userVerified && location.lat && location.lng) {
              recargaData.latitud = location.lat;
              recargaData.longitud = location.lng;
            }

            await axios.post(
              "https://www.recargacreditos.com.mx/api/tiendas/recargas",
              recargaData,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            const newToken = response.data.token;
            if (newToken) {
              // Guardar el nuevo token en localStorage
              localStorage.setItem("token", newToken);
              alert("Token actualizado");
              window.location.reload(); // Recargar la página para reflejar el nuevo token
            }

            setTransactionSuccess(true);
            setStep(6);

            obtenerSaldo(); // Actualiza el saldo después de la recarga
          } else if (mensajeCodigo === 6) {
            throw new Error(
              "Número de celular duplicado, por favor intentalo en 15 minutos"
            );
          } else if (mensajeCodigo === 55) {
            throw new Error("Número de celular o referencia inválido");
          } else {
            throw new Error(mensajeTexto);
          }
        }
      }
    }
    } catch (error) {
      console.error("Error en la transacción:", error);
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        await confirmaTransaccion(
          idDistribuidor,
          codigoDispositivo,
          password,
          phoneNumber,
          idServicio,
          idProducto
        );
      } else {
        setTransactionSuccess(false);
        setErrorMessage(error.message || "Error durante la transacción");
        setStep(6);
      }
    } finally {
      setLoading(false); // Terminar carga
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && step === 4 && phoneNumber.length === 10) {
        handleConfirm(); // Confirmar recarga al presionar Enter
      }
      if (event.key === "Backspace") {
        // Si estamos en el paso 4 y hay un número en el campo, no hacemos nada (se borra normalmente)
        if (step === 4 && phoneNumber.length > 0) {
          return;
        }

        // Si estamos en el paso 4 y el campo está vacío, retrocedemos
        if (step === 4 && phoneNumber.length === 0) {
          handleBack();
        }

        // Si estamos en cualquier otro paso mayor a 1, retrocedemos
        if (step > 1 && step !== 4) {
          handleBack();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [step, phoneNumber]);

  const confirmaTransaccion = async (
    idDistribuidor,
    codigoDispositivo,
    password,
    telefono,
    idServicio,
    idProducto
  ) => {
    try {
      await obtenerSaldo2()
      const params = `idDistribuidor=${idDistribuidor}&codigoDispositivo=${codigoDispositivo}&password=${password}&telefono=${telefono}&idServicio=${idServicio}&idProducto=${idProducto}`;

      const response = await axios.post(
        "https://gestopago.portalventas.net/sistema/service/confirmaTransaccion.do",
        params,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "*/*", // Evitar que se envíe el encabezado Accept predeterminado de axios
          },
        }
      );

      const parser = new XMLParser();
      const result = parser.parse(response.data);
      const mensajeCodigo = result?.RESPONSE?.MENSAJE?.CODIGO;
      const numeroAutorizacion = result?.RESPONSE?.NUM_AUTORIZACION;

      // Si el código es '01' (transacción exitosa) o '06' (transacción aplicada anteriormente)
      if (mensajeCodigo === 1 || mensajeCodigo === 6) {
        console.log(
          "Transacción confirmada como exitosa o aplicada anteriormente."
        );

        // Continuar con el flujo normal
        const recargaData = {
          operadora: company,
          tipo: recargaType.name.toLowerCase(),
          valor: amount.value,
          celular: phoneNumber,
          folio: numeroAutorizacion.toString(),
        };

        if (!userVerified && location.lat && location.lng) {
          recargaData.latitud = location.lat;
          recargaData.longitud = location.lng;
        }

        const token = localStorage.getItem("token");

        await axios.post(
          "https://www.recargacreditos.com.mx/api/tiendas/recargas",
          recargaData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const newToken = response.data.token;
        if (newToken) {
          // Guardar el nuevo token en localStorage
          localStorage.setItem("token", newToken);
          alert("Token actualizado");
          window.location.reload(); // Recargar la página para reflejar el nuevo token
        }

        setTransactionSuccess(true);
        setStep(6);

        obtenerSaldo(); // Actualiza el saldo después de la recarga
      } else if (mensajeCodigo === 70) {
        throw new Error("La transacción no fue aplicada");
      } else {
        console.log(
          "Error al confirmar la transacción:",
          result?.RESPONSE?.MENSAJE?.TEXTO
        );
      }
    } catch (error) {
      console.error("Error en la confirmación de la transacción:", error);
    }
  };

  const handleCancel = () => {
    setStep(1);
    setCompany("");
    setRecargaType("");
    setAmount("");
    setPhoneNumber("");
    setTransactionSuccess(null);
    setErrorMessage("");
  };

  const handleBack = () => {
    if (step > 1) {
      if (step === 2) {
        setCompany("");
        setStep(step - 1);
      } else if (step === 3) {
        // Verificar si la compañía tiene un solo tipo de recarga
        const types = recargasConfig[company]?.types;

        if (types && types.length === 1) {
          // Si solo tiene un tipo de recarga, lo seleccionamos automáticamente
          setCompany("");
          setRecargaType("");

          setStep(step - 2); // Saltamos al paso 3 directamente (selección de monto)
        } else {
          // Si tiene varios tipos, pasamos al paso de selección de tipo
          setRecargaType("");

          setStep(step - 1);
        }
      } else if (step === 4) {
        setAmount("");
        setStep(step - 1);
      }
    }
  };
  useEffect(() => {
    const handleBackButton = (event) => {
      event.preventDefault(); // Evitamos el comportamiento por defecto
      if (step > 1) {
        handleBack();
      }

      // Insertar un nuevo estado para mantener el control
      window.history.pushState(null, "", window.location.pathname);
    };

    // Agregar un estado inicial
    window.history.pushState(null, "", window.location.pathname);

    // Escuchar el evento "popstate"
    window.addEventListener("popstate", handleBackButton);

    return () => {
      window.removeEventListener("popstate", handleBackButton);
    };
  }, [step, handleBack]);

  const handleAllowLocation2 = () => {
    window.location.reload();
  };
  return (
    <Container
      fluid
      className="d-flex flex-column"
      style={{ minHeight: "50vh" }}
    >
            {location ? (
                  <Container>
      <div ref={headerRef}>
        {/* Esto es el espacio ocupado por el Navbar */}
      </div>
      <Row
        className="bg-light py-3"
        style={{
          position: isSticky ? "sticky" : "relative",
          top: isSticky ? "0px" : "auto",
          width: "100%",
          zIndex: 1000,
        }}
      >
        {/* Columna del botón */}
        <Col xs={2} className="d-flex justify-content-start align-items-center">
{(step > 1 && step < 6) && !loading && (   
            <button
              className="btn btn-primary btn-sm d-flex justify-content-center align-items-center"
              onClick={handleBack}
              style={{
                backgroundColor: "#007bff", // Celeste de Bootstrap
                border: "none",
                height: "26px", // Altura uniforme
                width: "26px", // Ancho uniforme (opcional)
              }}
            >
              <FaArrowLeft style={{ verticalAlign: "middle" }} />
            </button>
          )}
        </Col>

        {/* Columna del saldo */}
        <Col
          xs={8}
          className="d-flex justify-content-center align-items-center"
        >
          <h5 style={{ fontWeight: "bold", margin: 0 }}>
            Saldo: ${saldo ? saldo.toFixed(2) : "0.00"}
          </h5>
        </Col>

        {/* Espacio vacío */}
        <Col xs={2}></Col>
      </Row>
      <Container className="container">
        <Row className="my-12">
          <Col>
            <h3 className="text-center" style={{ color: "#0A74DA" }}>
              {step === 1 && "Selecciona tu Compañía"}
              {step === 2 && `Selecciona el Tipo de Recarga para ${company}`}
              {step === 3 &&
                `Selecciona el Monto para ${company} (${recargaType.name})`}
              {step === 4 && "Ingresa el Número de Teléfono"}
            </h3>
          </Col>
        </Row>

        {step === 1 && (
          <Row>
            {companies.map((company) => (
              <Col xs={12} sm={6} md={4} className="mb-4" key={company.name}>
                <Card
                  onClick={() => handleSelectCompany(company.name)}
                  className="h-100"
                  style={{
                    borderColor: "#d1d1d1",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "120px", // Altura mínima unificada
                    height: "300px", // Altura fija opcional
                  }}
                >
                  <Card.Body
                    style={{
                      height: "150px", // Altura fija para el Card.Body
                      width: "100%", // Ancho completo del Body
                      display: "flex", // Usamos Flexbox para centrar
                      justifyContent: "center", // Centrado horizontal
                      alignItems: "center", // Centrado vertical
                      padding: "5px", // Añade padding para distancia del borde
                    }}
                  >
                    <img
                      src={company.logo}
                      alt={company.name}
                      style={{
                        width: "100%",
                        maxWidth: "150px",

                        objectFit: "contain", // Mantener proporciones del logo

                        marginBottom: "0px",
                      }}
                    />
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {step === 2 && (
          <Row>
            {recargasConfig[company].types.map((type) => (
              <Col xs={12} sm={6} className="mb-4" key={type.name}>
                <Card
                  onClick={() => handleSelectRecargaType(type)}
                  className="h-100"
                  style={{
                    borderColor: "#d1d1d1",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Card.Body className="text-center">
                    <Card.Title className="mt-3" style={{ color: "#0A74DA" }}>
                      {type.name}
                    </Card.Title>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {step === 3 && (
          <Row>
            {recargaType.amounts.map((amount) => (
              <Col xs={12} sm={6} md={4} className="mb-4" key={amount.value}>
                <Card
                  onClick={() => handleSelectAmount(amount)} // Pasamos el objeto completo
                  className="h-100"
                  style={{
                    borderColor: "#d1d1d1",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Card.Body className="text-center">
                    <Card.Title className="mt-3" style={{ color: "#333" }}>
                      ${amount.value}
                    </Card.Title>

                    <Card.Text>{amount?.descripcion}</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {step === 4 && (
          <Row className="justify-content-center">
            <Col md={6}>
              <Card
                className="mb-4"
                style={{
                  borderColor: "#d1d1d1",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                }}
              >
                <Card.Body className="text-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="form-control form-control-lg"
                    value={phoneNumber}
                    onChange={handlePhoneNumberChange}
                    placeholder="Número de Teléfono"
                    style={{ borderColor: "#0A74DA", textAlign: "center" }}
                    autoFocus
                  />
                  {!loading ? (
                    <Button
                      variant="primary"
                      className="mt-4"
                      onClick={handleConfirm}
                      disabled={phoneNumber.length !== 10}
                    >
                      Recargar
                    </Button>
                  ) : (
                    <div className="mt-4">
                      <Spinner
                        animation="border"
                        role="status"
                        variant="primary"
                      >
                        <span className="sr-only">Procesando...</span>
                      </Spinner>
                      <p className="mt-2">Procesando...</p>
                    </div>
                  )}
                  {errorMessage && (
                    <p className="text-danger mt-2">{errorMessage}</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {step === 6 && transactionSuccess !== null && (
          <Row className="justify-content-center">
            <Col md={8}>
              <Card
                className="mb-4"
                style={{
                  borderColor: "#d1d1d1",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                }}
              >
                <Card.Body className="text-center">
                  {transactionSuccess ? (
                    <>
                      <FaCheckCircle
                        style={{ fontSize: "4em", color: "#0A74DA" }}
                      />
                      <h2 className="mt-3">Tu transacción fue un éxito</h2>
                    </>
                  ) : (
                    <>
                      <FaTimesCircle
                        style={{ fontSize: "4em", color: "#ff4d4d" }}
                      />
                      <h2 className="mt-3">Tu transacción no fue realizada</h2>
                      <p>{errorMessage}</p>
                    </>
                  )}

                  <Button
                    variant="primary"
                    className="mt-4"
                    onClick={handleCancel}
                    style={{ backgroundColor: "#0A74DA", color: "#fff" }}
                  >
                    Realizar otra recarga
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </Container>
      {(company || recargaType || amount) && (
      <Container className="fade-in">
        <Row className="fixed-bottom bg-light py-3">
          <Col xs={12} className="text-center">
            <h5>
              {company && `Compañía: ${company}`} <br />
              {recargaType && `Tipo de Recarga: ${recargaType.name}`} <br />
              {amount && `Monto: $${amount.value}`} <br />
            </h5>
          </Col>
        </Row>
      </Container>
    )}

      </Container>
            ) : (
              <p>Ubicación no disponible</p>
            )}
           {/* Solo se muestra el modal si el usuario NO está verificado */}
      {!userVerified && showLocationModal  && (
            <Modal
            show={showLocationModal}
            backdrop="static"  // No se puede cerrar haciendo clic fuera
            keyboard={false}   // No se puede cerrar con la tecla ESC
            centered
            >
              <Modal.Header>
                <Modal.Title>Activar Ubicación</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                Para continuar, por favor activa la ubicación GPS en tu dispositivo. Lo puedes realizar en la barra de navegación
              </Modal.Body>
              <Modal.Footer>
                <Button variant="primary" onClick={handleAllowLocation}>
                  Continuar
                </Button>
              </Modal.Footer>
            </Modal>
          )}
    </Container>
  );
};

export default HacerRecarga;
