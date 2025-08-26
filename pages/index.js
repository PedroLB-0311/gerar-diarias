'use client';

import { useState, useEffect } from 'react';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Base64 do brasão do município (mantido como placeholder, substitua pelo original)
const logoMunicipio = "data:image/png;base64,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"; 

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

  // Lista de feriados 2025 São Ludgero-SC
  const holidays = [
    '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-01', '2025-06-19', '2025-09-07',
    '2025-10-12', '2025-11-02', '2025-11-15', '2025-11-20', '2025-03-26', '2025-06-12'
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      pdfMake.vfs = pdfFonts.vfs;
      setIsLoading(false);
    }
  }, []);

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

  const updateTotals = (trip) => {
    const { pernoites } = calculateDays(trip.saida, trip.retorno, trip.comPernoite);
    const diariaValor = parseFloat(trip.diaria) || 0;
    const pernoiteValor = trip.comPernoite ? parseFloat(trip.pernoite) || 0 : 0;
    return {
      totalDiaria: calculateTotalDiaria(trip.saida, trip.retorno, diariaValor),
      totalPernoite: pernoiteValor * pernoites,
    };
  };

  const handleChange = (e, tripIndex, field) => {
    const updatedTrips = [...form.trips];
    if (tripIndex !== undefined) {
      if (field === 'comPernoite') {
        updatedTrips[tripIndex][field] = e.target.checked;
        if (!e.target.checked) {
          updatedTrips[tripIndex].retorno = updatedTrips[tripIndex].saida;
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
        destino: '', distancia: '', saida: '', horaSaida: '', retorno: '', horaRetorno: '',
        diaria04_08: false, diariaAcima08: false, outroEstado: false, comPernoite: false,
        transporte: '', placa: '', diaria: '', pernoite: '', totalDiaria: 0, totalPernoite: 0, justificativa: '',
      }],
    });
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
      if (!trip.transporte) newErrors[`trip_${index}_transporte`] = 'Selecione o transporte';
      if (!trip.placa) newErrors[`trip_${index}_placa`] = 'Campo obrigatório';
      if (!trip.diaria) newErrors[`trip_${index}_diaria`] = 'Campo obrigatório';
      if (trip.comPernoite && !trip.pernoite) newErrors[`trip_${index}_pernoite`] = 'Informe o valor do pernoite';
      if (!trip.justificativa) newErrors[`trip_${index}_justificativa`] = 'Campo obrigatório';
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };const gerarPDF = () => {
    if (!pdfMake || isLoading) return;
    if (!validateForm()) {
      alert("Por favor preencha todos os campos necessários");
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
  
    // A) IDENTIFICAÇÃO DO SERVIDOR - Apenas uma vez no início
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
  
    // Para cada viagem, adicionar as seções de forma compacta
    form.trips.forEach((trip, i) => {
      const diaria = trip.totalDiaria;
      const pernoite = trip.totalPernoite;
      const valorTotal = diaria + pernoite;
  
      // Adicionar separador apenas se não for a primeira viagem
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
          text: `${checkboxes[0]} Entre 04 e 08 horas     ${checkboxes[1]} Acima de 08 horas\n${checkboxes[2]} Outro Estado – Afastamento acima de 08 horas\n${checkboxes[3]} Com pernoite`,
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
  
    // Assinatura e autorização (apenas uma vez no final)
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
        text: ` ${form.secretaria}`, 
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
  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 600, background: '#f0fdf4', padding: 20, borderRadius: 10 }}>
        <h2 style={{ textAlign: 'center', color: '#065f46', marginBottom: 20 }}>Formulário de Diária</h2>

        {/* Campos do servidor */}
        {['servidor', 'cpf', 'cargo', 'matricula', 'secretario', 'secretaria'].map((field) => (
          <div key={field} style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 5 }}>
              {field.charAt(0).toUpperCase() + field.slice(1)}
            </label>
            <input
              type="text"
              name={field}
              value={form[field]}
              onChange={handleChange}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            />
            {errors[field] && <span style={{ color: 'red', fontSize: 12 }}>{errors[field]}</span>}
          </div>
        ))}

        {/* Grupo de diária */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 5 }}>Grupo de Diária</label>
          <select
            name="grupo"
            value={form.grupo}
            onChange={handleChange}
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="">Selecione o grupo de diária</option>
            <option value="A">Grupo A</option>
            <option value="B">Grupo B</option>
            <option value="B Acompanhando A">B Acompanhando A</option>
          </select>
          {errors.grupo && <span style={{ color: 'red', fontSize: 12 }}>{errors.grupo}</span>}
        </div>

        {/* Viagens */}
        {form.trips.map((trip, index) => (
          <div
            key={index}
            style={{
              marginBottom: 20,
              borderTop: index > 0 ? '1px solid #ccc' : 'none',
              paddingTop: index > 0 ? 10 : 0,
            }}
          >
            <h3>Viagem {index + 1}</h3>

            {[
              { label: 'Destino', field: 'destino', type: 'text' },
              {
                label: 'Distância', field: 'distancia', type: 'select',
                options: ['Inferior a 200 km', 'Acima de 200 km'],
              },
            ].map(({ label, field, type, options }) => (
              <div key={field} style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', marginBottom: 5 }}>{label}</label>
                {type === 'select' ? (
                  <select
                    value={trip[field]}
                    onChange={(e) => handleChange(e, index, field)}
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                  >
                    <option value="">Selecione</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={type}
                    value={trip[field]}
                    onChange={(e) => handleChange(e, index, field)}
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                  />
                )}
                {errors[`trip_${index}_${field}`] && (
                  <span style={{ color: 'red', fontSize: 12 }}>{errors[`trip_${index}_${field}`]}</span>
                )}
              </div>
            ))}

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', marginBottom: 5 }}>Tipo de Diária</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={trip.diaria04_08}
                    onChange={(e) => handleChange(e, index, 'diaria04_08')}
                  /> Entre 04 e 08 horas
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={trip.diariaAcima08}
                    onChange={(e) => handleChange(e, index, 'diariaAcima08')}
                  /> Acima de 08 horas
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={trip.outroEstado}
                    onChange={(e) => handleChange(e, index, 'outroEstado')}
                  /> Outro Estado
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={trip.comPernoite}
                    onChange={(e) => handleChange(e, index, 'comPernoite')}
                  /> Com pernoite
                </label>
              </div>
            </div>

            {[
              { label: 'Data de Saída', field: 'saida', type: 'date' },
              { label: 'Hora de Saída', field: 'horaSaida', type: 'time' },
              { label: 'Data de Retorno', field: 'retorno', type: 'date' },
              { label: 'Hora de Retorno', field: 'horaRetorno', type: 'time' },
              {
                label: 'Transporte', field: 'transporte', type: 'select',
                options: ['Veículo Oficial', 'Veículo Particular'],
              },
              { label: 'Placa do Veículo', field: 'placa', type: 'text' },
              { label: 'Valor da Diária (R$)', field: 'diaria', type: 'number' },
              ...(trip.comPernoite
                ? [{ label: 'Valor do Pernoite por Noite (R$)', field: 'pernoite', type: 'number' }]
                : []),
            ].map(({ label, field, type, options }) => (
              <div key={field} style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', marginBottom: 5 }}>{label}</label>
                {type === 'select' ? (
                  <select
                    value={trip[field]}
                    onChange={(e) => handleChange(e, index, field)}
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                  >
                    <option value="">Selecione</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={type}
                    value={trip[field]}
                    onChange={(e) => handleChange(e, index, field)}
                    readOnly={field === 'retorno' && !trip.comPernoite}
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                  />
                )}
                {errors[`trip_${index}_${field}`] && (
                  <span style={{ color: 'red', fontSize: 12 }}>{errors[`trip_${index}_${field}`]}</span>
                )}
              </div>
            ))}

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', marginBottom: 5 }}>Justificativa do Deslocamento</label>
              <textarea
                value={trip.justificativa}
                onChange={(e) => handleChange(e, index, 'justificativa')}
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', minHeight: 100 }}
              />
              {errors[`trip_${index}_justificativa`] && (
                <span style={{ color: 'red', fontSize: 12 }}>{errors[`trip_${index}_justificativa`]}</span>
              )}
            </div>

            <p>Total Diária: R$ {trip.totalDiaria.toFixed(2)}</p>
            <p>Total Pernoite: R$ {trip.totalPernoite.toFixed(2)}</p>
            <p>Valor Total: R$ {(trip.totalDiaria + trip.totalPernoite).toFixed(2)}</p>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={addTrip}
            style={{ padding: '10px 20px', background: '#065f46', color: 'white', border: 'none', borderRadius: 4 }}
          >
            Adicionar Viagem
          </button>
          <button
            onClick={gerarPDF}
            style={{ padding: '10px 20px', background: '#065f46', color: 'white', border: 'none', borderRadius: 4 }}
          >
            Gerar PDF
          </button>
        </div>
      </div>
    </div>
  );
}