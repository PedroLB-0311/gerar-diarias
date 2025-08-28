'use client';

import { useState, useEffect } from 'react';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

 const logoMunicipio='data:image/png;base64,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'
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
console.log(form)
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
    if (!trip.saida) newErrors[`trip_${index}_saida`] = 'Campo obrigatório';        // corrigido
    if (!trip.horaSaida) newErrors[`trip_${index}_horaSaida`] = 'Campo obrigatório';
    if (!trip.retorno) newErrors[`trip_${index}_retorno`] = 'Campo obrigatório';    // corrigido
    if (!trip.horaRetorno) newErrors[`trip_${index}_horaRetorno`] = 'Campo obrigatório'; // corrigido
    if (!trip.deslocamento && !trip.transporte) {
      newErrors[`trip_${index}_transporte`] = 'Campo obrigatório';
    }
  });
  

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};


  const gerarPDF = () => {
    if (!pdfMake || isLoading) return;
    if (!validateForm()) {
      console.log('Formulário inválido. Verifique os campos obrigatórios.',validateForm);
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