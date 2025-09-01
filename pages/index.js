"use client";
import { useState, useEffect } from "react";
import { gerarPDF } from "../utils/Gerar.pdf";
import { HiUser, HiIdentification, HiClipboardList, HiCalendar, HiClock, HiLocationMarker, HiOutlineTruck, HiPlus } from "react-icons/hi";

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

// UF map
const ufMap = { 12:"AC",13:"AL",14:"AP",15:"AM",16:"BA",17:"CE",21:"MA",22:"MT",23:"MS",26:"PA",27:"PB",28:"PR",29:"PE",31:"PI",32:"RJ",33:"RN",35:"SP",41:"RO",42:"SC",43:"RS",50:"MS",51:"MT",52:"GO",53:"DF" };
const origem = { nome: "São Ludgero", uf: "SC", latitude: -28.3247, longitude: -49.1806 };

export default function FormularioDiarias() {
  const [municipios, setMunicipios] = useState([]);
  const [sugestoes, setSugestoes] = useState([]);
  const [focusedDestino, setFocusedDestino] = useState({ iViagem: null, iDestino: null });
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const [form, setForm] = useState({
    servidor:"", cargo:"", matricula:"", grupo:"A", secretaria:"", secretario:"",
    trips:[{ destinos:[{nome:"",latitude:null,longitude:null,uf:"SC"}], saida:"", horaSaida:"", retorno:"", horaRetorno:"", totalDiaria:0, totalPernoite:0, distanciaKm:0, justificativa:"", veiculo:{tipo:"Oficial",placa:""} }]
  });

  // Carregar municípios
  useEffect(() => {
    fetch("https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/municipios.json")
      .then(res => res.json())
      .then(data => {
        const normalizados = data.map(m => ({ nome: m.nome, uf: ufMap[m.codigo_uf]||"SC", latitude: parseFloat(m.latitude), longitude: parseFloat(m.longitude) }));
        setMunicipios(normalizados);
      }).catch(err => console.error(err));
  }, []);

  // Autocomplete
  const handleDestinoChange = (e,iViagem,iDestino) => {
    const valor = e.target.value;
    setForm(prev => { const trips=[...prev.trips]; trips[iViagem].destinos[iDestino].nome=valor; return {...prev,trips}; });
    if(valor.length>1){
      const filtrados = municipios.filter(m => m.nome.toLowerCase().startsWith(valor.toLowerCase()));
      const sc = filtrados.filter(m=>m.uf==="SC");
      const outros = filtrados.filter(m=>m.uf!=="SC");
      setSugestoes([...sc,...outros].slice(0,10));
      setFocusedDestino({iViagem,iDestino});
      setHighlightedIndex(0);
    } else setSugestoes([]);
  };
  const selecionarDestino = (destino) => {
    setForm(prev => { const trips=[...prev.trips]; trips[focusedDestino.iViagem].destinos[focusedDestino.iDestino]=destino; return {...prev,trips}; });
    setSugestoes([]);
  };
  const handleDestinoKeyDown = (e) => {
    if(!sugestoes.length) return;
    if(e.key==="ArrowDown"){ e.preventDefault(); setHighlightedIndex(prev=>(prev+1)%sugestoes.length); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); setHighlightedIndex(prev=>(prev-1+sugestoes.length)%sugestoes.length); }
    else if(e.key==="Enter"){ e.preventDefault(); selecionarDestino(sugestoes[highlightedIndex]); }
  };

  // Hora
  const formatarHorario = (v) => { let n=v.replace(/\D/g,''); if(n.length>4)n=n.slice(0,4); return n.length>=3?n.slice(0,2)+":"+n.slice(2):n; };
  const handleHoraChange = (e,iViagem,field) => { const v=formatarHorario(e.target.value); setForm(prev=>{ const trips=[...prev.trips]; trips[iViagem][field]=v; return {...prev,trips}; }); };

  const isFinalSemana = (dateStr)=>{ const d=new Date(dateStr).getDay(); return d===0||d===6; };

  const calcularDiarias = (tripsParam=form.trips)=>{
    const grupo = form.grupo==="B"?"B":"A";
    return tripsParam.map(trip=>{
      let totalDiaria=0,totalPernoite=0,distanciaKm=0;
      trip.destinos.forEach(d=>{ if(d.latitude&&d.longitude){ const dist=calcularDistancia(origem.latitude,origem.longitude,d.latitude,d.longitude); if(dist>distanciaKm) distanciaKm=dist; } });
      const dias = trip.saida&&trip.retorno? Math.ceil((new Date(trip.retorno)-new Date(trip.saida))/(1000*60*60*24))+1:0;
      for(let i=0;i<dias;i++){ const dataAtual=new Date(trip.saida); dataAtual.setDate(dataAtual.getDate()+i); let diariaDia=trip.destinos.some(d=>d.uf!=="SC")?(grupo==="A"?200:160):(distanciaKm>200?(grupo==="A"?135:110):(grupo==="A"?80:60)); if(isFinalSemana(dataAtual)) diariaDia*=2; totalDiaria+=diariaDia; }
      const comPernoite=dias>1;
      totalPernoite=comPernoite? (trip.destinos.some(d=>d.uf!=="SC")?(grupo==="A"?1280:950):(grupo==="A"?400:320)):0;
      return {...trip,totalDiaria,totalPernoite,distanciaKm,comPernoite};
    });
  };
  useEffect(()=>{ setForm(prev=>({...prev,trips:calcularDiarias(prev.trips)})); },[form.trips,form.grupo]);

  // Adicionar viagens/destinos
  const addViagem = ()=>setForm(prev=>({...prev,trips:[...prev.trips,{destinos:[{nome:"",latitude:null,longitude:null,uf:"SC"}],saida:"",horaSaida:"",retorno:"",horaRetorno:"",totalDiaria:0,totalPernoite:0,distanciaKm:0,justificativa:"",veiculo:{tipo:"Oficial",placa:""}}]}));
  const addDestino = (iViagem)=>setForm(prev=>{ const trips=[...prev.trips]; trips[iViagem].destinos.push({nome:"",latitude:null,longitude:null,uf:"SC"}); return {...prev,trips}; });

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
      for(let j=0;j<t.destinos.length;j++){ if(!t.destinos[j].nome.trim()){alert(`Preencha o destino ${j+1} da viagem ${i+1}`); return false; } }
    }
    return true;
  };

  // Gerar PDF consolidando todas as viagens
  const handleGerarPDF = ()=>{
    if(!validarFormulario()) return;
    const dadosConsolidados = {
      servidor: form.servidor,
      cargo: form.cargo,
      matricula: form.matricula,
      secretaria: form.secretaria,
      secretario: form.secretario,
      grupo: form.grupo,
      viagens: form.trips.map(t=>({
        destinos:t.destinos,
        saida:t.saida,
        horaSaida:t.horaSaida,
        retorno:t.retorno,
        horaRetorno:t.horaRetorno,
        veiculo:t.veiculo,
        justificativa:t.justificativa,
        totalDiaria:t.totalDiaria,
        totalPernoite:t.totalPernoite,
        distanciaKm:t.distanciaKm
      }))
    };
    setTimeout(()=>gerarPDF(dadosConsolidados),50);
  };

  // Estilos
  const styleContainer={maxWidth:"950px",margin:"25px auto",padding:"30px",background:"#f5fff5",borderRadius:"15px",boxShadow:"0 6px 20px rgba(0,0,0,0.1)"};
  const styleCard={background:"#fff",borderRadius:"12px",padding:"20px",marginBottom:"18px",boxShadow:"0 3px 12px rgba(0,0,0,0.08)"};
  const styleInput={padding:"12px",margin:"6px 0",border:"1px solid #b8e0b8",borderRadius:"8px",width:"100%",fontSize:"15px",boxSizing:"border-box"};
  const styleGrid2={display:"grid",gridTemplateColumns:"1fr 1fr",gap:"15px"};
  const styleGrid4={display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"12px",marginTop:"12px"};
  const styleButton={padding:"10px 18px",border:"none",borderRadius:"8px",background:"linear-gradient(90deg,#3aa14f,#2f7a38)",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:"5px"};
  const totalGeral = form.trips.reduce((acc,t)=>acc+t.totalDiaria+t.totalPernoite,0);

  return (
    <div style={styleContainer}>
      <h1 style={{textAlign:"center",marginBottom:"25px",color:"#2f7a38"}}>Proposta de Diárias</h1>

      {/* Dados servidor */}
      <div style={styleGrid2}>
        <div><HiUser style={{marginRight:"6px"}}/><input style={styleInput} placeholder="Servidor" value={form.servidor} onChange={e=>setForm({...form,servidor:e.target.value})}/></div>
        <div><HiIdentification style={{marginRight:"6px"}}/><input style={styleInput} placeholder="Cargo" value={form.cargo} onChange={e=>setForm({...form,cargo:e.target.value})}/></div>
        <div><HiClipboardList style={{marginRight:"6px"}}/><input style={styleInput} placeholder="Matrícula" value={form.matricula} onChange={e=>setForm({...form,matricula:e.target.value})}/></div>
        <div><HiClipboardList style={{marginRight:"6px"}}/><input style={styleInput} placeholder="Secretaria" value={form.secretaria} onChange={e=>setForm({...form,secretaria:e.target.value})}/></div>
      </div>

      <div style={styleGrid2}>
        <div><HiClipboardList style={{marginRight:"6px"}}/><input style={styleInput} placeholder="Secretário" value={form.secretario} onChange={e=>setForm({...form,secretario:e.target.value})}/></div>
        <div><HiClipboardList style={{marginRight:"6px"}}/><select style={styleInput} value={form.grupo} onChange={e=>setForm({...form,grupo:e.target.value})}><option value="A">Grupo A</option><option value="B">Grupo B</option></select></div>
      </div>

      <h2 style={{color:"#2f7a38",marginTop:"25px"}}>Viagens</h2>

      {form.trips.map((trip,i)=>(
        <div key={i} style={styleCard}>
          <h3>Viagem {i+1}</h3>

          {trip.destinos.map((dest,j)=>(
            <div key={j} style={{position:"relative"}}>
              <input style={styleInput} placeholder="Destino" value={dest.nome} onChange={e=>handleDestinoChange(e,i,j)} onFocus={()=>setFocusedDestino({iViagem:i,iDestino:j})} onKeyDown={handleDestinoKeyDown}/>
              {focusedDestino.iViagem===i && focusedDestino.iDestino===j && sugestoes.length>0 && (
                <ul style={{border:"1px solid #b8e0b8",background:"#fff",maxHeight:"130px",overflowY:"auto",position:"absolute",zIndex:10,width:"100%",margin:0,padding:0,listStyle:"none"}}>
                  {sugestoes.map((m,k)=>(
                    <li key={k} style={{padding:"6px",cursor:"pointer",background:k===highlightedIndex?"#e0f0e0":"#fff"}} onMouseDown={()=>selecionarDestino(m)} onMouseEnter={()=>setHighlightedIndex(k)}>
                      {m.nome} / {m.uf}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <button type="button" onClick={()=>addDestino(i)} style={styleButton}><HiPlus/> Adicionar Destino</button>

          <div style={styleGrid4}>
            <div><HiCalendar style={{marginRight:"4px"}}/><input style={styleInput} type="date" value={trip.saida} onChange={e=>{const t=[...form.trips]; t[i].saida=e.target.value; setForm({...form,trips:t})}}/></div>
            <div><HiCalendar style={{marginRight:"4px"}}/><input style={styleInput} type="date" value={trip.retorno} onChange={e=>{const t=[...form.trips]; t[i].retorno=e.target.value; setForm({...form,trips:t})}}/></div>
            <div><HiClock style={{marginRight:"4px"}}/><input style={styleInput} type="text" placeholder="Hora saída (HH:MM)" value={trip.horaSaida} onChange={e=>handleHoraChange(e,i,"horaSaida")} maxLength={5}/></div>
            <div><HiClock style={{marginRight:"4px"}}/><input style={styleInput} type="text" placeholder="Hora retorno (HH:MM)" value={trip.horaRetorno} onChange={e=>handleHoraChange(e,i,"horaRetorno")} maxLength={5}/></div>
          </div>

          <div style={styleGrid2}>
            <div><HiOutlineTruck style={{marginRight:"4px"}}/><select style={styleInput} value={trip.veiculo.tipo} onChange={e=>{const t=[...form.trips];t[i].veiculo.tipo=e.target.value; setForm({...form,trips:t})}}><option value="Oficial">Oficial</option><option value="Particular">Particular</option></select></div>
            <div><HiOutlineTruck style={{marginRight:"4px"}}/><input style={styleInput} placeholder="Placa do veículo" value={trip.veiculo.placa} onChange={e=>{const t=[...form.trips];t[i].veiculo.placa=e.target.value; setForm({...form,trips:t})}}/></div>
          </div>

          <textarea style={{...styleInput,minHeight:"100px",resize:"vertical"}} placeholder="Justificativa" value={trip.justificativa} onChange={e=>{const t=[...form.trips];t[i].justificativa=e.target.value; setForm({...form,trips:t})}}/>

          <div style={{marginTop:"10px",fontWeight:"bold"}}>
            Distância: {trip.distanciaKm.toFixed(2)} km <br/>
            Diária: R$ {trip.totalDiaria.toFixed(2)} <br/>
            Pernoite: R$ {trip.totalPernoite.toFixed(2)} <br/>
            Total Viagem: R$ {(trip.totalDiaria+trip.totalPernoite).toFixed(2)}
          </div>
        </div>
      ))}

      <button type="button" onClick={addViagem} style={{...styleButton,marginTop:"10px"}}><HiPlus/> Adicionar Viagem</button>
      <h3 style={{marginTop:"15px"}}>Total Geral: R$ {totalGeral.toFixed(2)}</h3>
      <button type="button" onClick={handleGerarPDF} style={{...styleButton,marginTop:"12px"}}>Gerar PDF</button>
    </div>
  );
}
