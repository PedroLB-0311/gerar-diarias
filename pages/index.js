"use client";
import { useState, useEffect, useCallback } from "react";
import { ORIGEM, calcularDistanciaORS } from "../utils/ors";
import { gerarPDF } from "../utils/Gerar.pdf";
import { HiPlus, HiTrash, HiLocationMarker, HiCalendar, HiClock, HiDocumentText, HiDownload, HiTruck } from "react-icons/hi";

function parseYMD(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function combineDateTime(dateStr, timeStr) {
  const d = parseYMD(dateStr);
  if (!d) return null;
  const [hh = "00", mm = "00"] = (timeStr || "00:00").split(":");
  d.setHours(Number(hh), Number(mm), 0, 0);
  return d;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

const ufMap = {
  11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO",
  21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL", 28: "SE", 29: "BA",
  31: "MG", 32: "ES", 33: "RJ", 35: "SP",
  41: "PR", 42: "SC", 43: "RS",
  50: "MS", 51: "MT", 52: "GO", 53: "DF",
};

const TABELA = {
  OUTROS_ESTADOS: {
    pernoite: { A: 1280.00, B: 950.00 },
    diaria: { A: { gt8: 200.00, h4a8: 0.00 }, B: { gt8: 160.00, h4a8: 0.00 } },
  },
  ESTADO: {
    pernoite: { A: 400.00, B: 320.00 },
    diaria: {
      LTE200: { A: { gt8: 135.00, h4a8: 100.00 }, B: { gt8: 80.00, h4a8: 60.00 } },
      GT200: { A: { gt8: 135.00, h4a8: 110.00 }, B: { gt8: 135.00, h4a8: 110.00 } },
      CAPITAL: { A: { gt8: 135.00, h4a8: 100.00 }, B: { gt8: 80.00, h4a8: 60.00 } },
    },
  },
};

export default function FormularioDiarias() {
  const [municipios, setMunicipios] = useState([]);
  const [sugestoes, setSugestoes] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [focusedDestino, setFocusedDestino] = useState({ iViagem: null, iDestino: null });
  const [grupo, setGrupo] = useState("A");
  const [form, setForm] = useState({
    servidor: "",
    cpf: "",
    cargo: "",
    matricula: "",
    secretaria: "",
    secretario: "",
    trips: [
      {
        destinos: [{ nome: "", latitude: null, longitude: null, uf: "SC" }],
        justificativa: "",
        saidas: [
          { diaSaida: "", horaSaida: "", diaRetorno: "", horaRetorno: "", veiculo: { tipo: "Oficial", placa: "" } },
        ],
        distanciaKm: 0,
        totalDiaria: 0,
        totalPernoite: 0,
        tipoDiariaResumo: { qtd4a8: 0, qtdAcima8: 0, valor4a8: 0, valorAcima8: 0 },
        tiposDetalhados: [],
        diariasDetalhadas: [],
      },
    ],
  });

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/municipios.json")
      .then((res) => res.json())
      .then((data) => {
        const norm = data.map((m) => ({
          nome: m.nome,
          uf: ufMap[m.codigo_uf] || "SC",
          latitude: parseFloat(m.latitude),
          longitude: parseFloat(m.longitude),
        }));
        setMunicipios(norm);
      })
      .catch(console.error);
  }, []);

  const handleDestinoChange = (e, iViagem, iDestino) => {
    const valor = e.target.value;
    setForm((prev) => {
      const trips = [...prev.trips];
      trips[iViagem].destinos[iDestino].nome = valor;
      return { ...prev, trips };
    });
    if (valor.length > 1) {
      const filtrados = municipios.filter((m) => m.nome.toLowerCase().startsWith(valor.toLowerCase()));
      const sc = filtrados.filter((m) => m.uf === "SC");
      const outros = filtrados.filter((m) => m.uf !== "SC");
      setSugestoes([...sc, ...outros].slice(0, 10));
      setFocusedDestino({ iViagem, iDestino });
      setHighlightedIndex(0);
    } else setSugestoes([]);
  };

  const selecionarDestino = async (destino) => {
    setForm((prev) => {
      const trips = [...prev.trips];
      trips[focusedDestino.iViagem].destinos[focusedDestino.iDestino] = destino;
      return { ...prev, trips };
    });
    setSugestoes([]);
  };

  const handleDestinoKeyDown = (e) => {
    if (!sugestoes.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((p) => (p + 1) % sugestoes.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((p) => (p - 1 + sugestoes.length) % sugestoes.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selecionarDestino(sugestoes[highlightedIndex]);
    }
  };

  const addViagem = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      trips: [
        ...prev.trips,
        {
          destinos: [{ nome: "", latitude: null, longitude: null, uf: "SC" }],
          justificativa: "",
          saidas: [{ diaSaida: "", horaSaida: "", diaRetorno: "", horaRetorno: "", veiculo: { tipo: "Oficial", placa: "" } }],
          distanciaKm: 0,
          totalDiaria: 0,
          totalPernoite: 0,
          tipoDiariaResumo: { qtd4a8: 0, qtdAcima8: 0, valor4a8: 0, valorAcima8: 0 },
          tiposDetalhados: [],
          diariasDetalhadas: [],
        },
      ],
    }));
  }, []);

  const removeViagem = useCallback((iViagem) => {
    setForm((prev) => {
      const trips = [...prev.trips];
      trips.splice(iViagem, 1);
      return { ...prev, trips };
    });
  }, []);

  const addDestino = useCallback((iViagem) => {
    setForm((prev) => {
      const trips = [...prev.trips];
      trips[iViagem].destinos.push({ nome: "", latitude: null, longitude: null, uf: "SC" });
      return { ...prev, trips };
    });
  }, []);

  const removeDestino = useCallback((iViagem, iDestino) => {
    setForm((prev) => {
      const trips = [...prev.trips];
      trips[iViagem].destinos.splice(iDestino, 1);
      if (trips[iViagem].destinos.length === 0) {
        trips[iViagem].destinos.push({ nome: "", latitude: null, longitude: null, uf: "SC" });
      }
      return { ...prev, trips };
    });
  }, []);

  const addSaida = useCallback((iViagem) => {
    console.log(`Adding saída for viagem ${iViagem}`); // Debug log
    setForm((prev) => {
      const trips = [...prev.trips];
      const diaBase = trips[iViagem].saidas.length > 0 ? trips[iViagem].saidas[0].diaSaida : "";
      if (!trips[iViagem].saidas) trips[iViagem].saidas = [];
      trips[iViagem].saidas.push({
        diaSaida: diaBase,
        horaSaida: "",
        diaRetorno: "",
        horaRetorno: "",
        veiculo: { tipo: "Oficial", placa: "" },
      });
      return { ...prev, trips };
    });
  }, []);

  const removeSaida = useCallback((iViagem, iSaida) => {
    setForm((prev) => {
      const trips = [...prev.trips];
      trips[iViagem].saidas.splice(iSaida, 1);
      if (trips[iViagem].saidas.length === 0) {
        trips[iViagem].saidas.push({ diaSaida: "", horaSaida: "", diaRetorno: "", horaRetorno: "", veiculo: { tipo: "Oficial", placa: "" } });
      }
      return { ...prev, trips };
    });
  }, []);

  const classificarContexto = (destinos, distanciaKm) => {
    const foraSC = destinos.some((d) => d.uf && d.uf !== "SC");
    if (foraSC) return "OUTROS_ESTADOS";
    const capital = destinos.some((d) => d.uf === "SC" && /florian[oó]polis/i.test(d.nome || ""));
    if (capital) return "CAPITAL";
    if (distanciaKm > 200) return "GT200";
    return "LTE200";
  };

  const obterValores = (localGrupo, contexto, faixa) => {
    const g = localGrupo;
    if (contexto === "OUTROS_ESTADOS") return TABELA.OUTROS_ESTADOS.diaria[g][faixa];
    const mapa =
      contexto === "CAPITAL"
        ? TABELA.ESTADO.diaria.CAPITAL
        : contexto === "GT200"
        ? TABELA.ESTADO.diaria.GT200
        : TABELA.ESTADO.diaria.LTE200;
    return mapa[g][faixa];
  };

  const obterPernoite = (localGrupo, contexto) => {
    const g = localGrupo;
    if (contexto === "OUTROS_ESTADOS") return TABELA.OUTROS_ESTADOS.pernoite[g];
    return TABELA.ESTADO.pernoite[g];
  };

  const calcularTrip = async (trip, localGrupo) => {
    let distanciaKm = 0;
    for (const d of trip.destinos) {
      const dist = await calcularDistanciaORS(d);
      if (dist > distanciaKm) distanciaKm = dist;
    }

    const horasPorDia = new Map();
    let totalNoites = 0;

    for (const s of trip.saidas || []) {
      if (!s.diaSaida || !s.horaSaida || !s.diaRetorno || !s.horaRetorno) continue;
      const ini = combineDateTime(s.diaSaida, s.horaSaida);
      const fim = combineDateTime(s.diaRetorno, s.horaRetorno);
      
      if (!ini || !fim || fim <= ini) continue;

      const dateIni = parseYMD(s.diaSaida);
      const dateFim = parseYMD(s.diaRetorno);
      const dias = Math.floor((dateFim - dateIni) / 86400000) + 1;
      totalNoites += Math.max(0, dias - 1);

      let current = new Date(ini);
      while (current < fim) {
        const nextDay = addDays(current, 1);
        const endThisDay = nextDay < fim ? nextDay : fim;
        const hoursThisDay = (endThisDay - current) / 3600000;
        const dayKey = current.toISOString().slice(0, 10);
        horasPorDia.set(dayKey, (horasPorDia.get(dayKey) || 0) + hoursThisDay);
        current = nextDay;
      }
    }

    const contexto = classificarContexto(trip.destinos, distanciaKm);

    let totalDiaria = 0,
      qtd4a8 = 0,
      qtdAcima8 = 0,
      valor4a8 = 0,
      valorAcima8 = 0;
    const diariasDetalhadas = [];

    for (const [diaISO, horas] of horasPorDia.entries()) {
      const diaBase = parseYMD(diaISO);
      let faixa = null;
      if (horas >= 8) faixa = "gt8";
      else if (horas >= 4) faixa = "h4a8";

      if (faixa) {
        const unit = obterValores(localGrupo, contexto, faixa);
        if (unit > 0) {
          totalDiaria += unit;
          if (faixa === "h4a8") {
            qtd4a8++;
            valor4a8 = unit;
          }
          if (faixa === "gt8") {
            qtdAcima8++;
            valorAcima8 = unit;
          }
          diariasDetalhadas.push({
            dia: diaISO,
            horas,
            faixa,
            valor: unit,
            fimDeSemana: isWeekend(diaBase),
          });
        }
      }
    }

    const unitPernoite = obterPernoite(localGrupo, contexto);
    const totalPernoite = totalNoites * unitPernoite;

    const tiposDetalhados = [];
    if (qtd4a8 > 0) tiposDetalhados.push("Entre 4 e 8 horas");
    if (qtdAcima8 > 0) tiposDetalhados.push("Mais de 8 horas");
    if (totalPernoite > 0) tiposDetalhados.push("Com pernoite");
    if (contexto === "OUTROS_ESTADOS") tiposDetalhados.push("Outro Estado");

    return {
      ...trip,
      distanciaKm,
      totalDiaria,
      totalPernoite,
      tipoDiariaResumo: { qtd4a8, qtdAcima8, valor4a8, valorAcima8 },
      tiposDetalhados,
      diariasDetalhadas,
    };
  };

  useEffect(() => {
    (async () => {
      const newTrips = [];
      for (const t of form.trips) {
        const tCalc = await calcularTrip(t, grupo);
        newTrips.push(tCalc);
      }
      setForm((prev) => ({ ...prev, trips: newTrips }));
    })();
  }, [grupo, JSON.stringify(form.trips.map((t) => ({ destinos: t.destinos, saidas: t.saidas })))]);

  const validarFormulario = () => {
    if (!form.servidor.trim()) return alert("Preencha o servidor"), false;
    if (!form.cpf.trim()) return alert("Preencha o CPF"), false;
    if (!form.cargo.trim()) return alert("Preencha o cargo"), false;
    if (!form.matricula.trim()) return alert("Preencha a matrícula"), false;
    if (!form.secretaria.trim()) return alert("Preencha a secretaria"), false;
    if (!form.secretario.trim()) return alert("Preencha o secretário"), false;

    for (let i = 0; i < form.trips.length; i++) {
      const t = form.trips[i];
      if (!t.justificativa.trim()) return alert(`Preencha a justificativa da viagem ${i + 1}`), false;
      for (let j = 0; j < t.destinos.length; j++) {
        if (!t.destinos[j].nome.trim()) return alert(`Preencha o destino ${j + 1} da viagem ${i + 1}`), false;
      }
      const temSaidaValida = (t.saidas || []).some((s) => s.diaSaida && s.horaSaida && s.diaRetorno && s.horaRetorno);
      if (!temSaidaValida) return alert(`Informe ao menos uma saída completa na viagem ${i + 1}`), false;
    }
    return true;
  };

  const handleGerarPDF = useCallback(() => {
    if (!validarFormulario()) return;
    gerarPDF(form);
  }, [form]);

  const totalGeral = form.trips.reduce((acc, t) => acc + (t.totalDiaria || 0) + (t.totalPernoite || 0), 0);

  return (
    <div style={{
      maxWidth: "1000px",
      margin: "30px auto",
      fontFamily: "'Roboto', sans-serif",
      background: "#ffffff",
      borderRadius: "10px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
      overflow: "hidden"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-5px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .container {
          padding: 30px;
          background: linear-gradient(135deg, #f5f7f5, #ffffff);
          animation: fadeIn 0.4s ease-in;
        }
        .header {
          background: #1a5c28;
          color: white;
          padding: 15px 30px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 4px solid #2f7a38;
        }
        .input-field, .select-field, .textarea-field {
          border: 1px solid #a3c4a3;
          border-radius: 6px;
          padding: 10px;
          font-size: 15px;
          width: 100%;
          box-sizing: border-box;
          transition: all 0.3s ease;
        }
        .input-field:focus, .select-field:focus, .textarea-field:focus {
          border-color: #2f7a38;
          box-shadow: 0 0 6px rgba(47, 122, 56, 0.2);
          outline: none;
        }
        .button {
          background: #2f7a38;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 500;
          transition: background 0.3s ease, transform 0.2s ease;
        }
        .button:hover {
          background: #256b2d;
          transform: translateY(-1px);
        }
        .button-danger {
          background: #a30000;
        }
        .button-danger:hover {
          background: #7a0000;
        }
        .suggestion-item {
          padding: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
        }
        .suggestion-item:hover, .suggestion-item.active {
          background: #2f7a38;
          color: white;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #1a5c28;
          margin-bottom: 20px;
          font-size: 18px;
          font-weight: 500;
          animation: slideIn 0.3s ease;
        }
        .summary {
          background: #e6f0ea;
          padding: 15px;
          border-radius: 6px;
          font-size: 15px;
          margin-top: 15px;
          border-left: 4px solid #2f7a38;
        }
        .footer {
          background: #1a5c28;
          color: white;
          padding: 10px 30px;
          text-align: center;
          font-size: 14px;
          border-top: 4px solid #2f7a38;
        }
        .form-section {
          margin-bottom: 30px;
        }
        .input-group {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
        }
        .trip-section {
          padding: 20px;
          border: 1px solid #a3c4a3;
          border-radius: 8px;
          background: #f9fbf9;
          margin-bottom: 25px;
        }
      `}</style>

      <header className="header">
        <HiDocumentText size={28} />
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>
          Proposta de Diárias - Prefeitura de São Ludgero
        </h1>
      </header>

      <div className="container">
        <div className="form-section">
          <h2 style={{ color: "#1a5c28", fontSize: "20px", marginBottom: "20px" }}>
            Dados do Servidor
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
            <div className="input-group">
              <HiDocumentText size={20} color="#2f7a38" />
              <input
                className="input-field"
                placeholder="Servidor"
                value={form.servidor}
                onChange={(e) => setForm({ ...form, servidor: e.target.value })}
              />
            </div>
            <div className="input-group">
              <HiDocumentText size={20} color="#2f7a38" />
              <input
                className="input-field"
                placeholder="CPF"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              />
            </div>
            <div className="input-group">
              <HiDocumentText size={20} color="#2f7a38" />
              <input
                className="input-field"
                placeholder="Cargo"
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
              />
            </div>
            <div className="input-group">
              <HiDocumentText size={20} color="#2f7a38" />
              <input
                className="input-field"
                placeholder="Matrícula"
                value={form.matricula}
                onChange={(e) => setForm({ ...form, matricula: e.target.value })}
              />
            </div>
            <div className="input-group">
              <HiDocumentText size={20} color="#2f7a38" />
              <input
                className="input-field"
                placeholder="Secretaria"
                value={form.secretaria}
                onChange={(e) => setForm({ ...form, secretaria: e.target.value })}
              />
            </div>
            <div className="input-group">
              <HiDocumentText size={20} color="#2f7a38" />
              <input
                className="input-field"
                placeholder="Secretário"
                value={form.secretario}
                onChange={(e) => setForm({ ...form, secretario: e.target.value })}
              />
            </div>
            <div className="input-group">
              <HiDocumentText size={20} color="#2f7a38" />
              <select
                className="select-field"
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
              >
                <option value="A">Grupo A</option>
                <option value="B">Grupo B</option>
              </select>
            </div>
          </div>
        </div>

        {form.trips.map((trip, iViagem) => (
          <div key={`viagem-${iViagem}`} className="trip-section">
            <div className="section-header">
              <HiLocationMarker size={22} color="#2f7a38" />
              <h3>Viagem {iViagem + 1}</h3>
              <button
                className="button button-danger"
                onClick={() => removeViagem(iViagem)}
              >
                <HiTrash size={16} /> Excluir Viagem
              </button>
            </div>

            {trip.destinos.map((dest, iDestino) => (
              <div key={`destino-${iViagem}-${iDestino}`} style={{ marginBottom: "20px", position: "relative" }}>
                <div className="input-group">
                  <HiLocationMarker size={20} color="#2f7a38" />
                  <input
                    className="input-field"
                    placeholder="Destino (ex.: Florianópolis)"
                    value={dest.nome}
                    onChange={(e) => handleDestinoChange(e, iViagem, iDestino)}
                    onKeyDown={handleDestinoKeyDown}
                  />
                  <button
                    className="button button-danger"
                    onClick={() => removeDestino(iViagem, iDestino)}
                  >
                    <HiTrash size={16} /> 
                  </button>
                </div>
                {focusedDestino.iViagem === iViagem && focusedDestino.iDestino === iDestino && sugestoes.length > 0 && (
                  <div style={{
                    position: "absolute",
                    background: "white",
                    border: "1px solid #a3c4a3",
                    borderRadius: "6px",
                    zIndex: 10,
                    width: "100%",
                    maxHeight: "200px",
                    overflowY: "auto",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    marginTop: "5px"
                  }}>
                    {sugestoes.map((s, i) => (
                      <div
                        key={`sugestao-${i}`}
                        className={`suggestion-item ${i === highlightedIndex ? 'active' : ''}`}
                        onMouseDown={() => selecionarDestino(s)}
                      >
                        {s.nome} - {s.uf}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button
              className="button"
              onClick={() => addDestino(iViagem)}
              style={{ marginBottom: "20px" }}
            >
              <HiPlus size={16} /> Adicionar Destino
            </button>

            <div style={{ margin: "20px 0" }}>
              {trip.saidas?.map((s, iSaida) => (
                <div key={`saida-${iViagem}-${iSaida}`} style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "15px",
                  marginBottom: "20px",
                  alignItems: "center"
                }}>
                  <div className="input-group">
                    <HiCalendar size={20} color="#2f7a38" />
                    <input
                      className="input-field"
                      type="date"
                      value={s.diaSaida || ""}
                      onChange={(e) =>
                        setForm((prev) => {
                          const trips = [...prev.trips];
                          trips[iViagem].saidas[iSaida].diaSaida = e.target.value;
                          return { ...prev, trips };
                        })
                      }
                    />
                  </div>
                  <div className="input-group">
                    <HiClock size={20} color="#2f7a38" />
                    <input
                      className="input-field"
                      type="time"
                      value={s.horaSaida || ""}
                      onChange={(e) =>
                        setForm((prev) => {
                          const trips = [...prev.trips];
                          trips[iViagem].saidas[iSaida].horaSaida = e.target.value;
                          return { ...prev, trips };
                        })
                      }
                    />
                  </div>
                  <div className="input-group">
                    <HiCalendar size={20} color="#2f7a38" />
                    <input
                      className="input-field"
                      type="date"
                      value={s.diaRetorno || ""}
                      onChange={(e) =>
                        setForm((prev) => {
                          const trips = [...prev.trips];
                          trips[iViagem].saidas[iSaida].diaRetorno = e.target.value;
                          return { ...prev, trips };
                        })
                      }
                    />
                  </div>
                  <div className="input-group">
                    <HiClock size={20} color="#2f7a38" />
                    <input
                      className="input-field"
                      type="time"
                      value={s.horaRetorno || ""}
                      onChange={(e) =>
                        setForm((prev) => {
                          const trips = [...prev.trips];
                          trips[iViagem].saidas[iSaida].horaRetorno = e.target.value;
                          return { ...prev, trips };
                        })
                      }
                    />
                  </div>
                  <div className="input-group">
                    <HiTruck size={20} color="#2f7a38" />
                    <select
                      className="select-field"
                      value={s.veiculo?.tipo || "Oficial"}
                      onChange={(e) =>
                        setForm((prev) => {
                          const trips = [...prev.trips];
                          trips[iViagem].saidas[iSaida].veiculo = { ...s.veiculo, tipo: e.target.value };
                          return { ...prev, trips };
                        })
                      }
                    >
                      <option value="Oficial">Oficial</option>
                      <option value="Particular">Particular</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <HiTruck size={20} color="#2f7a38" />
                    <input
                      className="input-field"
                      placeholder="Placa"
                      value={s.veiculo?.placa || ""}
                      onChange={(e) =>
                        setForm((prev) => {
                          const trips = [...prev.trips];
                          trips[iViagem].saidas[iSaida].veiculo = { ...s.veiculo, placa: e.target.value };
                          return { ...prev, trips };
                        })
                      }
                    />
                  </div>
                  <button
                    className="button button-danger"
                    onClick={() => removeSaida(iViagem, iSaida)}
                  >
                    <HiTrash size={15} /> Remover Saída
                  </button>
                </div>
              ))}
              <button
                className="button"
                onClick={() => addSaida(iViagem)}
              >
                <HiPlus size={16} /> Adicionar Saída
              </button>
            </div>

            <div style={{ marginTop: "20px" }}>
              <div className="input-group">
                <HiDocumentText size={20} color="#2f7a38" />
                <label style={{ color: "#1a5c28", fontWeight: "500" }}>Justificativa:</label>
              </div>
              <textarea
                className="textarea-field"
                placeholder="Digite a justificativa da viagem..."
                value={trip.justificativa}
                onChange={(e) =>
                  setForm((prev) => {
                    const trips = [...prev.trips];
                    trips[iViagem].justificativa = e.target.value;
                    return { ...prev, trips };
                  })
                }
                rows={4}
                style={{ width: "100%", resize: "vertical", marginTop: "10px" }}
              />
            </div>

            <div className="summary">
              <strong>Distância:</strong> {(trip.distanciaKm || 0).toFixed(1)} km |{" "}
              <strong>Diária:</strong> R$ {(trip.totalDiaria || 0).toFixed(2)} |{" "}
              <strong>Pernoite:</strong> R$ {(trip.totalPernoite || 0).toFixed(2)}
            </div>
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "30px" }}>
          <button className="button" onClick={addViagem}>
            <HiPlus size={16} /> Adicionar Viagem
          </button>
          <button className="button" onClick={handleGerarPDF}>
            <HiDownload size={16} /> Gerar PDF
          </button>
        </div>
        <p style={{ marginTop: "20px", fontWeight: "500", color: "#1a5c28", textAlign: "right", fontSize: "16px" }}>
          Total Geral: R$ {totalGeral.toFixed(2)}
        </p>
      </div>

      <footer className="footer">
        Prefeitura Municipal de São Ludgero - Sistema de Gestão de Diárias
      </footer>
    </div>
  );
}