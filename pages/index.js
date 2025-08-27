'use client';

import { useState, useEffect } from 'react';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

 const logoMunicipio='Logo.png'
const holidays = [
  '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-01', '2025-06-19', '2025-09-07',
  '2025-10-12', '2025-11-02', '2025-11-15', '2025-11-20', '2025-03-26', '2025-06-12'
];

const toLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const isHoliday = (date) => {
  const dateStr = date.toISOString().slice(0, 10);
  return holidays.includes(dateStr);
};

const calculateDays = (saida, retorno, comPernoite) => {
  if (!saida) return { dias: 0, pernoites: 0 };
  const start = toLocalDate(saida);
  const end = retorno ? toLocalDate(retorno) : new Date(start);
  const diffTime = end - start;
  const dias = diffTime >= 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1 : 0;
  const pernoites = comPernoite && dias > 1 ? dias - 1 : 0;
  return { dias, pernoites };
};

const calculateTotalDiaria = (saida, retorno, diariaValor) => {
  if (!saida) return 0;
  const start = toLocalDate(saida);
  const end = toLocalDate(retorno || saida);
  let total = 0;
  let current = new Date(start);

  while (current <= end) {
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;
    const multiplier = isWeekend || isHoliday(current) ? 2 : 1;
    total += multiplier * diariaValor;
    current.setDate(current.getDate() + 1);
  }
  return total;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export default function DiariaPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    servidor: '',
    cpf: '',
    cargo: '',
    matricula: '',
    grupo: '',
    secretario: '',
    secretaria: '',
    trips: [
      {
        destino: '',
        distancia: '',
        saida: '',
        horaSaida: '',
        retorno: '',
        horaRetorno: '',
        diaria04_08: false,
        diariaAcima08: false,
        outroEstado: false,
        comPernoite: false,
        transporte: '',
        placa: '',
        diaria: '',
        pernoite: '',
        totalDiaria: 0,
        totalPernoite: 0,
        justificativa: '',
      },
    ],
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      pdfMake.vfs = pdfFonts.vfs;
      setIsLoading(false);
    }
  }, []);
  const valoresDiarias = {
    "outroEstado": {
      A: { pernoite: 1280, acima8h: 200 },
      B: { pernoite: 950, acima8h: 160 }
    },
    "capital": {
      A: { pernoite: 400, acima8h: 135, entre4e8h: 80 },
      B: { pernoite: 320, acima8h: 100, entre4e8h: 60 }
    },
    "menos200": {
      A: { pernoite: 400, acima8h: 135, entre4e8h: 80 },
      B: { pernoite: 320, acima8h: 100, entre4e8h: 60 }
    },
    "mais200": {
      A: { pernoite: 400, acima8h: 135, entre4e8h: 135 },
      B: { pernoite: 320, acima8h: 110, entre4e8h: 110 }
    }
  };
  const getValorDiaria = (grupo, trip) => {
    let tabela;
    if (trip.outroEstado) {
      tabela = valoresDiarias.outroEstado;
    } else if (trip.distancia === "Inferior a 200 km") {
      tabela = valoresDiarias.menos200;
    } else if (trip.distancia === "Acima de 200 km") {
      tabela = valoresDiarias.mais200;
    } else {
      tabela = valoresDiarias.capital;
    }
  
    const valores = tabela[grupo];
    if (trip.comPernoite) return { diaria: valores.acima8h, pernoite: valores.pernoite };
    if (trip.diariaAcima08) return { diaria: valores.acima8h, pernoite: 0 };
    if (trip.diaria04_08) return { diaria: valores.entre4e8h, pernoite: 0 };
  
    return { diaria: 0, pernoite: 0 };
  };
  
  

  const updateTotals = (trip) => {
    const { diaria, pernoite } = getValorDiaria(form.grupo, trip);
    const { pernoites } = calculateDays(trip.saida, trip.retorno, trip.comPernoite);
    return {
      totalDiaria: calculateTotalDiaria(trip.saida, trip.retorno, diaria),
      totalPernoite: pernoite * pernoites,
    };
  };
  

  const handleChange = (e, tripIndex, field) => {
    const updatedTrips = [...form.trips];
    if (tripIndex !== undefined) {
      if (field === 'comPernoite') {
        updatedTrips[tripIndex][field] = e.target.checked;
        if (!e.target.checked) {
          updatedTrips[tripIndex].retorno = updatedTrips[tripIndex].saida;
          updatedTrips[tripIndex].horaRetorno = '';
          updatedTrips[tripIndex].pernoite = '';
        }
      } else if (e.target.type === 'checkbox') {
        updatedTrips[tripIndex][field] = e.target.checked;
      } else {
        updatedTrips[tripIndex][field] = e.target.value;
        if (field === 'saida' && !updatedTrips[tripIndex].comPernoite) {
          updatedTrips[tripIndex].retorno = e.target.value;
        }
      }
      const totals = updateTotals(updatedTrips[tripIndex]);
      updatedTrips[tripIndex].totalDiaria = totals.totalDiaria;
      updatedTrips[tripIndex].totalPernoite = totals.totalPernoite;
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
        destino: '',
        distancia: '',
        saida: '',
        horaSaida: '',
        retorno: '',
        horaRetorno: '',
        diaria04_08: false,
        diariaAcima08: false,
        outroEstado: false,
        comPernoite: false,
        transporte: '',
        placa: '',
        diaria: '',
        pernoite: '',
        totalDiaria: 0,
        totalPernoite: 0,
        justificativa: '',
      }],
    });
  };

  const removeTrip = (index) => {
    if (form.trips.length > 1) {
      const updatedTrips = form.trips.filter((_, i) => i !== index);
      setForm({ ...form, trips: updatedTrips });
            const newErrors = { ...errors };
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith(`trip_${index}_`)) {
          delete newErrors[key];
        }
      });
      setErrors(newErrors);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.servidor) newErrors.servidor = 'Campo obrigatório';
    if (!form.cpf) newErrors.cpf = 'Campo obrigatório';
    if (!form.cargo) newErrors.cargo = 'Campo obrigatório';
    if (!form.matricula) newErrors.matricula = 'Campo obrigatório';
    if (!form.grupo) newErrors.grupo = 'Selecione o grupo de diária';
    if (!form.secretario) newErrors.secretario = 'Campo obrigatório';
    if (!form.secretaria) newErrors.secretaria = 'Campo obrigatório';

    form.trips.forEach((trip, index) => {
      if (!trip.destino) newErrors[`trip_${index}_destino`] = 'Campo obrigatório';
      if (!trip.distancia) newErrors[`trip_${index}_distancia`] = 'Selecione a distância';
      if (!trip.saida) newErrors[`trip_${index}_saida`] = 'Campo obrigatório';
      if (!trip.horaSaida) newErrors[`trip_${index}_horaSaida`] = 'Campo obrigatório';
      if (trip.comPernoite && !trip.retorno) newErrors[`trip_${index}_retorno`] = 'Campo obrigatório com pernoite';
      if (trip.comPernoite && !trip.horaRetorno) newErrors[`trip_${index}_horaRetorno`] = 'Campo obrigatório com pernoite';
      if (trip.retorno && toLocalDate(trip.retorno) < toLocalDate(trip.saida)) newErrors[`trip_${index}_retorno`] = 'Data de retorno deve ser após a saída';
      if (!trip.transporte) newErrors[`trip_${index}_transporte`] = 'Selecione o transporte';
      if (!trip.placa) newErrors[`trip_${index}_placa`] = 'Campo obrigatório';
      if (!trip.diaria) newErrors[`trip_${index}_diaria`] = 'Campo obrigatório';
      if (trip.comPernoite && !trip.pernoite) newErrors[`trip_${index}_pernoite`] = 'Informe o valor do pernoite';
      if (!trip.justificativa) newErrors[`trip_${index}_justificativa`] = 'Campo obrigatório';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const gerarPDF = () => {
    if (!pdfMake || isLoading) return;
    if (!validateForm()) {
      alert("Por favor, preencha todos os campos necessários corretamente.");
      return;
    }

    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = hoje.toLocaleString('pt-BR', { month: 'long' });
    const ano = hoje.getFullYear();

    const content = [
      {
        text: 'PROPOSTA DE CONCESSÃO E PAGAMENTO DE DIÁRIA\nNos Termos do Decreto n. 56/2025',
        fontSize: 12,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 10],
        lineHeight: 1.2,
      },
    ];

    // A) IDENTIFICAÇÃO DO SERVIDOR
    content.push(
      {
        text: 'A) IDENTIFICAÇÃO DO SERVIDOR',
        style: 'sectionHeader',
        margin: [0, 6, 0, 4]
      },
      {
        columns: [
          { text: `Servidor: ${form.servidor}`, width: '50%', fontSize: 10 },
          { text: `Cargo: ${form.cargo}`, width: '50%', fontSize: 10 },
        ],
        margin: [0, 0, 0, 3],
        columnGap: 10,
      },
      {
        columns: [
          { text: `Matrícula: ${form.matricula}`, width: '50%', fontSize: 10 },
          { text: `Grupo de Diária: ${form.grupo}`, width: '50%', fontSize: 10 },
        ],
        margin: [0, 0, 0, 10],
        columnGap: 10,
      }
    );

    // Para cada viagem
    form.trips.forEach((trip, i) => {
      const diaria = trip.totalDiaria;
      const pernoite = trip.totalPernoite;
      const valorTotal = diaria + pernoite;

      if (i > 0) {
        content.push({ text: '', pageBreak: 'before' });
      }

      // B) DESTINO E PERÍODO DE AFASTAMENTO
      content.push(
        {
          text: 'B) DESTINO E PERÍODO DE AFASTAMENTO',
          style: 'sectionHeader',
          margin: [0, 6, 0, 4]
        },
        {
          columns: [
            { text: `Destino: ${trip.destino}`, width: '50%', fontSize: 10 },
            { text: `Distância: ${trip.distancia}`, width: '50%', fontSize: 10 },
          ],
          margin: [0, 0, 0, 3],
          columnGap: 10,
        },
        {
          columns: [
            { text: `Data de Saída: ${formatDate(trip.saida)}`, width: '50%', fontSize: 10 },
            { text: `Hora de Saída: ${trip.horaSaida}`, width: '50%', fontSize: 10 },
          ],
          margin: [0, 0, 0, 3],
          columnGap: 10,
        },
        {
          columns: [
            { text: `Data de Retorno: ${formatDate(trip.retorno || trip.saida)}`, width: '50%', fontSize: 10 },
            { text: `Hora de Retorno: ${trip.horaRetorno || ''}`, width: '50%', fontSize: 10 },
          ],
          margin: [0, 0, 0, 6],
          columnGap: 10,
        }
      );

      // C) DIÁRIA E PERNOITE
      const checkboxes = [
        trip.diaria04_08 ? '(X)' : '( )',
        trip.diariaAcima08 ? '(X)' : '( )',
        trip.outroEstado ? '(X)' : '( )',
        trip.comPernoite ? '(X)' : '( )'
      ];

      content.push(
        {
          text: 'C) DIÁRIA E PERNOITE',
          style: 'sectionHeader',
          margin: [0, 6, 0, 4]
        },
        {
          text: `${checkboxes[0]} Entre 04 e 08 horas     ${checkboxes[1]} Acima de 08 horas\n${checkboxes[2]} Outro Estado Acima De 8 horas \n${checkboxes[3]} Com pernoite`,
          margin: [0, 0, 0, 6],
          fontSize: 10,
        }
      );

      // D) TRANSPORTE
      content.push(
        {
          text: 'D) TRANSPORTE',
          style: 'sectionHeader',
          margin: [0, 6, 0, 4]
        },
        {
          text: `${trip.transporte} Placa: ${trip.placa}`,
          margin: [0, 0, 0, 6],
          fontSize: 10,
        }
      );

      // E) TOTALIZADORES
      content.push(
        {
          text: 'E) TOTALIZADORES',
          style: 'sectionHeader',
          margin: [0, 6, 0, 4]
        },
        {
          columns: [
            { text: `Diária: R$ ${diaria.toFixed(2)}`, width: '33%', fontSize: 10 },
            { text: `Pernoite: R$ ${pernoite.toFixed(2)}`, width: '33%', fontSize: 10 },
            { text: `Valor Total: R$ ${valorTotal.toFixed(2)}`, width: '34%', fontSize: 10 },
          ],
          margin: [0, 0, 0, 6],
          columnGap: 5,
        }
      );

      // F) JUSTIFICATIVA DO DESLOCAMENTO
      content.push(
        {
          text: 'F) JUSTIFICATIVA DO DESLOCAMENTO',
          style: 'sectionHeader',
          margin: [0, 6, 0, 4]
        },
        {
          text: trip.justificativa,
          margin: [0, 0, 0, 10],
          fontSize: 10,
        }
      );
    });

    // Assinaturas e autorização
    content.push(
      {
        text: '________________________________________',
        alignment: 'center',
        margin: [0, 12, 0, 4],
        fontSize: 10
      },
      {
        text: `${form.servidor} – CPF: ${form.cpf}`,
        alignment: 'center',
        margin: [0, 0, 0, 10],
        fontSize: 10
      },
      {
        text: 'G) AUTORIZAÇÃO',
        style: 'sectionHeader',
        margin: [0, 6, 0, 4]
      },
      {
        text: 'Autorizo o servidor requerente a afastar-se da sede do município, cumprir os objetivos da missão e perceber as diárias aqui especificadas.',
        margin: [0, 0, 0, 10],
        fontSize: 10,
      },
      {
        text: '________________________________________',
        alignment: 'center',
        margin: [0, 12, 0, 4],
        fontSize: 10
      },
      {
        text: `${form.secretaria}`,
        alignment: 'center',
        margin: [0, 0, 0, 3],
        fontSize: 10
      },
      {
        text: `Secretário(a): ${form.secretario}`,
        alignment: 'center',
        margin: [0, 0, 0, 10],
        fontSize: 10
      },
      {
        text: `São Ludgero-SC, ${dia} de ${mes} de ${ano}`,
        alignment: 'center',
        fontSize: 10,
        margin: [0, 0, 0, 12]
      }
    );

    pdfMake.createPdf({
      pageSize: 'A4',
      pageMargins: [30, 70, 30, 30],
      header: {
        margin: [30, 10, 30, 0],
        stack: [
          {
            image: logoMunicipio,
            width: 200,
            alignment: 'left',
            margin: [0, 0, 0, 3],
          },
          {
            text: 'Administração Municipal de São Ludgero',
            alignment: 'center',
            fontSize: 10,
            bold: true,
            margin: [0, 0, 0, 0],
          },
        ],
      },
      footer: (currentPage, pageCount) => {
        return {
          columns: [
            {
              text: 'Centro Administrativo Municipal\nAv. Monsenhor Frederico Tombrock, 1.300\n(48) 3657-8800',
              alignment: 'center',
              fontSize: 8,
              margin: [0, 0, 0, 0],
            },
            {
              text: `Página ${currentPage} de ${pageCount}`,
              alignment: 'right',
              fontSize: 8,
              margin: [0, 0, 20, 0]
            },
          ],
          margin: [30, 0, 30, 10],
        };
      },
      content,
      styles: {
        sectionHeader: {
          fontSize: 11,
          bold: true,
          margin: [0, 0, 0, 0]
        },
      },
      defaultStyle: {
        fontSize: 10,
        lineHeight: 1.2
      },
    }).download('diaria_modelo_oficial.pdf');
  };

  // Calculate grand totals for display
  const grandTotalDiaria = form.trips.reduce((sum, trip) => sum + trip.totalDiaria, 0);
  const grandTotalPernoite = form.trips.reduce((sum, trip) => sum + trip.totalPernoite, 0);
  const grandTotal = grandTotalDiaria + grandTotalPernoite;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '40px 20px',
      backgroundColor: '#f9fafb',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 700,
        backgroundColor: 'white',
        padding: 30,
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      }}>
        <h2 style={{
          textAlign: 'center',
          color: '#065f46',
          marginBottom: 30,
          fontSize: 24,
          fontWeight: 'bold',
        }}>Formulário de Diária</h2>

        {/* Servidor Section */}
        <fieldset style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 20,
          marginBottom: 30,
        }}>
          <legend style={{ fontSize: 16, fontWeight: 'bold', color: '#065f46', padding: '0 10px' }}>Identificação do Servidor</legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {['servidor', 'cpf', 'cargo', 'matricula'].map((field) => (
              <div key={field} style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#374151' }}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <input
                  type="text"
                  name={field}
                  value={form[field]}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#065f46'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
                {errors[field] && <span style={{ color: '#ef4444', fontSize: 12, display: 'block', marginTop: 4 }}>{errors[field]}</span>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#374151' }}>Grupo de Diária</label>
            <select
              name="grupo"
              value={form.grupo}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 14,
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#065f46'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            >
              <option value="">Selecione o grupo de diária</option>
              <option value="A">Grupo A</option>
              <option value="B">Grupo B</option>
              <option value="B Acompanhando A">B Acompanhando A</option>
            </select>
            {errors.grupo && <span style={{ color: '#ef4444', fontSize: 12, display: 'block', marginTop: 4 }}>{errors.grupo}</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
            {['secretario', 'secretaria'].map((field) => (
              <div key={field} style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#374151' }}>
                  {field === 'secretario' ? 'Nome do Secretário(a)' : field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <input
                  type="text"
                  name={field}
                  value={form[field]}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#065f46'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
                {errors[field] && <span style={{ color: '#ef4444', fontSize: 12, display: 'block', marginTop: 4 }}>{errors[field]}</span>}
              </div>
            ))}
          </div>
        </fieldset>

        {/* Trips Section */}
        {form.trips.map((trip, index) => (
          <fieldset key={index} style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 20,
            marginBottom: 30,
            position: 'relative',
          }}>
            <legend style={{ fontSize: 16, fontWeight: 'bold', color: '#065f46', padding: '0 10px' }}>Viagem {index + 1}</legend>
            {form.trips.length > 1 && (
              <button
                onClick={() => removeTrip(index)}
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: 12,
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => e.target.style.background = '#dc2626'}
                onMouseOut={(e) => e.target.style.background = '#ef4444'}
              >
                Remover
              </button>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[
                { label: 'Destino', field: 'destino', type: 'text' },
                {
                  label: 'Distância', field: 'distancia', type: 'select',
                  options: ['', 'Inferior a 200 km', 'Acima de 200 km'],
                },
                { label: 'Data de Saída', field: 'saida', type: 'date' },
                { label: 'Hora de Saída', field: 'horaSaida', type: 'time' },
                { label: 'Data de Retorno', field: 'retorno', type: 'date', disabled: !trip.comPernoite },
                { label: 'Hora de Retorno', field: 'horaRetorno', type: 'time' },
                {
                  label: 'Transporte', field: 'transporte', type: 'select',
                  options: ['', 'Veículo Oficial', 'Veículo Particular'],
                },
                { label: 'Placa do Veículo', field: 'placa', type: 'text' },
               
              ].map(({ label, field, type, options, disabled }) => (
                <div key={field} style={{ marginBottom: 0, gridColumn: type === 'checkbox' ? '1 / 3' : 'auto' }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#374151' }}>{label}</label>
                  {type === 'select' ? (
                    <select
                      value={trip[field]}
                      onChange={(e) => handleChange(e, index, field)}
                      disabled={disabled}
                      style={{
                        width: '100%',
                        padding: 10,
                        borderRadius: 6,
                        border: '1px solid #d1d5db',
                        fontSize: 14,
                        backgroundColor: disabled ? '#f3f4f6' : 'white',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => !disabled && (e.target.style.borderColor = '#065f46')}
                      onBlur={(e) => !disabled && (e.target.style.borderColor = '#d1d5db')}
                    >
                      {options.map((opt) => (
                        <option key={opt} value={opt}>{opt || 'Selecione'}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={type}
                      value={trip[field]}
                      onChange={(e) => handleChange(e, index, field)}
                      disabled={disabled}
                      style={{
                        width: '100%',
                        padding: 10,
                        borderRadius: 6,
                        border: '1px solid #d1d5db',
                        fontSize: 14,
                        backgroundColor: disabled ? '#f3f4f6' : 'white',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => !disabled && (e.target.style.borderColor = '#065f46')}
                      onBlur={(e) => !disabled && (e.target.style.borderColor = '#d1d5db')}
                    />
                  )}
                  {errors[`trip_${index}_${field}`] && (
                    <span style={{ color: '#ef4444', fontSize: 12, display: 'block', marginTop: 4 }}>{errors[`trip_${index}_${field}`]}</span>
                  )}
                </div>
              ))}
              {trip.comPernoite && (
                <div style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#374151' }}>Valor do Pernoite por Noite (R$)</label>
                  <input
                    type="number"
                    value={trip.pernoite}
                    
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 6,
                      border: '1px solid #d1d5db',
                      fontSize: 14,
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#065f46'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                  {errors[`trip_${index}_pernoite`] && (
                    <span style={{ color: '#ef4444', fontSize: 12, display: 'block', marginTop: 4 }}>{errors[`trip_${index}_pernoite`]}</span>
                  )}
                </div>
              )}
            </div>

            {/* Tipo de Diária */}
            <div style={{ marginTop: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#374151' }}>Tipo de Diária</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: '#374151' }}>
                  <input
                    type="checkbox"
                    checked={trip.diaria04_08}
                    onChange={(e) => handleChange(e, index, 'diaria04_08')}
                    style={{ marginRight: 8 }}
                  /> Entre 04 e 08 horas
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: '#374151' }}>
                  <input
                    type="checkbox"
                    checked={trip.diariaAcima08}
                    onChange={(e) => handleChange(e, index, 'diariaAcima08')}
                    style={{ marginRight: 8 }}
                  /> Acima de 08 horas
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: '#374151' }}>
                  <input
                    type="checkbox"
                    checked={trip.outroEstado}
                    onChange={(e) => handleChange(e, index, 'outroEstado')}
                    style={{ marginRight: 8 }}
                  /> Outro Estado Acima De 8 horas
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: '#374151' }}>
                  <input
                    type="checkbox"
                    checked={trip.comPernoite}
                    onChange={(e) => handleChange(e, index, 'comPernoite')}
                    style={{ marginRight: 8 }}
                  /> Com pernoite
                </label>
              </div>
            </div>

            {/* Justificativa */}
            <div style={{ marginTop: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#374151' }}>Justificativa do Deslocamento</label>
              <textarea
                value={trip.justificativa}
                onChange={(e) => handleChange(e, index, 'justificativa')}
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                  minHeight: 100,
                  resize: 'vertical',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#065f46'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
              {errors[`trip_${index}_justificativa`] && (
                <span style={{ color: '#ef4444', fontSize: 12, display: 'block', marginTop: 4 }}>{errors[`trip_${index}_justificativa`]}</span>
              )}
            </div>

            {/* Totals */}
            <div style={{ marginTop: 20, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 6 }}>
              <p style={{ fontSize: 14, color: '#065f46' }}>Total Diária: R$ {trip.totalDiaria.toFixed(2)}</p>
              <p style={{ fontSize: 14, color: '#065f46' }}>Total Pernoite: R$ {trip.totalPernoite.toFixed(2)}</p>
              <p style={{ fontSize: 14, color: '#065f46', fontWeight: 'bold' }}>Valor Total: R$ {(trip.totalDiaria + trip.totalPernoite).toFixed(2)}</p>
            </div>
          </fieldset>
        ))}

        {/* Grand Totals */}
        {form.trips.length > 1 && (
          <div style={{ marginBottom: 30, padding: 15, backgroundColor: '#d1fae5', borderRadius: 8 }}>
            <h3 style={{ fontSize: 16, color: '#065f46', marginBottom: 10 }}>Totais Gerais</h3>
            <p>Total Diárias: R$ {grandTotalDiaria.toFixed(2)}</p>
            <p>Total Pernoites: R$ {grandTotalPernoite.toFixed(2)}</p>
            <p style={{ fontWeight: 'bold' }}>Grande Total: R$ {grandTotal.toFixed(2)}</p>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <button
            onClick={addTrip}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: '#065f46',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => e.target.style.background = '#047857'}
            onMouseOut={(e) => e.target.style.background = '#065f46'}
          >
            Adicionar Viagem
          </button>
          <button
            onClick={gerarPDF}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: '#065f46',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => e.target.style.background = '#047857'}
            onMouseOut={(e) => e.target.style.background = '#065f46'}
          >
            Gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
} 