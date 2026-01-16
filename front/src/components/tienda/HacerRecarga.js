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
          idServicio: "1556",
          amounts: [
            { value: 25.0, idProducto: "19476", descripcion: "Paquete VIRGIN $25" },
            { value: 50.0, idProducto: "10559", descripcion: "Paquete VIRGIN $50" },
            { value: 75.0, idProducto: "19484", descripcion: "Paquete VIRGIN $75" },
            { value: 100.0, idProducto: "10562", descripcion: "Paquete VIRGIN $100" },
            { value: 150.0, idProducto: "10565", descripcion: "Paquete VIRGIN $150" },
            { value: 200.0, idProducto: "10568", descripcion: "Paquete VIRGIN $200" },
            { value: 203.0, idProducto: "19487", descripcion: "Paquete 3X30 VIRGIN $203" },
            { value: 250.0, idProducto: "19485", descripcion: "Paquete VIRGIN $250" },
            { value: 300.0, idProducto: "10571", descripcion: "Paquete VIRGIN $300" },
            { value: 400.0, idProducto: "19486", descripcion: "Paquete VIRGIN $400" },
            { value: 406.0, idProducto: "19488", descripcion: "Paquete 6X30 VIRGIN $406" },
            { value: 999.0, idProducto: "19489", descripcion: "Paquete 12X30 VIRGIN $999" },
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
            { value: 50.0, idProducto: "14293", descripcion: "ABIB 50" },
            { value: 60.0, idProducto: "14296", descripcion: "ABIB 60" },
            { value: 80.0, idProducto: "14299", descripcion: "ABIB 80" },
            { value: 100.0, idProducto: "14302", descripcion: "ABIB 100" },
            { value: 130.0, idProducto: "14305", descripcion: "ABIB 130" },
            { value: 150.0, idProducto: "14308", descripcion: "ABIB 150" },
            { value: 155.0, idProducto: "14311", descripcion: "ABIB 155" },
            { value: 200.0, idProducto: "14317", descripcion: "ABIB 200" },
            { value: 240.0, idProducto: "14314", descripcion: "ABIB 240" },
          ],
        },
      ],
    },
    Axios: {
      types: [
        {
          name: "Mobile",
          idServicio: "2035",
          amounts: [
            { value: 40.0, idProducto: "14143", descripcion: "Axios 2GB Express" },
            { value: 50.0, idProducto: "12679", descripcion: "Axios 2GB Semana" },
            { value: 70.0, idProducto: "12694", descripcion: "Axios 6GB Semana Plus" },
            { value: 100.0, idProducto: "12682", descripcion: "Axios 5GB Quincena" },
            { value: 100.0, idProducto: "18306", descripcion: "Axios 2GB Mes" },
            { value: 130.0, idProducto: "12685", descripcion: "Axios 10GB Quincena Plus" },
            { value: 150.0, idProducto: "19112", descripcion: "Axios 4GB Mes Plus" },
            { value: 190.0, idProducto: "19113", descripcion: "Axios 12GB Power" },
            { value: 250.0, idProducto: "19114", descripcion: "Axios 24GB Power Max" },
            { value: 300.0, idProducto: "19115", descripcion: "Axios 35GB Ultra" },
            { value: 500.0, idProducto: "19116", descripcion: "Axios 50GB Ilimitado" },
          ],
        },
        {
          name: "Internet en Casa",
          idServicio: "3074",
          amounts: [
            { value: 99.0, idProducto: "18322", descripcion: "Axios Internet en casa 99" },
            { value: 299.0, idProducto: "18323", descripcion: "Axios Internet en casa 299" },
            { value: 349.0, idProducto: "18324", descripcion: "Axios internet en casa 349" },
            { value: 439.0, idProducto: "18325", descripcion: "Axios internet en casa 439" },
          ],
        },
        {
          name: "Internet Movil",
          idServicio: "3075",
          amounts: [
            { value: 119.0, idProducto: "18326", descripcion: "Axios internet movil 119" },
            { value: 229.0, idProducto: "18327", descripcion: "Axios internet movil 229" },
            { value: 359.0, idProducto: "18328", descripcion: "Axios internet movil 279" },
            { value: 559.0, idProducto: "18329", descripcion: "Axios internet movil 499" },
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
            { value: 70.0, idProducto: "14251", descripcion: "Semanal 2GB" },
            { value: 140.0, idProducto: "14254", descripcion: "Quincenal 5 GB" },
            { value: 165.0, idProducto: "14263", descripcion: "Mes 2 GB" },
            { value: 175.0, idProducto: "14260", descripcion: "Quincenal Plus 10 GB" },
            { value: 235.0, idProducto: "14266", descripcion: "Mes 4 GB" },
            { value: 290.0, idProducto: "14269", descripcion: "Mes 12 GB" },
            { value: 365.0, idProducto: "14275", descripcion: "Mes 24 GB" },
            { value: 430.0, idProducto: "14278", descripcion: "Mes 35 GB" },
            { value: 760.0, idProducto: "14281", descripcion: "Mes 50 GB" },
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
            { value: 49.0, idProducto: "9807", descripcion: "Plan Conoce" },
            { value: 89.0, idProducto: "14350", descripcion: "Plan Conecta" },
            { value: 149.0, idProducto: "9810", descripcion: "Plan Explora" },
            { value: 229.0, idProducto: "14353", descripcion: "Plan Causa" },
            { value: 279.0, idProducto: "18321", descripcion: "Plan Navega" },
            { value: 349.0, idProducto: "9813", descripcion: "Plan Disfruta" },
            { value: 449.0, idProducto: "9816", descripcion: "Plan Comparte" },
            { value: 599.0, idProducto: "9819", descripcion: "Plan Vuela" },
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
            { value: 50.0, idProducto: "18141", descripcion: "50 RS Ilimitado" },
            { value: 70.0, idProducto: "17296", descripcion: "70 RS Ilimitado" },
            { value: 99.0, idProducto: "19121", descripcion: "99 RS Ilimitado" },
            { value: 100.0, idProducto: "18142", descripcion: "100 RS Ilimitado" },
            { value: 130.0, idProducto: "17299", descripcion: "130 RS Ilimitado" },
            { value: 150.0, idProducto: "18048", descripcion: "150 RS Ilimitado" },
            { value: 190.0, idProducto: "17302", descripcion: "190 RS Ilimitado" },
            { value: 250.0, idProducto: "17305", descripcion: "250 RS Ilimitado" },
            { value: 300.0, idProducto: "17308", descripcion: "300 RS Ilimitado" },
            { value: 500.0, idProducto: "19119", descripcion: "500 RS Ilimitado" },
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
            { value: 60.0, idProducto: "10247", descripcion: "JR 7 2G" },
            { value: 80.0, idProducto: "18084", descripcion: "JR 7 6G" },
            { value: 100.0, idProducto: "10253", descripcion: "JR 30 2G" },
            { value: 130.0, idProducto: "18089", descripcion: "JR 15 10G" },
            { value: 160.0, idProducto: "18087", descripcion: "JR 30 4G" },
            { value: 200.0, idProducto: "18086", descripcion: "JR 30 12G" },
            { value: 260.0, idProducto: "18090", descripcion: "JR 30 24G" },
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
            { value: 77.0, idProducto: "453", descripcion: "Plan LikeFlash" },
            { value: 135.0, idProducto: "7657", descripcion: "Plan LikeChill" },
            { value: 169.0, idProducto: "7660", descripcion: "Plan LikeMore" },
            { value: 230.0, idProducto: "17426", descripcion: "Plan LikeOn" },
            { value: 280.0, idProducto: "17429", descripcion: "Plan LikePlay" },
            { value: 340.0, idProducto: "19622", descripcion: "Plan LikeUp" },
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
            { value: 49.0, idProducto: "19137", descripcion: "Plan Bara" },
            { value: 99.0, idProducto: "9840", descripcion: "Plan Rifate" },
            { value: 149.0, idProducto: "9843", descripcion: "Plan Capo" },
            { value: 229.0, idProducto: "9846", descripcion: "Plan Chido" },
            { value: 299.0, idProducto: "18126", descripcion: "Plan Idolo" },
            { value: 399.0, idProducto: "9849", descripcion: "Plan Crack" },
            { value: 499.0, idProducto: "9852", descripcion: "Plan Perro" },
            { value: 699.0, idProducto: "9855", descripcion: "Plan OLV" },
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
            { value: 50.0, idProducto: "13333", descripcion: "RINO 50" },
            { value: 80.0, idProducto: "18374", descripcion: "RINO 80" },
            { value: 120.0, idProducto: "18376", descripcion: "RINO 120" },
            { value: 135.0, idProducto: "18381", descripcion: "RINO 135" },
            { value: 150.0, idProducto: "13336", descripcion: "RINO 150" },
            { value: 200.0, idProducto: "13339", descripcion: "RINO 200" },
            { value: 250.0, idProducto: "18382", descripcion: "RINO 250" },
            { value: 300.0, idProducto: "13342", descripcion: "RINO 300" },
            { value: 500.0, idProducto: "18372", descripcion: "RINO 500" },
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
            { value: 40.0, idProducto: "19110", descripcion: "TELMOVIL 40-3D (Basico)" },
            { value: 50.0, idProducto: "10091", descripcion: "TELMOVIL 50-7D (Plus)" },
            { value: 70.0, idProducto: "19117", descripcion: "TELMOVIL 70-7D (Pro)" },
            { value: 100.0, idProducto: "10094", descripcion: "TELMOVIL 100-30D (Ejecutivo)" },
            { value: 150.0, idProducto: "19118", descripcion: "TELMOVIL 150-30D (Premium)" },
            { value: 200.0, idProducto: "10097", descripcion: "TELMOVIL 200-30D (VIP)" },
            { value: 300.0, idProducto: "10100", descripcion: "TELMOVIL 300-30D (Oro)" },
            { value: 500.0, idProducto: "10088", descripcion: "TELMOVIL 500-30D (Diamante)" },
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
            { value: 55.0, idProducto: "18093", descripcion: "ULTRACEL 55" },
            { value: 80.0, idProducto: "13459", descripcion: "ULTRACEL $80" },
            { value: 105.0, idProducto: "18095", descripcion: "ULTRACEL 105" },
            { value: 110.0, idProducto: "18097", descripcion: "ULTRACEL 110" },
            { value: 150.0, idProducto: "13462", descripcion: "ULTRACEL $150" },
            { value: 160.0, idProducto: "13471", descripcion: "ULTRACEL $160" },
            { value: 170.0, idProducto: "13465", descripcion: "ULTRACEL $170" },
            { value: 210.0, idProducto: "18099", descripcion: "ULTRACEL 210" },
            { value: 270.0, idProducto: "13468", descripcion: "ULTRACEL $270" },
          ],
        },
        {
          name: "Internet Hogar",
          idServicio: "2155",
          amounts: [
            { value: 99.0, idProducto: "13504", descripcion: "HOGAR 99" },
            { value: 299.0, idProducto: "13507", descripcion: "HOGAR 299" },
            { value: 359.0, idProducto: "13510", descripcion: "HOGAR 359" },
            { value: 399.0, idProducto: "13513", descripcion: "HOGAR 399" },
            { value: 429.0, idProducto: "13516", descripcion: "HOGAR 429" },
          ],
        },
        {
          name: "Portatil",
          idServicio: "2158",
          amounts: [
            { value: 125.0, idProducto: "13525", descripcion: "PORTATIL 125" },
            { value: 150.0, idProducto: "13528", descripcion: "PORTATIL 150" },
            { value: 250.0, idProducto: "13531", descripcion: "PORTATIL 250" },
            { value: 399.0, idProducto: "13534", descripcion: "PORTATIL 399" },
            { value: 495.0, idProducto: "19109", descripcion: "PORTATIL 495" },
            { value: 625.0, idProducto: "13540", descripcion: "PORTATIL 625" },
          ],
        },
      ],
    },
    Valor: {
      types: [
        {
          name: "Telefonia Movil",
          idServicio: "1257",
          amounts: [
            { value: 70.0, idProducto: "8706", descripcion: "VALOR 6GB 7Dias RRSS" },
            { value: 95.0, idProducto: "8715", descripcion: "VALOR 3GB 30Dias Porta" },
            { value: 100.0, idProducto: "8688", descripcion: "VALOR 5G 15Dias RRSS" },
            { value: 130.0, idProducto: "8709", descripcion: "VALOR 10GB 15Dias RRSS" },
            { value: 150.0, idProducto: "8712", descripcion: "VALOR 4GB 30Dias RRSS" },
            { value: 250.0, idProducto: "8700", descripcion: "VALOR 24GB 30Dias RRSS" },
            { value: 350.0, idProducto: "8703", descripcion: "VALOR 35GB 30Dias RRSS" },
          ],
        },
        {
          name: "Internet Movil",
          idServicio: "1260",
          amounts: [
            { value: 110.0, idProducto: "18229", descripcion: "MiFi 6GB" },
            { value: 160.0, idProducto: "18354", descripcion: "MiFi 5GB" },
            { value: 245.0, idProducto: "8649", descripcion: "MiFi 10GB" },
            { value: 375.0, idProducto: "8652", descripcion: "MiFi 20GB" },
            { value: 480.0, idProducto: "8655", descripcion: "MiFi 30GB" },
            { value: 620.0, idProducto: "8658", descripcion: "MiFi 50GB" },
          ],
        },
        {
          name: "Internet en Casa",
          idServicio: "1263",
          amounts: [
            { value: 99.0, idProducto: "8661", descripcion: "Internet en Casa 5MB 20GB" },
            { value: 115.0, idProducto: "14194", descripcion: "Internet en Casa 10MB 20GB" },
            { value: 349.0, idProducto: "8679", descripcion: "Internet en Casa 5MB 100GB" },
            { value: 399.0, idProducto: "8667", descripcion: "Internet en Casa 10MB 150GB" },
            { value: 439.0, idProducto: "14197", descripcion: "Internet en Casa 10MB 180GB" },
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
            { value: 80.0, idProducto: "12601", descripcion: "Wik Pro 6 GB" },
            { value: 100.0, idProducto: "12598", descripcion: "Wik Pro 2 GB" },
            { value: 130.0, idProducto: "12604", descripcion: "Wik Pro 10 GB" },
            { value: 150.0, idProducto: "12610", descripcion: "Wik Pro 4 GB" },
            { value: 250.0, idProducto: "12607", descripcion: "Wik Pro 12 GB" },
            { value: 350.0, idProducto: "12613", descripcion: "Wik Pro 24 GB" },
            { value: 500.0, idProducto: "12616", descripcion: "Wik Pro 50 GB" },
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
            { value: 100.0, idProducto: "13369", descripcion: "WIK MIFI 10 GB 7D" },
            { value: 125.0, idProducto: "13372", descripcion: "WIK MIFI 5 GB 30D" },
            { value: 180.0, idProducto: "13375", descripcion: "WIK MIFI 20 GB 7D" },
            { value: 250.0, idProducto: "13378", descripcion: "WIK MIFI 10 GB 30D" },
            { value: 350.0, idProducto: "13381", descripcion: "WIK MIFI 20 GB 30D" },
            { value: 450.0, idProducto: "13384", descripcion: "WIK MIFI 30 GB 30D" },
            { value: 550.0, idProducto: "17666", descripcion: "WIK MIFI 50 GB 30D" },
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
            { value: 100.0, idProducto: "10058", descripcion: "NEWWW 2GB R+" },
            { value: 150.0, idProducto: "10061", descripcion: "NEWWW 4GB R+" },
            { value: 200.0, idProducto: "10064", descripcion: "NEWWW 12GB R+" },
            { value: 250.0, idProducto: "10067", descripcion: "NEWWW 24GB R+" },
            { value: 330.0, idProducto: "10070", descripcion: "NEWWW 35GB R+" },
            { value: 525.0, idProducto: "10073", descripcion: "NEWWW 50GB R+" },
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


  const handleConfirm2 = async () => {
    // 🔥 BLOQUEAR INMEDIATAMENTE (ANTES DE CUALQUIER VALIDACIÓN)
    if (loading) {
      console.warn('⚠️ Ya hay una transacción en proceso');
      return;
    }
    
    // 🔥 ACTIVAR LOADING INMEDIATAMENTE
    setLoading(true);
    setErrorMessage('');

    try {
      // Ahora sí, hacer las validaciones
      if (phoneNumber.length !== 10) {
        setErrorMessage('El número de teléfono debe tener exactamente 10 dígitos.');
        setLoading(false); // 🔥 Importante: desactivar si falla validación
        return;
      }

      await obtenerSaldo();

      const esActivo = await obtenerSaldo2();
      if (!esActivo) {
        setErrorMessage('Tu usuario no está activo');
        setLoading(false); // 🔥 Desactivar
        return;
      }

      if (saldo < amount.value) {
        setErrorMessage('Saldo insuficiente');
        setLoading(false); // 🔥 Desactivar
        return;
      }

      const token = localStorage.getItem('token');

      const recargaData = {
        operadora: company,
        tipo: recargaType.name.toLowerCase(),
        valor: amount.value,
        celular: phoneNumber,
        idServicio: recargaType.idServicio,
        idProducto: amount.idProducto
      };

      if (!userVerified && location.lat && location.lng) {
        recargaData.latitud = location.lat;
        recargaData.longitud = location.lng;
      }

      const response = await axios.post(
        'https://www.recargacreditos.com.mx/api/tiendas/recargas2',
        recargaData,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 90000
        }
      );

      if (response.data.success) {
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
        
        setTransactionSuccess(true);
        setStep(6);
        obtenerSaldo();
      } else {
        setTransactionSuccess(false);
        setErrorMessage(response.data.error || 'Error al procesar la recarga');
        setStep(6);
      }

    } catch (error) {
      console.error('Error en la transacción:', error);

      const errorData = error.response?.data;

      if (error.response?.status === 409) {
        setTransactionSuccess(false);
        setErrorMessage(errorData?.error || 'Ya existe una transacción en proceso.');
        setStep(6);
      } else if (error.response?.status === 504 && errorData?.timeout) {
        setErrorMessage(
          errorData.error || 
          'Verificando tu recarga automáticamente. Consulta tu historial en unos momentos.'
        );
        setTransactionSuccess(null);
        setStep(6);
      } else if (errorData?.tipo === 'gestopago') {
        setTransactionSuccess(false);
        setErrorMessage(errorData.error);
        setStep(6);
      } else if (errorData?.tipo === 'backend') {
        setTransactionSuccess(false);
        setErrorMessage(errorData.error);
        setStep(6);
      } else {
        setTransactionSuccess(false);
        setErrorMessage(
          errorData?.error || 
          error.message || 
          'Error durante la transacción'
        );
        setStep(6);
      }

    } finally {
      setLoading(false);
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
      // 🔥 Verificar loading ANTES de ejecutar
      if (event.key === "Enter" && step === 4 && phoneNumber.length === 10 && !loading) {
        event.preventDefault();
        handleConfirm2();
      }
      
      if (event.key === "Backspace") {
        if (step === 4 && phoneNumber.length > 0) {
          return;
        }

        if (step === 4 && phoneNumber.length === 0) {
          handleBack();
        }

        if (step > 1 && step !== 4) {
          handleBack();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [step, phoneNumber, loading]); // 🔥 Agregar loading como dependencia

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
                    disabled={loading} // 🔥 Deshabilitar durante procesamiento

                  />
                  {!loading ? (
                    <Button
                      variant="primary"
                      className="mt-4"
                      onClick={handleConfirm2}
                      disabled={phoneNumber.length !== 10 || loading}
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
