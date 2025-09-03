"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { ORIGEM, calcularDistanciaORS } from "../utils/ors";
import { gerarPDF } from "../utils/Gerar.pdf";
import { HiPlus, HiTrash, HiLocationMarker, HiCalendar, HiClock, HiDocumentText, HiDownload, HiTruck } from "react-icons/hi";
import styles from "./FormularioDiarias.module.css";

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
        diaSaida: "",
        diaRetorno: "",
        saidas: [
          { horaSaida: "", horaRetorno: "", veiculo: { tipo: "Oficial", placa: "" } },
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

  const isCalculating = useRef(false);

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

  const selecionarDestino = (destino) => {
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
          diaSaida: "",
          diaRetorno: "",
          saidas: [{ horaSaida: "", horaRetorno: "", veiculo: { tipo: "Oficial", placa: "" } }],
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
    setForm((prev) => {
      const trips = [...prev.trips];
      if (!trips[iViagem].saidas) trips[iViagem].saidas = [];
      trips[iViagem].saidas.push({
        horaSaida: "",
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
        trips[iViagem].saidas.push({ horaSaida: "", horaRetorno: "", veiculo: { tipo: "Oficial", placa: "" } });
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

  const calcularTrip = useCallback(async (trip, localGrupo) => {
    let distanciaKm = 0;
    for (const d of trip.destinos) {
      const dist = await calcularDistanciaORS(d);
      if (dist > distanciaKm) distanciaKm = dist;
    }

    const horasPorDia = new Map();
    let totalNoites = 0;

    for (const s of trip.saidas || []) {
      if (!s.horaSaida || !s.horaRetorno || !trip.diaSaida || !trip.diaRetorno) continue;
      const ini = combineDateTime(trip.diaSaida, s.horaSaida);
      const fim = combineDateTime(trip.diaRetorno, s.horaRetorno);
      
      if (!ini || !fim || fim <= ini) continue;

      const dateIni = parseYMD(trip.diaSaida);
      const dateFim = parseYMD(trip.diaRetorno);
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
        const multiplier = isWeekend(diaBase) ? 2 : 1;
        const effectiveUnit = unit * multiplier;
        if (unit > 0) {
          totalDiaria += effectiveUnit;
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
            valor: effectiveUnit,
            fimDeSemana: isWeekend(diaBase),
          });
        }
      }
    }

    const unitPernoite = obterPernoite(localGrupo, contexto);
    const totalPernoite = totalNoites * unitPernoite;

    const tiposDetalhados = [];
    if (qtd4a8 > 0) tiposDetalhados.push(`Entre 4 e 8 horas${valor4a8 > 0 ? ` (R$ ${valor4a8.toFixed(2)})` : ""}`);
    if (qtdAcima8 > 0) tiposDetalhados.push(`Mais de 8 horas${valorAcima8 > 0 ? ` (R$ ${valorAcima8.toFixed(2)})` : ""}`);
    if (totalPernoite > 0) tiposDetalhados.push(`Com pernoite (R$ ${unitPernoite.toFixed(2)})`);
    if (contexto === "OUTROS_ESTADOS") tiposDetalhados.push("Outro Estado");
    if (diariasDetalhadas.some((d) => d.fimDeSemana)) tiposDetalhados.push("Diária dobrada em fim de semana");

    return {
      ...trip,
      distanciaKm,
      totalDiaria,
      totalPernoite,
      tipoDiariaResumo: { qtd4a8, qtdAcima8, valor4a8, valorAcima8 },
      tiposDetalhados,
      diariasDetalhadas,
    };
  }, []);

  const recalcularTrips = useCallback(async () => {
    if (isCalculating.current) return;
    isCalculating.current = true;

    try {
      const effectiveGrupo = grupo === "B Acompanhando" ? "A" : grupo;
      const newTrips = [];
      for (const t of form.trips) {
        const tCalc = await calcularTrip(t, effectiveGrupo);
        newTrips.push(tCalc);
      }

      setForm((prev) => {
        const isSame = prev.trips.every((trip, i) => {
          const newTrip = newTrips[i];
          return (
            trip.distanciaKm === newTrip.distanciaKm &&
            trip.totalDiaria === newTrip.totalDiaria &&
            trip.totalPernoite === newTrip.totalPernoite &&
            JSON.stringify(trip.tipoDiariaResumo) === JSON.stringify(newTrip.tipoDiariaResumo) &&
            JSON.stringify(trip.tiposDetalhados) === JSON.stringify(newTrip.tiposDetalhados) &&
            JSON.stringify(trip.diariasDetalhadas) === JSON.stringify(newTrip.diariasDetalhadas)
          );
        });
        if (isSame) return prev;
        return { ...prev, trips: newTrips };
      });
    } finally {
      isCalculating.current = false;
    }
  }, [grupo, form.trips, calcularTrip]);

  useEffect(() => {
    recalcularTrips();
  }, [grupo, recalcularTrips]);

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
      if (!t.diaSaida) return alert(`Preencha o dia de saída da viagem ${i + 1}`), false;
      if (!t.diaRetorno) return alert(`Preencha o dia de retorno da viagem ${i + 1}`), false;
      for (let j = 0; j < t.destinos.length; j++) {
        if (!t.destinos[j].nome.trim()) return alert(`Preencha o destino ${j + 1} da viagem ${i + 1}`), false;
      }
      const temSaidaValida = (t.saidas || []).some((s, j) => {
        if (!s.horaSaida || !s.horaRetorno) return false;
        const ini = combineDateTime(t.diaSaida, s.horaSaida);
        const fim = combineDateTime(t.diaRetorno, s.horaRetorno);
        if (!ini || !fim || fim <= ini) {
          alert(`Horas inválidas na saída ${j + 1} da viagem ${i + 1}. Verifique se a hora de retorno é posterior à de saída ou datas corretas.`);
          return false;
        }
        return true;
      });
      if (!temSaidaValida) return alert(`Informe ao menos uma saída completa e válida na viagem ${i + 1}`), false;
    }
    return true;
  };

  const handleGerarPDF = useCallback(() => {
    if (!validarFormulario()) return;
    gerarPDF(form);
  }, [form]);

  const totalGeral = form.trips.reduce((acc, t) => acc + (t.totalDiaria || 0) + (t.totalPernoite || 0), 0);

  return (
    <div className={styles.containerWrapper}>
      <header className={styles.header}>
        <HiDocumentText size={28} />
        <h1>Proposta de Diárias - Prefeitura de São Ludgero</h1>
      </header>

      <div className={styles.container}>
        <div className={styles.formSection}>
          <h2>Dados do Servidor</h2>
          <div className={styles.inputGrid}>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="servidor">Servidor</label>
              <div className={styles.inputWrapper}>
                <HiDocumentText size={20} color="#2f7a38" />
                <input
                  id="servidor"
                  className={styles.inputField}
                  placeholder="Nome do servidor"
                  value={form.servidor}
                  onChange={(e) => setForm({ ...form, servidor: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="cpf">CPF</label>
              <div className={styles.inputWrapper}>
                <HiDocumentText size={20} color="#2f7a38" />
                <input
                  id="cpf"
                  className={styles.inputField}
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="cargo">Cargo</label>
              <div className={styles.inputWrapper}>
                <HiDocumentText size={20} color="#2f7a38" />
                <input
                  id="cargo"
                  className={styles.inputField}
                  placeholder="Cargo do servidor"
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="matricula">Matrícula</label>
              <div className={styles.inputWrapper}>
                <HiDocumentText size={20} color="#2f7a38" />
                <input
                  id="matricula"
                  className={styles.inputField}
                  placeholder="Número da matrícula"
                  value={form.matricula}
                  onChange={(e) => setForm({ ...form, matricula: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="secretaria">Secretaria</label>
              <div className={styles.inputWrapper}>
                <HiDocumentText size={20} color="#2f7a38" />
                <input
                  id="secretaria"
                  className={styles.inputField}
                  placeholder="Nome da secretaria"
                  value={form.secretaria}
                  onChange={(e) => setForm({ ...form, secretaria: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="secretario">Secretário</label>
              <div className={styles.inputWrapper}>
                <HiDocumentText size={20} color="#2f7a38" />
                <input
                  id="secretario"
                  className={styles.inputField}
                  placeholder="Nome do secretário"
                  value={form.secretario}
                  onChange={(e) => setForm({ ...form, secretario: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="grupo">Grupo</label>
              <div className={styles.inputWrapper}>
                <HiDocumentText size={20} color="#2f7a38" />
                <select
                  id="grupo"
                  className={styles.selectField}
                  value={grupo}
                  onChange={(e) => setGrupo(e.target.value)}
                >
                  <option value="A">Grupo A</option>
                  <option value="B">Grupo B</option>
                  <option value="B Acompanhando">Grupo B Acompanhando</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {form.trips.map((trip, iViagem) => (
          <div key={`viagem-${iViagem}`} className={styles.tripSection}>
            <div className={styles.sectionHeader}>
              <h3>Viagem {iViagem + 1}</h3>
              <button
                className={styles.buttonDanger}
                onClick={() => removeViagem(iViagem)}
              >
                <HiTrash size={16} /> Excluir Viagem
              </button>
            </div>

            <div className={styles.saidaGrid}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor={`diaSaida-${iViagem}`}>Dia de Saída</label>
                <div className={styles.inputWrapper}>
                  <HiCalendar size={20} color="#2f7a38" />
                  <input
                    id={`diaSaida-${iViagem}`}
                    className={styles.inputField}
                    type="date"
                    value={trip.diaSaida || ""}
                    onChange={(e) =>
                      setForm((prev) => {
                        const trips = [...prev.trips];
                        trips[iViagem].diaSaida = e.target.value;
                        return { ...prev, trips };
                      })
                    }
                  />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor={`diaRetorno-${iViagem}`}>Dia de Retorno</label>
                <div className={styles.inputWrapper}>
                  <HiCalendar size={20} color="#2f7a38" />
                  <input
                    id={`diaRetorno-${iViagem}`}
                    className={styles.inputField}
                    type="date"
                    value={trip.diaRetorno || ""}
                    onChange={(e) =>
                      setForm((prev) => {
                        const trips = [...prev.trips];
                        trips[iViagem].diaRetorno = e.target.value;
                        return { ...prev, trips };
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {trip.destinos.map((dest, iDestino) => (
              <div key={`destino-${iViagem}-${iDestino}`} className={styles.destinoContainer}>
                <div className={styles.inputGroupDestino}>
                  <label className={styles.label} htmlFor={`destino-${iViagem}-${iDestino}`}>Destino</label>
                  <div className={styles.inputWrapper}>
                    <HiLocationMarker size={20} color="#2f7a38" />
                    <input
                      id={`destino-${iViagem}-${iDestino}`}
                      className={`${styles.inputField} ${styles.inputDestino}`}
                      placeholder="Ex.: Florianópolis"
                      value={dest.nome}
                      onChange={(e) => handleDestinoChange(e, iViagem, iDestino)}
                      onKeyDown={handleDestinoKeyDown}
                    />
                  </div>
                </div>
                <div className={styles.buttonWrapper}>
                  <button
                    className={styles.buttonDanger}
                    onClick={() => removeDestino(iViagem, iDestino)}
                  >
                    <HiTrash size={16} /> Excluir Destino
                  </button>
                </div>
                {focusedDestino.iViagem === iViagem && focusedDestino.iDestino === iDestino && sugestoes.length > 0 && (
                  <div className={styles.suggestionBox}>
                    {sugestoes.map((s, i) => (
                      <div
                        key={`sugestao-${i}`}
                        className={`${styles.suggestionItem} ${i === highlightedIndex ? styles.active : ''}`}
                        onMouseDown={() => selecionarDestino(s)}
                      >
                        {s.nome} - {s.uf}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className={styles.destinoActions}>
              <button
                className={styles.button}
                onClick={() => addDestino(iViagem)}
              >
                <HiPlus size={16} /> Adicionar Destino
              </button>
            </div>

            <div className={styles.saidasContainer}>
              {trip.saidas?.map((s, iSaida) => (
                <div key={`saida-${iViagem}-${iSaida}`} className={styles.saidaGrid}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor={`horaSaida-${iViagem}-${iSaida}`}>Hora de Saída</label>
                    <div className={styles.inputWrapper}>
                      <HiClock size={20} color="#2f7a38" />
                      <input
                        id={`horaSaida-${iViagem}-${iSaida}`}
                        className={styles.inputField}
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
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor={`horaRetorno-${iViagem}-${iSaida}`}>Hora de Retorno</label>
                    <div className={styles.inputWrapper}>
                      <HiClock size={20} color="#2f7a38" />
                      <input
                        id={`horaRetorno-${iViagem}-${iSaida}`}
                        className={styles.inputField}
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
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor={`veiculoTipo-${iViagem}-${iSaida}`}>Tipo de Veículo</label>
                    <div className={styles.inputWrapper}>
                      <HiTruck size={20} color="#2f7a38" />
                      <select
                        id={`veiculoTipo-${iViagem}-${iSaida}`}
                        className={styles.selectField}
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
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor={`placa-${iViagem}-${iSaida}`}>Placa do Veículo</label>
                    <div className={styles.inputWrapper}>
                      <HiTruck size={20} color="#2f7a38" />
                      <input
                        id={`placa-${iViagem}-${iSaida}`}
                        className={styles.inputField}
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
                  </div>
                  <div className={styles.buttonWrapper}>
                    <button
                      className={styles.buttonDanger}
                      onClick={() => removeSaida(iViagem, iSaida)}
                    >
                      <HiTrash size={15} /> Remover Saída
                    </button>
                  </div>
                </div>
              ))}
              <div className={styles.saidaActions}>
                <button
                  className={styles.button}
                  onClick={() => addSaida(iViagem)}
                >
                  <HiPlus size={16} /> Adicionar Saída
                </button>
              </div>
            </div>

            <div className={styles.justificativaContainer}>
              <label className={styles.label} htmlFor={`justificativa-${iViagem}`}>Justificativa</label>
              <textarea
                id={`justificativa-${iViagem}`}
                className={styles.textareaField}
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
              />
            </div>

            <div className={styles.summary}>
              <strong>Distância:</strong> {(trip.distanciaKm || 0).toFixed(1)} km |{" "}
              <strong>Diária:</strong> R$ {(trip.totalDiaria || 0).toFixed(2)} |{" "}
              <strong>Pernoite:</strong> R$ {(trip.totalPernoite || 0).toFixed(2)}
              {trip.diariasDetalhadas.some((d) => d.fimDeSemana) && (
                <span> | <strong>Nota:</strong> Diárias dobradas em finais de semana</span>
              )}
            </div>
          </div>
        ))}

        <div className={styles.actionButtons}>
          <button className={styles.button} onClick={addViagem}>
            <HiPlus size={16} /> Adicionar Viagem
          </button>
          <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={handleGerarPDF}>
            <HiDownload size={16} /> Gerar PDF
          </button>
        </div>
        <p className={styles.totalGeral}>
          Total Geral: R$ {totalGeral.toFixed(2)}
        </p>
      </div>

      <footer className={styles.footer}>
        Prefeitura Municipal de São Ludgero - Sistema de Gestão de Diárias - Pedro Ivo Lembeck Bianco
      </footer>
    </div>
  );
}