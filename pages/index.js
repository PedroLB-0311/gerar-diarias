"use client";
import { useState, useEffect } from "react";
import { gerarPDF } from "../utils/Gerar.pdf";
import {
  HiUser,
  HiIdentification,
  HiClipboardList,
  HiCalendar,
  HiClock,
  HiOutlineTruck,
  HiPlus,
} from "react-icons/hi";

// --- Utilidades de data sem fuso (evita "um dia adiantado")
function parseYMD(yyyy_mm_dd) {
  if (!yyyy_mm_dd) return null;
  const [y, m, d] = yyyy_mm_dd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}
function sameYMD(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function isWeekendLocal(date) {
  const dow = date.getDay(); // 0=dom, 6=sáb
  return dow === 0 || dow === 6;
}
// horas dentro de um determinado dia, limitado pelo intervalo [start,end]
function hoursInDay(rangeStart, rangeEnd, day) {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
  const dayEnd   = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
  const start = rangeStart > dayStart ? rangeStart : dayStart;
  const end   = rangeEnd   < dayEnd   ? rangeEnd   : dayEnd;
  const ms = Math.max(0, end - start);
  return ms / 36e5;
}
// junta data (YYYY-MM-DD) + hora ("HH:MM")
function combineDateTime(dateStr, timeStr) {
  const d = parseYMD(dateStr);
  if (!d) return null;
  const [hh = "00", mm = "00"] = (timeStr || "00:00").split(":");
  d.setHours(Number(hh), Number(mm), 0, 0);
  return d;
}

// --- Haversine
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

// --- IBGE -> UF (corrigido)
const ufMap = {
  11:"RO",12:"AC",13:"AM",14:"RR",15:"PA",16:"AP",17:"TO",
  21:"MA",22:"PI",23:"CE",24:"RN",25:"PB",26:"PE",27:"AL",28:"SE",29:"BA",
  31:"MG",32:"ES",33:"RJ",35:"SP",
  41:"PR",42:"SC",43:"RS",
  50:"MS",51:"MT",52:"GO",53:"DF"
};

const ORIGEM = { nome: "São Ludgero", uf: "SC", latitude: -28.3247, longitude: -49.1806 };

// --- TABELA (Decreto 056/2025)
const TABELA = {
  OUTROS_ESTADOS: {
    pernoite: { A: 1280, B: 950 },
    diaria:   { A: { gt8: 200, h4a8: 200 }, B: { gt8: 160, h4a8: 160 } },
  },
  ESTADO: {
    pernoite: { A: 400, B: 320 },
    diaria: {
      LTE200: { A: { gt8: 135, h4a8: 100 }, B: { gt8: 110, h4a8: 80 } },
      GT200:  { A: { gt8: 135, h4a8: 110 }, B: { gt8: 110, h4a8: 110 } },
      CAPITAL:{ A: { gt8: 135, h4a8: 100 }, B: { gt8: 110, h4a8: 80 } },
    }
  }
};

export default function FormularioDiarias() {
  const [municipios, setMunicipios] = useState([]);
  const [sugestoes, setSugestoes] = useState([]);
  const [focusedDestino, setFocusedDestino] = useState({ iViagem: null, iDestino: null });
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // --- grupo separado do form (resolver loop)
  const [grupo, setGrupo] = useState("A"); // "A" | "B" | "B acompanhado A"

  const [form, setForm] = useState({
    servidor: "", cpf: "", cargo: "", matricula: "",
    secretaria: "", secretario: "",
    trips: [
      {
        destinos: [{ nome:"", latitude:null, longitude:null, uf:"SC" }],
        saida:"", horaSaida:"", retorno:"", horaRetorno:"",
        totalDiaria:0, totalPernoite:0, distanciaKm:0,
        justificativa:"", veiculo:{ tipo:"Oficial", placa:"" },
        tipoDiariaResumo: { qtd4a8: 0, qtdAcima8: 0, valor4a8: 0, valorAcima8: 0 },
        tiposDetalhados: []
      }
    ]
  });

  // --- Carregar municípios
  useEffect(() => {
    fetch("https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/municipios.json")
      .then(res => res.json())
      .then(data => {
        const normalizados = data.map(m => ({
          nome: m.nome,
          uf: ufMap[m.codigo_uf] || "SC",
          latitude: parseFloat(m.latitude),
          longitude: parseFloat(m.longitude)
        }));
        setMunicipios(normalizados);
      })
      .catch(console.error);
  }, []);

  // --- Autocomplete
  const handleDestinoChange = (e, iViagem, iDestino) => {
    const valor = e.target.value;
    setForm(prev => {
      const trips = [...prev.trips];
      trips[iViagem].destinos[iDestino].nome = valor;
      return { ...prev, trips };
    });
    if (valor.length > 1) {
      const filtrados = municipios.filter(m => m.nome.toLowerCase().startsWith(valor.toLowerCase()));
      const sc = filtrados.filter(m => m.uf === "SC");
      const outros = filtrados.filter(m => m.uf !== "SC");
      setSugestoes([...sc, ...outros].slice(0, 10));
      setFocusedDestino({ iViagem, iDestino });
      setHighlightedIndex(0);
    } else {
      setSugestoes([]);
    }
  };
  const selecionarDestino = (destino) => {
    setForm(prev => {
      const trips = [...prev.trips];
      trips[focusedDestino.iViagem].destinos[focusedDestino.iDestino] = destino;
      trips[focusedDestino.iViagem] = calcularTrip(trips[focusedDestino.iViagem], grupo);
      return { ...prev, trips };
    });
    setSugestoes([]);
  };
  const handleDestinoKeyDown = (e) => {
    if (!sugestoes.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightedIndex(p => (p + 1) % sugestoes.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightedIndex(p => (p - 1 + sugestoes.length) % sugestoes.length); }
    else if (e.key === "Enter") { e.preventDefault(); selecionarDestino(sugestoes[highlightedIndex]); }
  };

  // --- Hora (input livre com máscara HH:MM)
  const formatarHorario = (v) => {
    let n = (v || "").replace(/\D/g, "");
    if (n.length > 4) n = n.slice(0, 4);
    return n.length >= 3 ? n.slice(0, 2) + ":" + n.slice(2) : n;
  };

  const handleHoraChange = (e, iViagem, field) => {
    const v = formatarHorario(e.target.value);
    updateTrip(iViagem, { [field]: v });
  };

  // --- Classificação e cálculo conforme decreto (usa `grupo` externo)
  function classificarContexto(destinos, distanciaKm) {
    const foraSC = destinos.some(d => d.uf && d.uf !== "SC");
    if (foraSC) return { tipo: "OUTROS_ESTADOS" };

    const capital = destinos.some(d => d.uf === "SC" && /florian[oó]polis/i.test(d.nome || ""));
    if (capital) return { tipo: "CAPITAL" };

    if (distanciaKm > 200) return { tipo: "GT200" };
    return { tipo: "LTE200" };
  }

  function obterValores(localGrupo, contexto, faixa) {
    const g = localGrupo === "B acompanhado A" ? "A" : localGrupo;
    if (contexto === "OUTROS_ESTADOS") {
      return TABELA.OUTROS_ESTADOS.diaria[g][faixa];
    }
    const mapa =
      contexto === "CAPITAL" ? TABELA.ESTADO.diaria.CAPITAL :
      contexto === "GT200"  ? TABELA.ESTADO.diaria.GT200  :
                               TABELA.ESTADO.diaria.LTE200;
    return mapa[g][faixa];
  }
  function obterPernoite(localGrupo, contexto) {
    const g = localGrupo === "B acompanhado A" ? "A" : localGrupo;
    if (contexto === "OUTROS_ESTADOS") return TABELA.OUTROS_ESTADOS.pernoite[g];
    return TABELA.ESTADO.pernoite[g];
  }
  function calcularTrip(trip, localGrupo) {
    let distanciaKm = 0;
    trip.destinos.forEach(d => {
      if (typeof d.latitude === "number" && typeof d.longitude === "number") {
        const dist = calcularDistancia(ORIGEM.latitude, ORIGEM.longitude, d.latitude, d.longitude);
        if (dist > distanciaKm) distanciaKm = dist;
      }
    });
  
    const dtIni = combineDateTime(trip.saida, trip.horaSaida);
    const dtFim = combineDateTime(trip.retorno, trip.horaRetorno);
    if (!dtIni || !dtFim || dtFim < dtIni) {
      return { ...trip, distanciaKm, totalDiaria: 0, totalPernoite: 0,
        tipoDiariaResumo: { qtd4a8: 0, qtdAcima8: 0, valor4a8: 0, valorAcima8: 0 },
        tiposDetalhados: [],
        diariasDetalhadas: []
      };
    }
  
    const contexto = classificarContexto(trip.destinos, distanciaKm).tipo;
  
    let totalDiaria = 0;
    let qtd4a8 = 0, qtdAcima8 = 0;
    let valor4a8 = 0, valorAcima8 = 0;
    const diariasDetalhadas = [];
  
    let cursor = new Date(dtIni);
    while (cursor <= dtFim) {
      const diaBase = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      const horas = hoursInDay(dtIni, dtFim, diaBase);
  
      let faixa = null;
      if (horas >= 8) faixa = "gt8";
      else if (horas >= 4) faixa = "h4a8";
  
      if (faixa) {
        const unit = obterValores(localGrupo, contexto, faixa);
        totalDiaria += unit;
  
        if (faixa === "h4a8") { qtd4a8 += 1; valor4a8 = unit; }
        if (faixa === "gt8")  { qtdAcima8 += 1; valorAcima8 = unit; }
  
        diariasDetalhadas.push({
          dia: diaBase.toISOString().split("T")[0],
          horas,
          faixa,
          valor: unit,
          fimDeSemana: isWeekendLocal(diaBase)
        });
      }
  
      cursor = addDays(diaBase, 1);
    }
  
    const diasInteiros = Math.floor((parseYMD(trip.retorno) - parseYMD(trip.saida)) / 86400000) + 1;
    const comPernoite = diasInteiros > 1;
    const totalPernoite = comPernoite ? obterPernoite(localGrupo, contexto) : 0;
  
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
      diariasDetalhadas // <-- novo campo
    };
  }
  

  // --- Quando o grupo mudar, recalcula todas usando o grupo separado
  useEffect(() => {
    setForm(prev => {
      const newTrips = prev.trips.map(t => calcularTrip(t, grupo));
      return { ...prev, trips: newTrips };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupo]);

  // --- updateTrip: recalcula só a viagem alterada (usa variável grupo)
  const updateTrip = (index, patch) => {
    setForm(prev => {
      const trips = [...prev.trips];
      trips[index] = { ...trips[index], ...patch };
      trips[index] = calcularTrip(trips[index], grupo); // usa `grupo` aqui (estado separado)
      return { ...prev, trips };
    });
  };

  // adicionar viagens/destinos
  const addViagem = () =>
    setForm(prev => ({
      ...prev,
      trips: [
        ...prev.trips,
        {
          destinos: [{ nome:"", latitude:null, longitude:null, uf:"SC" }],
          saida:"", horaSaida:"", retorno:"", horaRetorno:"",
          totalDiaria:0, totalPernoite:0, distanciaKm:0,
          justificativa:"", veiculo:{ tipo:"Oficial", placa:"" },
          tipoDiariaResumo: { qtd4a8: 0, qtdAcima8: 0, valor4a8: 0, valorAcima8: 0 },
          tiposDetalhados: []
        }
      ]
    }));

  const addDestino = (iViagem) =>
    setForm(prev => {
      const trips = [...prev.trips];
      trips[iViagem].destinos.push({ nome:"", latitude:null, longitude:null, uf:"SC" });
      trips[iViagem] = calcularTrip(trips[iViagem], grupo);
      return { ...prev, trips };
    });

  // validação
  const validarFormulario = () => {
    if (!form.servidor.trim()) { alert("Preencha o servidor"); return false; }
    if (!form.cpf.trim()) { alert("Preencha o CPF"); return false; }
    if (!form.cargo.trim()) { alert("Preencha o cargo"); return false; }
    if (!form.matricula.trim()) { alert("Preencha a matrícula"); return false; }
    if (!form.secretaria.trim()) { alert("Preencha a secretaria"); return false; }
    if (!form.secretario.trim()) { alert("Preencha o secretário"); return false; }
    for (let i = 0; i < form.trips.length; i++) {
      const t = form.trips[i];
      if (!t.saida) { alert(`Preencha a data de saída da viagem ${i + 1}`); return false; }
      if (!t.retorno) { alert(`Preencha a data de retorno da viagem ${i + 1}`); return false; }
      if (!t.horaSaida) { alert(`Preencha a hora de saída da viagem ${i + 1}`); return false; }
      if (!t.horaRetorno) { alert(`Preencha a hora de retorno da viagem ${i + 1}`); return false; }
      if (!t.justificativa.trim()) { alert(`Preencha a justificativa da viagem ${i + 1}`); return false; }
      if (!t.veiculo.placa.trim()) { alert(`Preencha a placa do veículo da viagem ${i + 1}`); return false; }
      for (let j = 0; j < t.destinos.length; j++) {
        if (!t.destinos[j].nome.trim()) { alert(`Preencha o destino ${j + 1} da viagem ${i + 1}`); return false; }
      }
    }
    return true;
  };

  // gerar PDF (envia valores e tipos de diária)
  const handleGerarPDF = () => {
    if (!validarFormulario()) return;
    const dadosConsolidados = {
      servidor: form.servidor,
      cpf: form.cpf,
      cargo: form.cargo,
      matricula: form.matricula,
      secretaria: form.secretaria,
      secretario: form.secretario,
      grupo: grupo,
      viagens: form.trips.map(t => ({
        destinos: t.destinos,
        saida: t.saida,
        horaSaida: t.horaSaida,
        retorno: t.retorno,
        horaRetorno: t.horaRetorno,
        veiculo: t.veiculo,
        justificativa: t.justificativa,
        distanciaKm: t.distanciaKm,
        totalDiaria: t.totalDiaria,
        totalPernoite: t.totalPernoite,
        tipoDiariaResumo: t.tipoDiariaResumo,
        tiposDetalhados: t.tiposDetalhados,
        diariasDetalhadas: t.diariasDetalhadas // <-- enviado para PDF
      }))
    };
    
    gerarPDF(dadosConsolidados);
  };

  // --- Estilos (mantidos)
  const styleContainer = { maxWidth:"950px", margin:"25px auto", padding:"30px", background:"#f5fff5", borderRadius:"15px", boxShadow:"0 6px 20px rgba(0,0,0,0.1)" };
  const styleCard = { background:"#fff", borderRadius:"12px", padding:"20px", marginBottom:"18px", boxShadow:"0 3px 12px rgba(0,0,0,0.08)" };
  const styleInput = { padding:"12px", margin:"6px 0", border:"1px solid #b8e0b8", borderRadius:"8px", width:"100%", fontSize:"15px", boxSizing:"border-box" };
  const styleGrid2 = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"15px" };
  const styleGrid3 = { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"15px" };
  const styleGrid4 = { display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"12px", marginTop:"12px" };
  const styleButton = { padding:"10px 18px", border:"none", borderRadius:"8px", background:"linear-gradient(90deg,#3aa14f,#2f7a38)", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:"5px" };

  const totalGeral = form.trips.reduce((acc,t) => acc + t.totalDiaria + t.totalPernoite, 0);

  return (
    <div style={styleContainer}>
      <h1 style={{textAlign:"center",marginBottom:"25px",color:"#2f7a38"}}>Proposta de Diárias</h1>

      {/* Dados servidor */}
      <div style={styleGrid3}>
        <div><HiUser style={{marginRight:6}}/><input style={styleInput} placeholder="Servidor" value={form.servidor} onChange={e=>setForm({...form,servidor:e.target.value})} /></div>
        <div><HiClipboardList style={{marginRight:6}}/><input style={styleInput} placeholder="CPF" value={form.cpf} onChange={e=>setForm({...form,cpf:e.target.value})} /></div>
        <div><HiIdentification style={{marginRight:6}}/><input style={styleInput} placeholder="Cargo" value={form.cargo} onChange={e=>setForm({...form,cargo:e.target.value})} /></div>
        <div><HiClipboardList style={{marginRight:6}}/><input style={styleInput} placeholder="Matrícula" value={form.matricula} onChange={e=>setForm({...form,matricula:e.target.value})} /></div>
        <div><HiClipboardList style={{marginRight:6}}/><input style={styleInput} placeholder="Secretaria" value={form.secretaria} onChange={e=>setForm({...form,secretaria:e.target.value})} /></div>
        <div><HiClipboardList style={{marginRight:6}}/><input style={styleInput} placeholder="Secretário" value={form.secretario} onChange={e=>setForm({...form,secretario:e.target.value})} /></div>
        <div>
          <HiClipboardList style={{marginRight:6}}/>
          <select style={styleInput} value={grupo} onChange={e=>setGrupo(e.target.value)}>
            <option value="A">Grupo A</option>
            <option value="B">Grupo B</option>
            <option value="B acompanhado A">Grupo B acompanhado A</option>
          </select>
        </div>
      </div>

      <h2 style={{color:"#2f7a38",marginTop:25}}>Viagens</h2>

      {form.trips.map((trip,i)=>(
        <div key={i} style={styleCard}>
          <h3>Viagem {i+1}</h3>

          {trip.destinos.map((dest,j)=>(
            <div key={j} style={{position:"relative"}}>
              <input
                style={styleInput}
                placeholder="Destino"
                value={dest.nome}
                onChange={e=>handleDestinoChange(e,i,j)}
                onFocus={()=>setFocusedDestino({iViagem:i,iDestino:j})}
                onKeyDown={handleDestinoKeyDown}
              />
              {focusedDestino.iViagem===i && focusedDestino.iDestino===j && sugestoes.length>0 && (
                <ul style={{border:"1px solid #b8e0b8",background:"#fff",maxHeight:130,overflowY:"auto",position:"absolute",zIndex:10,width:"100%",margin:0,padding:0,listStyle:"none"}}>
                  {sugestoes.map((m,k)=>(
                    <li
                      key={k}
                      style={{padding:6,cursor:"pointer",background:k===highlightedIndex?"#e0f0e0":"#fff"}}
                      onMouseDown={()=>selecionarDestino(m)}
                      onMouseEnter={()=>setHighlightedIndex(k)}
                    >
                      {m.nome} / {m.uf}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <button type="button" onClick={()=>addDestino(i)} style={styleButton}><HiPlus/> Adicionar Destino</button>

          <div style={styleGrid4}>
            <div><HiCalendar style={{marginRight:4}}/><input style={styleInput} type="date" value={trip.saida} onChange={e=>updateTrip(i,{saida:e.target.value})} /></div>
            <div><HiCalendar style={{marginRight:4}}/><input style={styleInput} type="date" value={trip.retorno} onChange={e=>updateTrip(i,{retorno:e.target.value})} /></div>
            <div><HiClock style={{marginRight:4}}/><input style={styleInput} type="text" placeholder="Hora saída (HH:MM)" value={trip.horaSaida} onChange={e=>handleHoraChange(e,i,"horaSaida")} maxLength={5} /></div>
            <div><HiClock style={{marginRight:4}}/><input style={styleInput} type="text" placeholder="Hora retorno (HH:MM)" value={trip.horaRetorno} onChange={e=>handleHoraChange(e,i,"horaRetorno")} maxLength={5} /></div>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:15}}>
            <div>
              <HiOutlineTruck style={{marginRight:4}}/>
              <select
                style={styleInput}
                value={trip.veiculo.tipo}
                onChange={e=>updateTrip(i,{ veiculo: { ...trip.veiculo, tipo:e.target.value } })}
              >
                <option value="Oficial">Oficial</option>
                <option value="Particular">Particular</option>
              </select>
            </div>
            <div>
              <HiOutlineTruck style={{marginRight:4}}/>
              <input
                style={styleInput}
                placeholder="Placa do veículo"
                value={trip.veiculo.placa}
                onChange={e=>updateTrip(i,{ veiculo: { ...trip.veiculo, placa:e.target.value } })}
              />
            </div>
          </div>

          <textarea
            style={{...styleInput,minHeight:100,resize:"vertical"}}
            placeholder="Justificativa (o que, por que, para onde e quantas pessoas)"
            value={trip.justificativa}
            onChange={e=>updateTrip(i,{justificativa:e.target.value})}
          />

          <div style={{marginTop:10,fontWeight:"bold",lineHeight:1.6}}>
            Distância máx.: {trip.distanciaKm.toFixed(2)} km<br/>
            Diárias (&gt;8h): {trip.tipoDiariaResumo.qtdAcima8} × R$ {trip.tipoDiariaResumo.valorAcima8?.toFixed?.(2) || "0.00"}<br/>
            Diárias (4–8h): {trip.tipoDiariaResumo.qtd4a8} × R$ {trip.tipoDiariaResumo.valor4a8?.toFixed?.(2) || "0.00"}<br/>
            <span>Subtotal Diárias: R$ {trip.totalDiaria.toFixed(2)}</span><br/>
            <span>Pernoite: R$ {trip.totalPernoite.toFixed(2)}</span><br/>
            <span>Total Viagem: R$ {(trip.totalDiaria + trip.totalPernoite).toFixed(2)}</span><br/>
            <span>Tipos: {Array.isArray(trip.tiposDetalhados) ? trip.tiposDetalhados.join(", ") : "-"}</span>
          </div>
        </div>
      ))}

      <button type="button" onClick={addViagem} style={{...styleButton,marginTop:10}}><HiPlus/> Adicionar Viagem</button>

      <h3 style={{marginTop:15}}>Total Geral: R$ {totalGeral.toFixed(2)}</h3>

      <button type="button" onClick={handleGerarPDF} style={{...styleButton,marginTop:12}}>Gerar PDF</button>
    </div>
  );
}
