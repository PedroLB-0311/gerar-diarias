"use client";
import { useState, useEffect } from "react";
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

// Mapeamento IBGE -> UF
const ufMap = {
  12: "AC", 13: "AL", 14: "AP", 15: "AM", 16: "BA",
  17: "CE", 21: "MA", 22: "MT", 23: "MS", 26: "PA",
  27: "PB", 28: "PR", 29: "PE", 31: "PI", 32: "RJ",
  33: "RN", 35: "SP", 41: "RO", 42: "SC", 43: "RS",
  50: "MS", 51: "MT", 52: "GO", 53: "DF"
};

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
    secretaria: "",
    secretario: "",
    trips: [
      {
        destinos: [{ nome: "", latitude: null, longitude: null, uf: "SC" }],
        saida: "",
        horaSaida: "",
        retorno: "",
        horaRetorno: "",
        totalDiaria: 0,
        totalPernoite: 0,
        distanciaKm: 0,
        justificativa: "",
        veiculo: { tipo: "Oficial", placa: "" },
      },
    ],
  });

  // Carregar municípios
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
        console.log("Municipios carregados:", normalizados.slice(0, 10));
        setMunicipios(normalizados);
      })
      .catch(err => console.error("Erro ao carregar municípios:", err));
  }, []);

  // Autocomplete
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
    } else setSugestoes([]);
  };

  const selecionarDestino = (destino) => {
    setForm(prev => {
      const trips = [...prev.trips];
      trips[focusedDestino.iViagem].destinos[focusedDestino.iDestino] = {
        nome: destino.nome,
        latitude: destino.latitude,
        longitude: destino.longitude,
        uf: destino.uf
      };
      return { ...prev, trips };
    });
    setSugestoes([]);
  };

  const handleDestinoKeyDown = (e) => {
    if (!sugestoes.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightedIndex(prev => (prev+1)%sugestoes.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightedIndex(prev => (prev-1+sugestoes.length)%sugestoes.length); }
    else if (e.key === "Enter") { e.preventDefault(); selecionarDestino(sugestoes[highlightedIndex]); }
  };

  // Horário
  const formatarHorario = (valor) => {
    let numeros = valor.replace(/\D/g,'');
    if (numeros.length>4) numeros = numeros.slice(0,4);
    if (numeros.length>=3) return numeros.slice(0,2)+":"+numeros.slice(2);
    return numeros;
  };
  const handleHoraChange = (e,iViagem,field) => {
    const valor = formatarHorario(e.target.value);
    setForm(prev => {
      const trips = [...prev.trips];
      trips[iViagem][field] = valor;
      return {...prev,trips};
    });
  };

  const isFinalSemana = (dateStr) => {
    const dia = new Date(dateStr).getDay();
    return dia===0||dia===6;
  };

  // Calcular diárias
  const calcularDiarias = (tripsParam = form.trips) => {
    const grupo = form.grupo==="B" ? "B" : "A";
    return tripsParam.map(trip => {
      let totalDiaria = 0, totalPernoite = 0, distanciaKm = 0;
      trip.destinos.forEach(d => {
        if(d.latitude && d.longitude){
          const dist = calcularDistancia(origem.latitude, origem.longitude, d.latitude, d.longitude);
          if(dist > distanciaKm) distanciaKm = dist;
        }
      });
      const dias = trip.saida && trip.retorno ? Math.ceil((new Date(trip.retorno)-new Date(trip.saida))/(1000*60*60*24))+1 : 0;
      let diaria04_08=false, diariaAcima08=false, outroEstado=false, comPernoite=false;
  
      for(let i=0;i<dias;i++){
        const dataAtual = new Date(trip.saida);
        dataAtual.setDate(dataAtual.getDate()+i);
        const isOutroEstadoDia = trip.destinos.some(d => d.uf !== "SC");
        const isCapital = trip.destinos.some(d => d.nome === "Florianópolis");
  
        let diariaDia = 0;
        if(isOutroEstadoDia){
          diariaDia = grupo==="A"?200:160;
          outroEstado=true;
        } else {
          diariaDia = (distanciaKm>200? (grupo==="A"?135:110):(grupo==="A"?80:60));
        }
  
        if(dias>0 && diariaDia>=4 && diariaDia<=8) diaria04_08=true;
        if(diariaDia>8) diariaAcima08=true;
  
        if(isFinalSemana(dataAtual)) diariaDia*=2;
        totalDiaria+=diariaDia;
      }
  
      comPernoite = dias>1;
      totalPernoite = comPernoite ? (trip.destinos.some(d => d.uf !== "SC") ? (grupo==="A"?1280:950) : (grupo==="A"?400:320)) : 0;
  
      return {
        ...trip,
        totalDiaria,
        totalPernoite,
        distanciaKm,
        diaria04_08,
        diariaAcima08,
        outroEstado,
        comPernoite
      };
    });
  };
  

  useEffect(()=>{
    setForm(prev=>({...prev,trips:calcularDiarias(prev.trips)}));
  },[form.trips,form.grupo]);

  // Adicionar viagens/destinos
  const addViagem = ()=>setForm(prev=>({...prev,trips:[...prev.trips,{destinos:[{nome:"",latitude:null,longitude:null,uf:"SC"}],saida:"",horaSaida:"",retorno:"",horaRetorno:"",totalDiaria:0,totalPernoite:0,distanciaKm:0,justificativa:"",veiculo:{tipo:"Oficial",placa:""}}]}));
  const addDestino = (iViagem)=>setForm(prev=>{const trips=[...prev.trips];trips[iViagem].destinos.push({nome:"",latitude:null,longitude:null,uf:"SC"});return {...prev,trips};});

  // Validação
  const validarFormulario = ()=>{
    if(!form.servidor.trim()){alert("Preencha o servidor"); return false;}
    if(!form.cargo.trim()){alert("Preencha o cargo"); return false;}
    if(!form.matricula.trim()){alert("Preencha a matrícula"); return false;}
    if(!form.secretaria.trim()){alert("Preencha a secretaria"); return false;}
    if(!form.secretario.trim()){alert("Preencha o secretário"); return false;}
    for(let i=0;i<form.trips.length;i++){
      const t=form.trips[i];
      if(!t.saida){alert(`Preencha a data de saída da viagem ${i+1}`); return false;}
      if(!t.retorno){alert(`Preencha a data de retorno da viagem ${i+1}`); return false;}
      if(!t.horaSaida){alert(`Preencha a hora de saída da viagem ${i+1}`); return false;}
      if(!t.horaRetorno){alert(`Preencha a hora de retorno da viagem ${i+1}`); return false;}
      if(!t.justificativa.trim()){alert(`Preencha a justificativa da viagem ${i+1}`); return false;}
      if(!t.veiculo.placa.trim()){alert(`Preencha a placa do veículo da viagem ${i+1}`); return false;}
      for(let j=0;j<t.destinos.length;j++){
        if(!t.destinos[j].nome.trim()){alert(`Preencha o destino ${j+1} da viagem ${i+1}`); return false;}
      }
    }
    return true;
  };

  const handleGerarPDF = ()=>{
    if(!validarFormulario()) return;
    // Garantir que o form atualizado seja usado
    setTimeout(()=>gerarPDF(form),50);
  };

  const styleInput = {padding:"8px",margin:"6px 0",border:"1px solid #ccc",borderRadius:"4px",width:"100%",boxSizing:"border-box"};
  const totalGeral = form.trips.reduce((acc,t)=>acc+t.totalDiaria+t.totalPernoite,0);

  return (
    <div style={{maxWidth:"800px",margin:"0 auto",padding:"20px",background:"#f9f9f9",borderRadius:"10px"}}>
      <h1 style={{textAlign:"center",marginBottom:"20px"}}>Formulário de Proposta de Diárias</h1>
      <input style={styleInput} placeholder="Servidor" value={form.servidor} onChange={e=>setForm({...form,servidor:e.target.value})}/>
      <input style={styleInput} placeholder="Cargo" value={form.cargo} onChange={e=>setForm({...form,cargo:e.target.value})}/>
      <input style={styleInput} placeholder="Matrícula" value={form.matricula} onChange={e=>setForm({...form,matricula:e.target.value})}/>
      <input style={styleInput} placeholder="Secretaria" value={form.secretaria} onChange={e=>setForm({...form,secretaria:e.target.value})}/>
      <input style={styleInput} placeholder="Secretário" value={form.secretario} onChange={e=>setForm({...form,secretario:e.target.value})}/>
      <select style={styleInput} value={form.grupo} onChange={e=>setForm({...form,grupo:e.target.value})}><option value="A">Grupo A</option><option value="B">Grupo B</option></select>

      <h2>Viagens</h2>
      {form.trips.map((trip,i)=>(
        <div key={i} style={{border:"1px solid #ccc",padding:"15px",marginBottom:"15px",borderRadius:"8px",background:"#fff"}}>
          <h3>Viagem {i+1}</h3>
          {trip.destinos.map((dest,j)=>(
            <div key={j} style={{position:"relative"}}>
              <input style={styleInput} placeholder="Destino" value={dest.nome} onChange={e=>handleDestinoChange(e,i,j)} onFocus={()=>setFocusedDestino({iViagem:i,iDestino:j})} onKeyDown={handleDestinoKeyDown}/>
              {focusedDestino.iViagem===i && focusedDestino.iDestino===j && sugestoes.length>0 && (
                <ul style={{border:"1px solid #ccc",background:"#fff",maxHeight:"150px",overflowY:"auto",position:"absolute",zIndex:10,width:"100%",margin:0,padding:0,listStyle:"none"}}>
                  {sugestoes.map((m,k)=>(
                    <li key={k} style={{padding:"6px",cursor:"pointer",background:k===highlightedIndex?"#e0e0e0":"#fff"}} onMouseDown={()=>selecionarDestino(m)} onMouseEnter={()=>setHighlightedIndex(k)}>
                      {m.nome} / {m.uf}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <button type="button" onClick={()=>addDestino(i)} style={{margin:"5px 0",padding:"5px 10px",cursor:"pointer"}}>+ Adicionar Destino</button>

          <input style={styleInput} type="date" value={trip.saida} onChange={e=>{const t=[...form.trips];t[i].saida=e.target.value;setForm({...form,trips:t})}}/>
          <input style={styleInput} type="date" value={trip.retorno} onChange={e=>{const t=[...form.trips];t[i].retorno=e.target.value;setForm({...form,trips:t})}}/>
          <input style={styleInput} type="text" placeholder="Hora saída (HH:MM)" value={trip.horaSaida} onChange={e=>handleHoraChange(e,i,"horaSaida")} maxLength={5}/>
          <input style={styleInput} type="text" placeholder="Hora retorno (HH:MM)" value={trip.horaRetorno} onChange={e=>handleHoraChange(e,i,"horaRetorno")} maxLength={5}/>

          <select style={styleInput} value={trip.veiculo.tipo} onChange={e=>{const t=[...form.trips];t[i].veiculo.tipo=e.target.value;setForm({...form,trips:t})}}>
            <option value="Oficial">Oficial</option>
            <option value="Particular">Particular</option>
          </select>
          <input style={styleInput} placeholder="Placa do veículo" value={trip.veiculo.placa} onChange={e=>{const t=[...form.trips];t[i].veiculo.placa=e.target.value;setForm({...form,trips:t})}}/>

          <textarea style={{...styleInput,minHeight:"100px",resize:"vertical"}} placeholder="Justificativa" value={trip.justificativa} onChange={e=>{const t=[...form.trips];t[i].justificativa=e.target.value;setForm({...form,trips:t})}}/>

          <div style={{marginTop:"10px",fontWeight:"bold"}}>
            Distância: {trip.distanciaKm.toFixed(2)} km <br/>
            Diária: R$ {trip.totalDiaria.toFixed(2)} <br/>
            Pernoite: R$ {trip.totalPernoite.toFixed(2)} <br/>
            Total Viagem: R$ {(trip.totalDiaria+trip.totalPernoite).toFixed(2)}
          </div>
        </div>
      ))}
      <button type="button" onClick={addViagem} style={{margin:"10px 0",padding:"8px 15px",cursor:"pointer"}}>+ Adicionar Viagem</button>
      <h3>Total Geral: R$ {totalGeral.toFixed(2)}</h3>
      <button type="button" onClick={handleGerarPDF} style={{marginTop:"10px",padding:"10px 20px",background:"blue",color:"white",border:"none",borderRadius:"6px",cursor:"pointer"}}>Gerar PDF</button>
    </div>
  );
}
