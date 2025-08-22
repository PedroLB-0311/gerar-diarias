'use client';

import { useState, useEffect } from "react";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

export default function DiariaPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    servidor: "",
    cpf: "",
    cargo: "",
    matricula: "",
    grupo: "",
    trips: [{
      destino: "",
      distancia: "",
      saida: "",
      horaSaida: "",
      retorno: "",
      horaRetorno: "",
      diaria04_08: false,
      diariaAcima08: false,
      outroEstado: false,
      comPernoite: false,
      transporte: "",
      placa: "",
      diaria: "",
      pernoite: "",
      justificativa: "",
    }],
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        pdfMake.vfs = pdfFonts.vfs;
        setIsLoading(false);
      } catch (err) {
        console.error("Erro ao configurar pdfMake:", err);
      }
    }
  }, []);

  const handleChange = (e, tripIndex, field) => {
    if (tripIndex !== undefined) {
      const updatedTrips = [...form.trips];
      updatedTrips[tripIndex] = { ...updatedTrips[tripIndex], [field]: e.target.value ?? e.target.checked ?? e.target.value };
      setForm({ ...form, trips: updatedTrips });
      if (errors[`trip_${tripIndex}_${field}`]) {
        setErrors({ ...errors, [`trip_${tripIndex}_${field}`]: null });
      }
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
      if (errors[e.target.name]) {
        setErrors({ ...errors, [e.target.name]: null });
      }
    }
  };

  const addTrip = () => {
    setForm({
      ...form,
      trips: [...form.trips, {
        destino: "",
        distancia: "",
        saida: "",
        horaSaida: "",
        retorno: "",
        horaRetorno: "",
        diaria04_08: false,
        diariaAcima08: false,
        outroEstado: false,
        comPernoite: false,
        transporte: "",
        placa: "",
        diaria: "",
        pernoite: "",
        justificativa: "",
      }]
    });
  };

  const calculateNights = (saida, retorno) => {
    if (!saida || !retorno) return 0;
    const startDate = new Date(saida);
    const endDate = new Date(retorno);
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.servidor) newErrors.servidor = "Campo obrigatório";
    if (!form.cpf) newErrors.cpf = "Campo obrigatório";
    if (!form.cargo) newErrors.cargo = "Campo obrigatório";
    if (!form.matricula) newErrors.matricula = "Campo obrigatório";
    if (!form.grupo) newErrors.grupo = "Selecione o grupo de diária";

    form.trips.forEach((trip, index) => {
      if (!trip.destino) newErrors[`trip_${index}_destino`] = "Campo obrigatório";
      if (!trip.distancia) newErrors[`trip_${index}_distancia`] = "Selecione a distância";
      if (!trip.saida) newErrors[`trip_${index}_saida`] = "Campo obrigatório";
      if (!trip.horaSaida) newErrors[`trip_${index}_horaSaida`] = "Campo obrigatório";
      if (!trip.retorno) newErrors[`trip_${index}_retorno`] = "Campo obrigatório";
      if (!trip.horaRetorno) newErrors[`trip_${index}_horaRetorno`] = "Campo obrigatório";
      if (!trip.transporte) newErrors[`trip_${index}_transporte`] = "Selecione o transporte";
      if (!trip.placa) newErrors[`trip_${index}_placa`] = "Campo obrigatório";
      if (!trip.diaria) newErrors[`trip_${index}_diaria`] = "Campo obrigatório";
      if (!trip.justificativa) newErrors[`trip_${index}_justificativa`] = "Campo obrigatório";
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const gerarPDF = () => {
    if (!pdfMake || isLoading) return;
    if (!validateForm()) return;

    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, "0");
    const mes = hoje.toLocaleString("pt-BR", { month: "long" });
    const ano = hoje.getFullYear();

    const content = [
      { text: "PROPOSTA DE CONCESSÃO E PAGAMENTO DE DIÁRIA", style: "header", alignment: "center" },
      { text: "Nos Termos do Decreto n. 56/2025", style: "subheader", alignment: "center", margin: [0, 0, 0, 20] },
      { text: "A) IDENTIFICAÇÃO DO SERVIDOR", style: "section" },
      { text: `Servidor: ${form.servidor}   Cargo: ${form.cargo}`, margin: [0, 5, 0, 0] },
      { text: `Matrícula: ${form.matricula}   Grupo de Diária: ${form.grupo}`, margin: [0, 5, 0, 10] }
    ];

    form.trips.forEach((trip, i) => {
      const diaria = parseFloat(trip.diaria) || 0;
      const pernoitePorNoite = parseFloat(trip.pernoite) || 0;
      const noites = calculateNights(trip.saida, trip.retorno);
      const totalPernoite = pernoitePorNoite * noites;
      const valorTotal = diaria + totalPernoite;

      content.push(
        { text: `B) DESTINO E PERÍODO DE AFASTAMENTO - Viagem ${i + 1}`, style: "section" },
        { text: `Destino: ${trip.destino}    Distância: ${trip.distancia}`, margin: [0, 5, 0, 0] },
        { text: `Data: ${trip.saida}   Hora de Saída: ${trip.horaSaida}   Retorno: ${trip.retorno} ${trip.horaRetorno}`, margin: [0, 5, 0, 10] },

        { text: "C) DIÁRIA E PERNOITE", style: "section" },
        { text: `( ) Entre 04 e 08 horas     ( ) Acima de 08 horas\n( ) Outro Estado – Afastamento acima de 08 horas\n( ) Com pernoite`, margin: [0, 5, 0, 10] },

        { text: "D) TRANSPORTE", style: "section" },
        { text: `${trip.transporte}    Placa: ${trip.placa}`, margin: [0, 5, 0, 10] },

        { text: "E) TOTALIZADORES", style: "section" },
        { text: `Diária: R$ ${diaria.toFixed(2)}   Pernoite: R$ ${totalPernoite.toFixed(2)}   Valor Total: R$ ${valorTotal.toFixed(2)}`, margin: [0, 5, 0, 10] },

        { text: "F) JUSTIFICATIVA DO DESLOCAMENTO", style: "section" },
        { text: trip.justificativa, margin: [0, 5, 0, 20] }
      );
    });

    content.push(
      { text: "________________________________________", alignment: "center" },
      { text: `${form.servidor} – CPF: ${form.cpf}`, alignment: "center", margin: [0, 0, 0, 20] },
      { text: "G) AUTORIZAÇÃO", style: "section" },
      { text: "Autorizo o servidor requerente a afastar-se da sede do município, cumprir os objetivos da missão e perceber as diárias aqui especificadas.", margin: [0, 5, 0, 40] },
      { text: "________________________________________", alignment: "center" },
      { text: "Secretário(a) de __________________________", alignment: "center" },
      { text: "Nome do Secretário(a)", alignment: "center", margin: [0, 0, 0, 20] },
      { text: `São Ludgero-SC, ${dia} de ${mes} de ${ano}`, alignment: "right", margin: [0, 20, 0, 20] },
      { text: "Administração Municipal\nCentro Administrativo Municipal\nAv. Monsenhor Frederico Tombrock, 1.300\n(48) 3657-8800", alignment: "center", fontSize: 9 }
    );

    pdfMake.createPdf({
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      content,
      styles: {
        header: { fontSize: 14, bold: true },
        subheader: { fontSize: 11, italics: true },
        section: { fontSize: 11, bold: true, margin: [0, 10, 0, 5] },
      },
      defaultStyle: { fontSize: 10 }
    }).download("diaria_modelo_oficial.pdf");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 600, background: "#f0fdf4", padding: 20, borderRadius: 10 }}>
        <h2 style={{ textAlign: "center", color: "#065f46", marginBottom: 20 }}>Formulário de Diária</h2>

        <input
          placeholder="Nome do Servidor"
          name="servidor"
          value={form.servidor}
          onChange={handleChange}
          style={{ width: "100%", marginBottom: 8, padding: 6, borderRadius: 5 }}
        />
        {errors.servidor && <p style={{ color: "red" }}>{errors.servidor}</p>}

        <input
          placeholder="CPF"
          name="cpf"
          value={form.cpf}
          onChange={handleChange}
          style={{ width: "100%", marginBottom: 8, padding: 6, borderRadius: 5 }}
        />
        {errors.cpf && <p style={{ color: "red" }}>{errors.cpf}</p>}

        <input
          placeholder="Cargo"
          name="cargo"
          value={form.cargo}
          onChange={handleChange}
          style={{ width: "100%", marginBottom: 8, padding: 6, borderRadius: 5 }}
        />
        {errors.cargo && <p style={{ color: "red" }}>{errors.cargo}</p>}

        <input
          placeholder="Matrícula"
          name="matricula"
          value={form.matricula}
          onChange={handleChange}
          style={{ width: "100%", marginBottom: 8, padding: 6, borderRadius: 5 }}
        />
        {errors.matricula && <p style={{ color: "red" }}>{errors.matricula}</p>}

        <select
          name="grupo"
          value={form.grupo}
          onChange={handleChange}
          style={{ width: "100%", marginBottom: 15, padding: 6, borderRadius: 5 }}
        >
          <option value="">Selecione o grupo de diária</option>
          <option value="A">Grupo A</option>
          <option value="B">Grupo B</option>
          <option value="C">Grupo C</option>
        </select>
        {errors.grupo && <p style={{ color: "red" }}>{errors.grupo}</p>}

        {form.trips.map((trip, index) => (
          <div key={index} style={{ width: "100%", marginBottom: 15, borderTop: index > 0 ? "1px solid #ccc" : "none", paddingTop: index > 0 ? 10 : 0 }}>
            <h3 style={{ textAlign: "center", color: "#065f46" }}>Viagem {index + 1}</h3>

            <input
              placeholder="Destino"
              value={trip.destino}
              onChange={(e) => handleChange(e, index, "destino")}
              style={{ width: "100%", marginBottom: 8, padding: 6, borderRadius: 5 }}
            />
            {errors[`trip_${index}_destino`] && <p style={{ color: "red" }}>{errors[`trip_${index}_destino`]}</p>}

            <select
              value={trip.distancia}
              onChange={(e) => handleChange(e, index, "distancia")}
              style={{ width: "100%", marginBottom: 8, padding: 6, borderRadius: 5 }}
            >
              <option value="">Selecione a distância</option>
              <option value="Inferior a 200 km">Inferior a 200 km</option>
              <option value="Acima de 200 km">Acima de 200 km</option>
            </select>
            {errors[`trip_${index}_distancia`] && <p style={{ color: "red" }}>{errors[`trip_${index}_distancia`]}</p>}

            <div style={{ marginBottom: 8 }}>
              <label>Data de Saída</label>
              <input
                type="date"
                value={trip.saida}
                onChange={(e) => handleChange(e, index, "saida")}
                style={{ width: "100%", marginBottom: 5, padding: 6, borderRadius: 5 }}
              />
              <label>Hora de Saída</label>
              <input
                type="time"
                value={trip.horaSaida}
                onChange={(e) => handleChange(e, index, "horaSaida")}
                style={{ width: "100%", marginBottom: 8, padding: 6, borderRadius: 5 }}
              />
              {errors[`trip_${index}_saida`] && <p style={{ color: "red" }}>{errors[`trip_${index}_saida`]}</p>}
              {errors[`trip_${index}_horaSaida`] && <p style={{ color: "red" }}>{errors[`trip_${index}_horaSaida`]}</p>}
            </div>

            <div style={{ marginBottom: 8 }}>
              <label>Data de Retorno</label>
              <input
                type="date"
                value={trip.retorno}
                onChange={(e) => handleChange(e, index, "retorno")}
                style={{ width: "100%", marginBottom: 5, padding: 6, borderRadius: 5 }}
              />
              <label>Hora de Retorno</label>
              <input
                type="time"
                value={trip.horaRetorno}
                onChange={(e) => handleChange(e, index, "horaRetorno")}
                style={{ width: "100%", marginBottom: 8, padding: 6, borderRadius: 5 }}
              />
              {errors[`trip_${index}_retorno`] && <p style={{ color: "red" }}>{errors[`trip_${index}_retorno`]}</p>}
              {errors[`trip_${index}_horaRetorno`] && <p style={{ color: "red" }}>{errors[`trip_${index}_horaRetorno`]}</p>}
            </div>

            <div style={{ width: "100%", marginBottom: 8, textAlign: "left" }}>
              <label style={{ display: "block", marginBottom: 2 }}>
                <input
                  type="checkbox"
                  checked={trip.diaria04_08 || false}
                  onChange={(e) => handleChange({ target: { value: e.target.checked } }, index, "diaria04_08")}
                />
                {" "}Entre 04 e 08 horas
              </label>
              <label style={{ display: "block", marginBottom: 2 }}>
                <input
                  type="checkbox"
                  checked={trip.diariaAcima08 || false}
                  onChange={(e) => handleChange({ target: { value: e.target.checked } }, index, "diariaAcima08")}
                />
                {" "}Acima de 08 horas
              </label>
              <label style={{ display: "block", marginBottom: 2 }}>
                <input
                  type="checkbox"
                  checked={trip.outroEstado || false}
                  onChange={(e) => handleChange({ target: { value: e.target.checked } }, index, "outroEstado")}
                />
                {" "}Outro Estado – Afastamento acima de 08 horas
              </label>
              <label style={{ display: "block", marginBottom: 2 }}>
                <input
                  type="checkbox"
                  checked={trip.comPernoite || false}
                  onChange={(e) => handleChange({ target: { value: e.target.checked } }, index, "comPernoite")}
                />
                {" "}Com pernoite
              </label>
            </div>

            <select
  value={trip.transporte}
  onChange={(e) => handleChange(e, index, "transporte")}
  style={{ width: "100%", marginBottom: 8, padding: 6, borderRadius: 5 }}
>
  <option value="">Selecione o Transporte</option>
  <option value="Veículo Oficial">Veículo Oficial</option>
  <option value="Veículo Particular">Veículo Particular</option>
</select>
{errors[`trip_${index}_transporte`] && <p style={{ color: "red" }}>{errors[`trip_${index}_transporte`]}</p>}


            <input
              placeholder="Placa do Veículo"
              value={trip.placa}
              onChange={(e) => handleChange(e, index, "placa")}
              style={{ width: "100%", marginBottom: 8, padding: 6, borderRadius: 5 }}
            />
            {errors[`trip_${index}_placa`] && <p style={{ color: "red" }}>{errors[`trip_${index}_placa`]}</p>}

            <input
              placeholder="Valor da Diária (R$)"
              type="number"
              value={trip.diaria}
              onChange={(e) => handleChange(e, index, "diaria")}
              style={{ width: "100%", marginBottom: 8, padding: 6, borderRadius: 5 }}
            />
            {errors[`trip_${index}_diaria`] && <p style={{ color: "red" }}>{errors[`trip_${index}_diaria`]}</p>}

            <input
              placeholder="Valor do Pernoite por Noite (R$)"
              type="number"
              value={trip.pernoite}
              onChange={(e) => handleChange(e, index, "pernoite")}
              style={{ width: "100%", marginBottom: 8, padding: 6, borderRadius: 5 }}
            />

            <textarea
              placeholder="Justificativa do Deslocamento"
              value={trip.justificativa}
              onChange={(e) => handleChange(e, index, "justificativa")}
              style={{ width: "100%", height: 60, padding: 6, borderRadius: 5 }}
            />
            {errors[`trip_${index}_justificativa`] && <p style={{ color: "red" }}>{errors[`trip_${index}_justificativa`]}</p>}
          </div>
        ))}

        <button onClick={addTrip} style={{ width: "100%", padding: 10, borderRadius: 5, backgroundColor: "#10b981", color: "white", marginBottom: 15 }}>Adicionar Viagem</button>
        <button onClick={gerarPDF} style={{ width: "100%", padding: 10, borderRadius: 5, backgroundColor: "#065f46", color: "white" }}>Gerar PDF</button>
      </div>
    </div>
  );
}
