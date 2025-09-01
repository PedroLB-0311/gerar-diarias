"use client";
import { useState, useEffect, useRef } from "react";
import { gerarPDF } from "../utils/Gerar.pdf";

// Haversine
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Origem padrão
const origem = { nome: "São Ludgero", uf: "SC", latitude: -28.3247, longitude: -49.1806 };

export default function FormularioDiarias() {
  const [municipios, setMunicipios] = useState([]);
  const [sugestoes, setSugestoes] = useState([]);
  const [focusedDestino, setFocusedDestino] = useState({ iViagem: null, iDestino: null });
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const [form, setForm] = useState({
    servidor: "",
    cargo: "",
    matricula: "",
    grupo: "A",
    cpf: "",
    secretaria: "",
    secretario: "",
    trips: [
      {
        destinos: [{ nome: "", uf: "", latitude: null, longitude: null }],
        saida: "",
        horaSaida: "",
        retorno: "",
        horaRetorno: "",
        totalDiaria: 0,
        totalPernoite: 0,
        distanciaKm: 0,
        justificativa: "",
      },
    ],
  });

  // refs para navegação com enter
  const formRefs = useRef([]);

  // carregar municípios
  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/municipios.json"
    )
      .then((res) => res.json())
      .then((data) => setMunicipios(data));
  }, []);

  // mover foco com enter
  const handleKeyDownNext = (e, index) => {
    if (e.key === "Enter") {
      // Se for date/time, deixa o navegador preencher primeiro
      if (e.target.type === "date" || e.target.type === "time") {
        return; 
      }
      e.preventDefault();
      const next = formRefs.current[index + 1];
      if (next) next.focus();
    }
  };
  
  // autocomplete destino
  const handleDestinoChange = (e, iViagem, iDestino) => {
    const valor = e.target.value;
    setForm((prev) => {
      const trips = [...prev.trips];
      trips[iViagem].destinos[iDestino] = { nome: valor };
      return { ...prev, trips };
    });

    if (valor.length > 1) {
      const filtrados = municipios.filter((m) =>
        m.nome.toLowerCase().startsWith(valor.toLowerCase())
      );
      const sc = filtrados.filter((m) => m.uf === "SC");
      const outros = filtrados.filter((m) => m.uf !== "SC");
      setSugestoes([...sc, ...outros].slice(0, 10));
      setFocusedDestino({ iViagem, iDestino });
      setHighlightedIndex(0);
    } else {
      setSugestoes([]);
    }
  };

  const selecionarDestino = (destino) => {
    setForm((prev) => {
      const trips = [...prev.trips];
      trips[focusedDestino.iViagem].destinos[focusedDestino.iDestino] = destino;
      return { ...prev, trips };
    });
    setSugestoes([]);
  };

  // navegação no autocomplete
  const handleDestinoKeyDown = (e) => {
    if (sugestoes.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % sugestoes.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + sugestoes.length) % sugestoes.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selecionarDestino(sugestoes[highlightedIndex]);
    }
  };

  // calcular horas
  function calcularHoras(saida, horaSaida, retorno, horaRetorno) {
    if (!saida || !horaSaida || !retorno || !horaRetorno) return 0;
    const inicio = new Date(`${saida}T${horaSaida}`);
    const fim = new Date(`${retorno}T${horaRetorno}`);
    return (fim - inicio) / (1000 * 60 * 60);
  }

  // calcular valores
  const calcularDiarias = () => {
    const grupo = form.grupo === "B" ? "B" : "A";
    let trips = [...form.trips];

    trips = trips.map((trip) => {
      const horas = calcularHoras(trip.saida, trip.horaSaida, trip.retorno, trip.horaRetorno);
      let totalDiaria = 0;
      let totalPernoite = 0;
      let distanciaKm = 0;

      trip.destinos.forEach((d) => {
        if (d.latitude && d.longitude) {
          const dist = calcularDistancia(origem.latitude, origem.longitude, d.latitude, d.longitude);
          if (dist > distanciaKm) distanciaKm = dist;
        }
      });

      const isOutroEstado = trip.destinos.some((d) => d.uf && d.uf !== "SC");
      const isCapital = trip.destinos.some((d) => d.nome === "Florianópolis" && d.uf === "SC");
      const comPernoite = trip.saida && trip.retorno && trip.saida !== trip.retorno;

      if (isOutroEstado) {
        if (comPernoite) totalPernoite = grupo === "A" ? 1280 : 950;
        else if (horas > 8) totalDiaria = grupo === "A" ? 200 : 160;
      } else if (isCapital) {
        if (comPernoite) totalPernoite = grupo === "A" ? 400 : 320;
        else if (horas > 8) totalDiaria = grupo === "A" ? 135 : 100;
        else if (horas >= 4) totalDiaria = grupo === "A" ? 80 : 60;
      } else {
        if (comPernoite) totalPernoite = grupo === "A" ? 400 : 320;
        else if (horas > 8) {
          totalDiaria = grupo === "A" ? 135 : distanciaKm > 200 ? 110 : 100;
        } else if (horas >= 4) {
          totalDiaria = grupo === "A" ? (distanciaKm > 200 ? 135 : 80) : distanciaKm > 200 ? 110 : 60;
        }
      }

      return { ...trip, totalDiaria, totalPernoite, distanciaKm };
    });

    setForm((prev) => ({ ...prev, trips }));
  };

  useEffect(() => {
    calcularDiarias();
  }, [form.trips, form.grupo]);

  // helpers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTripChange = (e, iViagem, field) => {
    const { value } = e.target;
    setForm((prev) => {
      const trips = [...prev.trips];
      trips[iViagem][field] = value;
      return { ...prev, trips };
    });
  };

  const addViagem = () => {
    setForm((prev) => ({
      ...prev,
      trips: [
        ...prev.trips,
        {
          destinos: [{ nome: "", uf: "", latitude: null, longitude: null }],
          saida: "",
          horaSaida: "",
          retorno: "",
          horaRetorno: "",
          totalDiaria: 0,
          totalPernoite: 0,
          distanciaKm: 0,
          justificativa: "",
        },
      ],
    }));
  };

  const addDestino = (iViagem) => {
    setForm((prev) => {
      const trips = [...prev.trips];
      trips[iViagem].destinos.push({ nome: "", uf: "", latitude: null, longitude: null });
      return { ...prev, trips };
    });
  };

  const styleInput = { padding: "8px", margin: "4px 0", border: "1px solid #ccc", borderRadius: "4px", width: "100%" };
  const totalGeral = form.trips.reduce((acc, t) => acc + t.totalDiaria + t.totalPernoite, 0);

  return (
    <div style={{ maxWidth: "750px", margin: "0 auto", padding: "20px", background: "#f5f5f5", borderRadius: "10px" }}>
      <h1>Formulário de Proposta de Diárias</h1>

      {[ "servidor", "cargo", "matricula", "grupo" ].map((campo, idx) => (
        <input
          key={campo}
          style={styleInput}
          type="text"
          name={campo}
          placeholder={campo.charAt(0).toUpperCase() + campo.slice(1)}
          value={form[campo]}
          ref={(el) => (formRefs.current[idx] = el)}
          onChange={handleChange}
          onKeyDown={(e) => handleKeyDownNext(e, idx)}
        />
      ))}

      <h2>Viagens</h2>
      {form.trips.map((trip, i) => (
        <div key={i} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px", borderRadius: "8px" }}>
          <h3>Viagem {i + 1}</h3>

          {trip.destinos.map((dest, j) => (
            <div key={j}>
              <input
                style={styleInput}
                type="text"
                placeholder="Destino"
                value={dest.nome}
                ref={(el) => (formRefs.current.push(el))}
                onChange={(e) => handleDestinoChange(e, i, j)}
                onFocus={() => setFocusedDestino({ iViagem: i, iDestino: j })}
                onKeyDown={(e) => {
                  if (sugestoes.length > 0) handleDestinoKeyDown(e);
                  else handleKeyDownNext(e, formRefs.current.indexOf(e.target));
                }}
              />
              {focusedDestino.iViagem === i && focusedDestino.iDestino === j && sugestoes.length > 0 && (
                <ul style={{ border: "1px solid #ccc", background: "white", maxHeight: "150px", overflowY: "auto" }}>
                  {sugestoes.map((m, k) => (
                    <li
                      key={k}
                      style={{
                        padding: "6px",
                        cursor: "pointer",
                        background: k === highlightedIndex ? "#e0e0e0" : "white",
                      }}
                      onMouseDown={() => selecionarDestino(m)}
                    >
                      {m.nome} / {m.uf}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <button onClick={() => addDestino(i)} style={{ margin: "5px 0" }}>+ Adicionar Destino</button>

          {["saida", "horaSaida", "retorno", "horaRetorno"].map((field, idx) => (
            <input
              key={field}
              style={styleInput}
              type={field.includes("hora") ? "time" : "date"}
              value={trip[field]}
              ref={(el) => (formRefs.current.push(el))}
              onChange={(e) => handleTripChange(e, i, field)}
              onKeyDown={(e) => handleKeyDownNext(e, formRefs.current.indexOf(e.target))}
            />
          ))}

          <textarea
            style={{ ...styleInput, height: "60px" }}
            placeholder="Justificativa"
            value={trip.justificativa}
            ref={(el) => (formRefs.current.push(el))}
            onChange={(e) => handleTripChange(e, i, "justificativa")}
            onKeyDown={(e) => handleKeyDownNext(e, formRefs.current.indexOf(e.target))}
          />

          <div style={{ marginTop: "5px", fontWeight: "bold" }}>
            Distância: {trip.distanciaKm.toFixed(2)} km <br />
            Diária: R$ {trip.totalDiaria.toFixed(2)} <br />
            Pernoite: R$ {trip.totalPernoite.toFixed(2)} <br />
            Total Viagem: R$ {(trip.totalDiaria + trip.totalPernoite).toFixed(2)}
          </div>
        </div>
      ))}

      <button onClick={addViagem} style={{ margin: "10px 0", padding: "6px 12px" }}>+ Adicionar Viagem</button>

      <h3>Total Geral: R$ {totalGeral.toFixed(2)}</h3>

      <button onClick={() => gerarPDF(form)} style={{ marginTop: "10px", padding: "10px 20px", background: "blue", color: "white", border: "none", borderRadius: "6px" }}>
        Gerar PDF
      </button>
    </div>
  );
}
