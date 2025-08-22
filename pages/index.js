'use client';

import { useState, useEffect } from "react";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

export default function DiariaPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    servidor: "",
    cargo: "",
    matricula: "",
    trips: [{
      destino: "",
      saida: "",
      horaSaida: "",
      retorno: "",
      horaRetorno: "",
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

  const validatePlate = (plate) => {
    const hasLetters = /[a-zA-Z]/.test(plate);
    const hasNumbers = /[0-9]/.test(plate);
    return hasLetters && hasNumbers;
  };

  const calculateNights = (saida, retorno) => {
    if (!saida || !retorno) return 0;
    const startDate = new Date(saida);
    const endDate = new Date(retorno);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ["servidor", "cargo", "matricula"];
    
    requiredFields.forEach((field) => {
      if (!form[field]) {
        newErrors[field] = "Este campo é obrigatório";
      }
    });

    form.trips.forEach((trip, index) => {
      const tripRequiredFields = ["destino", "saida", "horaSaida", "retorno", "horaRetorno", "placa", "diaria", "justificativa"];
      tripRequiredFields.forEach((field) => {
        if (!trip[field]) {
          newErrors[`trip_${index}_${field}`] = "Este campo é obrigatório";
        }
      });

      if (trip.placa && !validatePlate(trip.placa)) {
        newErrors[`trip_${index}_placa`] = "A placa deve conter letras e números";
      }

      if (trip.saida && trip.retorno) {
        const startDate = new Date(trip.saida);
        const endDate = new Date(trip.retorno);
        if (endDate < startDate) {
          newErrors[`trip_${index}_retorno`] = "Data de retorno não pode ser anterior à data de saída";
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e, tripIndex, field) => {
    if (tripIndex !== undefined) {
      const updatedTrips = [...form.trips];
      updatedTrips[tripIndex] = { ...updatedTrips[tripIndex], [field]: e.target.value };
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
        saida: "",
        horaSaida: "",
        retorno: "",
        horaRetorno: "",
        placa: "",
        diaria: "",
        pernoite: "",
        justificativa: "",
      }],
    });
  };

  const gerarPDF = () => {
    if (!pdfMake || isLoading) return;
    if (!validateForm()) return;

    const content = [
      { text: "PROPOSTA DE CONCESSÃO E PAGAMENTO DE DIÁRIA", style: "header", alignment: "center" },
      { 
        text: `Servidor: ${form.servidor}   Cargo: ${form.cargo}\nMatrícula: ${form.matricula}`, 
        style: "content",
        margin: [0, 5, 0, 5]
      },
    ];

    let totalGeral = 0;
    form.trips.forEach((trip, index) => {
      const diaria = parseFloat(trip.diaria) || 0;
      const pernoitePerNight = parseFloat(trip.pernoite) || 0;
      const numberOfNights = calculateNights(trip.saida, trip.retorno);
      const totalPernoite = (pernoitePerNight * numberOfNights).toFixed(2);
      const totalTrip = (diaria + parseFloat(totalPernoite)).toFixed(2);
      totalGeral += parseFloat(totalTrip);

      content.push(
        { 
          text: `Viagem ${index + 1}:`, 
          style: "subheader",
          margin: [0, 10, 0, 5]
        },
        { 
          text: `Destino: ${trip.destino}\nSaída: ${trip.saida} ${trip.horaSaida}\nRetorno: ${trip.retorno} ${trip.horaRetorno}`, 
          style: "content",
          margin: [0, 5, 0, 5]
        },
        { 
          text: [
            `Diária: R$ ${diaria.toFixed(2)}`,
            numberOfNights > 0 && pernoitePerNight > 0 
              ? ` + Pernoite: R$ ${pernoitePerNight.toFixed(2)} x ${numberOfNights} noite(s) = R$ ${totalPernoite}` 
              : numberOfNights > 0 
                ? ` + Pernoite: R$ 0.00 (valor por noite não informado)` 
                : "",
            ` = Total: R$ ${totalTrip}`
          ], 
          style: "content",
          margin: [0, 5, 0, 5]
        },
        { text: `Placa: ${trip.placa}`, style: "content", margin: [0, 5, 0, 5] },
        { text: `Justificativa: ${trip.justificativa || "__________________"}`, style: "content", margin: [0, 5, 0, 5] }
      );
    });

    content.push(
      { text: `Total Geral: R$ ${totalGeral.toFixed(2)}`, style: "content", bold: true, margin: [0, 5, 0, 5] }
    );

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [20, 20, 20, 20],
      content,
      styles: {
        header: {
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 10]
        },
        subheader: {
          fontSize: 12,
          bold: true
        },
        content: {
          fontSize: 10,
          lineHeight: 1.2
        }
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10
      }
    };
    pdfMake.createPdf(docDefinition).download("diaria.pdf");
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(to bottom, #ecfdf5, #d1fae5)"
    }}>
      <div style={{
        background: "white",
        padding: "30px",
        borderRadius: "15px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "400px"
      }}>
        <h2 style={{ textAlign: "center", color: "#065f46", marginBottom: "15px", fontSize: "18px" }}>
          Formulário de Diárias - São Ludgero
        </h2>

        {[
          { label: "Nome do Servidor", name: "servidor", required: true },
          { label: "Cargo", name: "cargo", required: true },
          { label: "Matrícula", name: "matricula", required: true },
        ].map((field) => (
          <div key={field.name} style={{ marginBottom: "8px", width: "100%" }}>
            <label style={{ display: "block", textAlign: "center", marginBottom: "3px", fontSize: "14px" }}>
              {field.label}:
              {field.required && <span style={{ color: "red" }}> *</span>}
            </label>
            <input
              type={field.type || "text"}
              name={field.name}
              value={form[field.name]}
              onChange={(e) => handleChange(e)}
              required={field.required}
              style={{
                width: "100%",
                padding: "6px",
                borderRadius: "5px",
                border: `1px solid ${errors[field.name] ? "red" : "#10b981"}`,
                fontSize: "14px"
              }}
            />
            {errors[field.name] && (
              <div style={{ color: "red", fontSize: "10px", marginTop: "3px", textAlign: "center" }}>
                {errors[field.name]}
              </div>
            )}
          </div>
        ))}

        {form.trips.map((trip, index) => (
          <div key={index} style={{ width: "100%", marginBottom: "15px", borderTop: index > 0 ? "1px solid #ccc" : "none", paddingTop: index > 0 ? "10px" : "0" }}>
            <h3 style={{ textAlign: "center", color: "#065f46", fontSize: "16px", marginBottom: "10px" }}>
              Viagem {index + 1}
            </h3>
            {[
              { label: "Destino", name: "destino", required: true },
            ].map((field) => (
              <div key={field.name} style={{ marginBottom: "8px", width: "100%" }}>
                <label style={{ display: "block", textAlign: "center", marginBottom: "3px", fontSize: "14px" }}>
                  {field.label}:
                  {field.required && <span style={{ color: "red" }}> *</span>}
                </label>
                <input
                  type={field.type || "text"}
                  name={field.name}
                  value={trip[field.name]}
                  onChange={(e) => handleChange(e, index, field.name)}
                  required={field.required}
                  style={{
                    width: "100%",
                    padding: "6px",
                    borderRadius: "5px",
                    border: `1px solid ${errors[`trip_${index}_${field.name}`] ? "red" : "#10b981"}`,
                    fontSize: "14px"
                  }}
                />
                {errors[`trip_${index}_${field.name}`] && (
                  <div style={{ color: "red", fontSize: "10px", marginTop: "3px", textAlign: "center" }}>
                    {errors[`trip_${index}_${field.name}`]}
                  </div>
                )}
              </div>
            ))}

            <div style={{ display: "flex", gap: "10px", width: "100%", marginBottom: "8px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", textAlign: "center", marginBottom: "3px", fontSize: "14px" }}>
                  Data de Saída:<span style={{ color: "red" }}> *</span>
                </label>
                <input
                  type="date"
                  name="saida"
                  value={trip.saida}
                  onChange={(e) => handleChange(e, index, "saida")}
                  required
                  style={{
                    width: "100%",
                    padding: "6px",
                    borderRadius: "5px",
                    border: `1px solid ${errors[`trip_${index}_saida`] ? "red" : "#10b981"}`,
                    fontSize: "14px"
                  }}
                />
                {errors[`trip_${index}_saida`] && (
                  <div style={{ color: "red", fontSize: "10px", marginTop: "3px", textAlign: "center" }}>
                    {errors[`trip_${index}_saida`]}
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", textAlign: "center", marginBottom: "3px", fontSize: "14px" }}>
                  Hora de Saída:<span style={{ color: "red" }}> *</span>
                </label>
                <input
                  type="time"
                  name="horaSaida"
                  value={trip.horaSaida}
                  onChange={(e) => handleChange(e, index, "horaSaida")}
                  required
                  style={{
                    width: "100%",
                    padding: "6px",
                    borderRadius: "5px",
                    border: `1px solid ${errors[`trip_${index}_horaSaida`] ? "red" : "#10b981"}`,
                    fontSize: "14px"
                  }}
                />
                {errors[`trip_${index}_horaSaida`] && (
                  <div style={{ color: "red", fontSize: "10px", marginTop: "3px", textAlign: "center" }}>
                    {errors[`trip_${index}_horaSaida`]}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", width: "100%", marginBottom: "8px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", textAlign: "center", marginBottom: "3px", fontSize: "14px" }}>
                  Data de Retorno:<span style={{ color: "red" }}> *</span>
                </label>
                <input
                  type="date"
                  name="retorno"
                  value={trip.retorno}
                  onChange={(e) => handleChange(e, index, "retorno")}
                  required
                  style={{
                    width: "100%",
                    padding: "6px",
                    borderRadius: "5px",
                    border: `1px solid ${errors[`trip_${index}_retorno`] ? "red" : "#10b981"}`,
                    fontSize: "14px"
                  }}
                />
                {errors[`trip_${index}_retorno`] && (
                  <div style={{ color: "red", fontSize: "10px", marginTop: "3px", textAlign: "center" }}>
                    {errors[`trip_${index}_retorno`]}
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", textAlign: "center", marginBottom: "3px", fontSize: "14px" }}>
                  Hora de Retorno:<span style={{ color: "red" }}> *</span>
                </label>
                <input
                  type="time"
                  name="horaRetorno"
                  value={trip.horaRetorno}
                  onChange={(e) => handleChange(e, index, "horaRetorno")}
                  required
                  style={{
                    width: "100%",
                    padding: "6px",
                    borderRadius: "5px",
                    border: `1px solid ${errors[`trip_${index}_horaRetorno`] ? "red" : "#10b981"}`,
                    fontSize: "14px"
                  }}
                />
                {errors[`trip_${index}_horaRetorno`] && (
                  <div style={{ color: "red", fontSize: "10px", marginTop: "3px", textAlign: "center" }}>
                    {errors[`trip_${index}_horaRetorno`]}
                  </div>
                )}
              </div>
            </div>

            {[
              { label: "Placa do Veículo", name: "placa", required: true },
              { label: "Valor da Diária (R$)", name: "diaria", type: "number", required: true },
              { label: "Valor do Pernoite por Noite (R$)", name: "pernoite", type: "number" },
            ].map((field) => (
              <div key={field.name} style={{ marginBottom: "8px", width: "100%" }}>
                <label style={{ display: "block", textAlign: "center", marginBottom: "3px", fontSize: "14px" }}>
                  {field.label}:
                  {field.required && <span style={{ color: "red" }}> *</span>}
                </label>
                <input
                  type={field.type || "text"}
                  name={field.name}
                  value={trip[field.name]}
                  onChange={(e) => handleChange(e, index, field.name)}
                  required={field.required}
                  style={{
                    width: "100%",
                    padding: "6px",
                    borderRadius: "5px",
                    border: `1px solid ${errors[`trip_${index}_${field.name}`] ? "red" : "#10b981"}`,
                    fontSize: "14px"
                  }}
                />
                {errors[`trip_${index}_${field.name}`] && (
                  <div style={{ color: "red", fontSize: "10px", marginTop: "3px", textAlign: "center" }}>
                    {errors[`trip_${index}_${field.name}`]}
                  </div>
                )}
              </div>
            ))}

            <div style={{ marginBottom: "8px", width: "100%" }}>
              <label style={{ display: "block", textAlign: "center", marginBottom: "3px", fontSize: "14px" }}>
                Justificativa do Deslocamento:
                <span style={{ color: "red" }}> *</span>
              </label>
              <textarea
                name="justificativa"
                rows={3}
                value={trip.justificativa}
                onChange={(e) => handleChange(e, index, "justificativa")}
                required
                style={{
                  width: "100%",
                  padding: "6px",
                  borderRadius: "5px",
                  border: `1px solid ${errors[`trip_${index}_justificativa`] ? "red" : "#10b981"}`,
                  fontSize: "14px"
                }}
              />
              {errors[`trip_${index}_justificativa`] && (
                <div style={{ color: "red", fontSize: "10px", marginTop: "3px", textAlign: "center" }}>
                  {errors[`trip_${index}_justificativa`]}
                </div>
              )}
            </div>
          </div>
        ))}

        <button
          onClick={addTrip}
          style={{
            backgroundColor: "#065f46",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "14px",
            marginBottom: "10px"
          }}
        >
          Adicionar Viagem
        </button>

        <button
          onClick={gerarPDF}
          disabled={isLoading}
          style={{
            backgroundColor: "#047857",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: "5px",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontSize: "14px"
          }}
        >
          {isLoading ? "Carregando..." : "Gerar PDF"}
        </button>
      </div>
    </div>
  );
}