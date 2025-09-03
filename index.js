"use client";
import { useState, useEffect } from "react";
import { ORIGEM, calcularDistanciaORS } from "../utils/ors";
import { gerarPDF } from "../utils/Gerar.pdf";
import { HiPlus } from "react-icons/hi";

// --- Funções auxiliares de data e hora
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
function hoursInDay(start, end, day) {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
  const s = start > dayStart ? start : dayStart;
  const e = end < dayEnd ? end : dayEnd;
  return Math.max(0, (e - s) / 3600000);
}

// --- Mapeamento de UF
const ufMap = {
  11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO",
  21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL", 28: "SE", 29: "BA",
  31: "MG", 32: "ES", 33: "RJ", 35: "SP",
  41: "PR", 42: "SC", 43: "RS",
  50: "MS", 51: "MT", 52: "GO", 53: "DF",
};

// --- Tabela de diárias atualizada conforme o Decreto Nº 056/2025
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
          { dia: "", horaSaida: "", horaRetorno: "", veiculo: { tipo: "Oficial", placa: "" } },
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

  // --- Carregar municípios
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

  // --- Autocomplete
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

  // --- Helpers de form
  const addViagem = () =>
    setForm((prev) => ({
      ...prev,
      trips: [
        ...prev.trips,
        {
          destinos: [{ nome: "", latitude: null, longitude: null, uf: "SC" }],
          justificativa: "",
          saidas: [{ dia: "", horaSaida: "", horaRetorno: "", veiculo: { tipo: "Oficial", placa: "" } }],
          distanciaKm: 0,
          totalDiaria: 0,
          totalPernoite: 0,
          tipoDiariaResumo: { qtd4a8: 0, qtdAcima8: 0, valor4a8: 0, valorAcima8: 0 },
          tiposDetalhados: [],
          diariasDetalhadas: [],
        },
      ],
    }));

  const removeViagem = (iViagem) =>
    setForm((prev) => {
      const trips = [...prev.trips];
      trips.splice(iViagem, 1);
      return { ...prev, trips };
    });

  const addDestino = (iViagem) =>
    setForm((prev) => {
      const trips = [...prev.trips];
      trips[iViagem].destinos.push({ nome: "", latitude: null, longitude: null, uf: "SC" });
      return { ...prev, trips };
    });

  const removeDestino = (iViagem, iDestino) =>
    setForm((prev) => {
      const trips = [...prev.trips];
      trips[iViagem].destinos.splice(iDestino, 1);
      if (trips[iViagem].destinos.length === 0) {
        trips[iViagem].destinos.push({ nome: "", latitude: null, longitude: null, uf: "SC" });
      }
      return { ...prev, trips };
    });

  const addSaida = (iViagem) =>
    setForm((prev) => {
      const trips = [...prev.trips];
      const diaBase = trips[iViagem].saidas.length > 0 ? trips[iViagem].saidas[0].dia : "";
      if (!trips[iViagem].saidas) trips[iViagem].saidas = [];
      trips[iViagem].saidas.push({
        dia: diaBase,
        horaSaida: "",
        horaRetorno: "",
        veiculo: { tipo: "Oficial", placa: "" },
      });
      return { ...prev, trips };
    });

  const removeSaida = (iViagem, iSaida) =>
    setForm((prev) => {
      const trips = [...prev.trips];
      trips[iViagem].saidas.splice(iSaida, 1);
      if (trips[iViagem].saidas.length === 0) {
        trips[iViagem].saidas.push({ dia: "", horaSaida: "", horaRetorno: "", veiculo: { tipo: "Oficial", placa: "" } });
      }
      return { ...prev, trips };
    });

  // --- Classificação e obtenção de valores
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

  // --- Cálculo por viagem (suporta múltiplas saídas no mesmo dia)
  const calcularTrip = async (trip, localGrupo) => {
    // 1) Distância: pega a MAIOR distância de qualquer destino em relação à ORIGEM
    let distanciaKm = 0;
    for (const d of trip.destinos) {
      const dist = await calcularDistanciaORS(d);
      if (dist > distanciaKm) distanciaKm = dist;
    }

    // 2) Junta horas por DIA (se tiver 2 saídas no mesmo dia, soma as horas e aplica 1 diária nesse dia)
    // Mapa: diaISO -> totalHoras
    const horasPorDia = new Map();
    let minInicio = null;
    let maxFim = null;

    for (const s of trip.saidas || []) {
      if (!s.dia || !s.horaSaida || !s.horaRetorno) continue;
      const ini = combineDateTime(s.diaSaida, s.horaSaida);
      const fim = combineDateTime(s.diaRetorno, s.horaRetorno);
      
      if (!ini || !fim) continue;

      // Mantém período global para checar pernoite
      if (!minInicio || ini < minInicio) minInicio = ini;
      if (!maxFim || fim > maxFim) maxFim = fim;

      // Como os períodos são por dia, usamos apenas o mesmo dia
      const horas = Math.max(0, (fim - ini) / 3600000);
      const key = s.dia;
      horasPorDia.set(key, (horasPorDia.get(key) || 0) + horas);
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

    // 3) Pernoite: calcular número de noites baseado no período total (diasInteiros - 1)
    let totalPernoite = 0;
    if (minInicio && maxFim) {
      const dateMin = parseYMD(minInicio.toISOString().slice(0, 10));
      const dateMax = parseYMD(maxFim.toISOString().slice(0, 10));
      const diasInteiros = Math.floor((dateMax - dateMin) / 86400000) + 1;
      const noites = diasInteiros > 1 ? diasInteiros - 1 : 0;
      const unit = obterPernoite(localGrupo, contexto);
      totalPernoite = noites * unit;
    }

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

  // --- Recalcular quando mudar grupo ou qualquer campo das trips
  useEffect(() => {
    (async () => {
      const newTrips = [];
      for (const t of form.trips) {
        const tCalc = await calcularTrip(t, grupo);
        newTrips.push(tCalc);
      }
      setForm((prev) => ({ ...prev, trips: newTrips }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupo, JSON.stringify(form.trips.map((t) => ({ destinos: t.destinos, saidas: t.saidas })))]);

  // --- Validação e PDF
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
      // Exige pelo menos uma saída completa
      const temSaidaValida = (t.saidas || []).some((s) => s.horaSaida && s.horaRetorno);
      if (!temSaidaValida) return alert(`Informe ao menos uma saída completa na viagem ${i + 1}`), false;
    }
    return true;
  };

  const handleGerarPDF = () => {
    if (!validarFormulario()) return;
    gerarPDF(form); // Passa todos os dados do formulário para o PDF
  };

  const totalGeral = form.trips.reduce((acc, t) => acc + (t.totalDiaria || 0) + (t.totalPernoite || 0), 0);

  return (
    <div
      style={{
        maxWidth: "950px",
        margin: "25px auto",
        padding: "30px",
        background: "#f5fff5",
        borderRadius: 15,
        boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: 25, color: "#2f7a38" }}>Proposta de Diárias</h1>

      {/* --- Dados do servidor */}
      <div style={{ marginBottom: 20 }}>
        <input placeholder="Servidor" value={form.servidor} onChange={(e) => setForm({ ...form, servidor: e.target.value })} style={{ marginRight: 10, width: 200 }} />
        <input placeholder="CPF" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} style={{ marginRight: 10, width: 150 }} />
        <input placeholder="Cargo" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} style={{ marginRight: 10, width: 200 }} />
        <input placeholder="Matrícula" value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} style={{ marginRight: 10, width: 120 }} />
        <input placeholder="Secretaria" value={form.secretaria} onChange={(e) => setForm({ ...form, secretaria: e.target.value })} style={{ marginRight: 10, width: 200 }} />
        <input placeholder="Secretário" value={form.secretario} onChange={(e) => setForm({ ...form, secretario: e.target.value })} style={{ marginRight: 10, width: 200 }} />
        <select value={grupo} onChange={(e) => setGrupo(e.target.value)} style={{ marginLeft: 10 }}>
          <option value="A">Grupo A</option>
          <option value="B">Grupo B</option>
        </select>
      </div>

      {/* --- Viagens e destinos */}
      {form.trips.map((trip, iViagem) => (
        <div key={iViagem} style={{ marginBottom: 25, padding: 15, border: "1px solid #ccc", borderRadius: 8 }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Viagem {iViagem + 1}
            <button
              onClick={() => removeViagem(iViagem)}
              style={{ marginLeft: 10, background: "red", color: "white", border: "none", padding: "4px 8px", borderRadius: 5, cursor: "pointer" }}
            >
              Excluir Viagem
            </button>
          </h3>

          {/* Destinos */}
          {trip.destinos.map((dest, iDestino) => (
            <div key={iDestino} style={{ marginBottom: 10, position: "relative" }}>
              <input
                placeholder="Destino"
                value={dest.nome}
                onChange={(e) => handleDestinoChange(e, iViagem, iDestino)}
                onKeyDown={handleDestinoKeyDown}
                style={{ width: "300px", marginRight: 10 }}
              />
              <button
                onClick={() => removeDestino(iViagem, iDestino)}
                style={{ background: "#b30000", color: "white", border: "none", padding: "4px 8px", borderRadius: 5, cursor: "pointer" }}
              >
                Excluir Destino
              </button>

              {/* Sugestões */}
              {focusedDestino.iViagem === iViagem && focusedDestino.iDestino === iDestino && sugestoes.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    background: "#fff",
                    border: "1px solid #ccc",
                    zIndex: 10,
                    width: "300px",
                    maxHeight: 150,
                    overflowY: "auto",
                  }}
                >
                  {sugestoes.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        padding: 5,
                        background: i === highlightedIndex ? "#2f7a38" : "#fff",
                        color: i === highlightedIndex ? "#fff" : "#000",
                        cursor: "pointer",
                      }}
                      onMouseDown={() => selecionarDestino(s)}
                    >
                      {s.nome} - {s.uf}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button onClick={() => addDestino(iViagem)} style={{ marginBottom: 10, padding: "5px 10px" }}>
            <HiPlus /> Adicionar destino
          </button>
{/* Saídas (múltiplas) */}
<div style={{ margin: "10px 0" }}>
  {trip.saidas?.map((s, iSaida) => (
    <div key={iSaida} style={{ marginBottom: 10 }}>
      {/* Dia da saída */}
      <input
        type="date"
        value={s.diaSaida || ""}
        onChange={(e) =>
          setForm((prev) => {
            const trips = [...prev.trips];
            trips[iViagem].saidas[iSaida].diaSaida = e.target.value;
            return { ...prev, trips };
          })
        }
        style={{ marginRight: 10 }}
      />

      {/* Hora da saída */}
      <input
        type="time"
        value={s.horaSaida || ""}
        onChange={(e) =>
          setForm((prev) => {
            const trips = [...prev.trips];
            trips[iViagem].saidas[iSaida].horaSaida = e.target.value;
            return { ...prev, trips };
          })
        }
        style={{ width: 120, marginRight: 10 }}
      />

      {/* Dia do retorno */}
      <input
        type="date"
        value={s.diaRetorno || ""}
        onChange={(e) =>
          setForm((prev) => {
            const trips = [...prev.trips];
            trips[iViagem].saidas[iSaida].diaRetorno = e.target.value;
            return { ...prev, trips };
          })
        }
        style={{ marginRight: 10 }}
      />

      {/* Hora do retorno */}
      <input
        type="time"
        value={s.horaRetorno || ""}
        onChange={(e) =>
          setForm((prev) => {
            const trips = [...prev.trips];
            trips[iViagem].saidas[iSaida].horaRetorno = e.target.value;
            return { ...prev, trips };
          })
        }
        style={{ width: 120, marginRight: 10 }}
      />

      {/* Veículo */}
      <select
        value={s.veiculo?.tipo || "Oficial"}
        onChange={(e) =>
          setForm((prev) => {
            const trips = [...prev.trips];
            trips[iViagem].saidas[iSaida].veiculo = { ...s.veiculo, tipo: e.target.value };
            return { ...prev, trips };
          })
        }
        style={{ marginRight: 10 }}
      >
        <option value="Oficial">Oficial</option>
        <option value="Particular">Particular</option>
      </select>

      {/* Placa */}
      <input
        placeholder="Placa"
        value={s.veiculo?.placa || ""}
        onChange={(e) =>
          setForm((prev) => {
            const trips = [...prev.trips];
            trips[iViagem].saidas[iSaida].veiculo = { ...s.veiculo, placa: e.target.value };
            return { ...prev, trips };
          })
        }
        style={{ width: 110, marginRight: 10 }}
      />

      {/* Botão excluir saída */}
      <button
        onClick={() => removeSaida(iViagem, iSaida)}
        style={{
          background: "red",
          color: "white",
          border: "none",
          padding: "4px 8px",
          borderRadius: 5,
          cursor: "pointer",
        }}
      >
        Excluir saída
      </button>
    </div>
  ))}
  <button
    onClick={() => addSaida(iViagem)}
    style={{ marginBottom: 10, padding: "5px 10px" }}
  >
    <HiPlus /> Adicionar saída
  </button>
</div>
          {/* Justificativa (por viagem) */}
          <div style={{ marginTop: 10 }}>
            <label>
              <strong>Justificativa:</strong>
            </label>
            <textarea
              placeholder="Digite aqui a justificativa da viagem..."
              value={trip.justificativa}
              onChange={(e) =>
                setForm((prev) => {
                  const trips = [...prev.trips];
                  trips[iViagem].justificativa = e.target.value;
                  return { ...prev, trips };
                })
              }
              rows={4}
              style={{ width: "100%", marginTop: 5 }}
            />
          </div>

          {/* Resumo */}
          <div style={{ marginTop: 8 }}>
            <strong>Distância:</strong> {(trip.distanciaKm || 0).toFixed(1)} km |{" "}
            <strong>Total diária:</strong> R$ {(trip.totalDiaria || 0).toFixed(2)} |{" "}
            <strong>Pernoite:</strong> R$ {(trip.totalPernoite || 0).toFixed(2)}
          </div>
        </div>
      ))}

      <button onClick={addViagem} style={{ marginBottom: 20, padding: "10px 15px" }}>
        <HiPlus /> Adicionar viagem
      </button>
      <br />
      <button onClick={handleGerarPDF} style={{ marginTop: 10, padding: "10px 15px", background: "#2f7a38", color: "white", border: "none", borderRadius: 5 }}>
        Gerar PDF
      </button>
      <p style={{ marginTop: 15, fontWeight: "bold" }}>Total Geral: R$ {totalGeral.toFixed(2)}</p>
    </div>
  );
}