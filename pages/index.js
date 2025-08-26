
'use client';

import { useState, useEffect } from 'react';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Componente principal
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

  // Lista de feriados para 2025 em São Ludgero-SC
  const holidays = [
    '2025-01-01', // Ano Novo
    '2025-04-18', // Sexta-Feira Santa
    '2025-04-21', // Tiradentes
    '2025-05-01', // Dia do Trabalho
    '2025-06-19', // Corpus Christi
    '2025-09-07', // Independência do Brasil
    '2025-10-12', // Nossa Senhora Aparecida
    '2025-11-02', // Finados
    '2025-11-15', // Proclamação da República
    '2025-11-20', // Consciência Negra
    '2025-03-26', // Emancipação Política de São Ludgero
    '2025-06-12', // Padroeiro São Ludgero
  ];

  // Configura pdfMake no lado do cliente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      pdfMake.vfs = pdfFonts.vfs;
      setIsLoading(false);
    }
  }, []);
// Função auxiliar para criar data no fuso local (sem hora UTC)
const toLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // sempre no horário local
};

// Verifica se uma data é feriado
const isHoliday = (date) => {
  const dateStr = date.toISOString().slice(0, 10);
  return holidays.includes(dateStr);
};

// Calcula o número de dias e pernoites
const calculateDays = (saida, retorno, comPernoite) => {
  if (!saida) return { dias: 0, pernoites: 0 };
  const start = toLocalDate(saida);
  const end = retorno ? toLocalDate(retorno) : new Date(start);
  const diffTime = end - start;
  const dias = diffTime >= 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1 : 0;
  const pernoites = comPernoite && dias > 1 ? dias - 1 : 0;
  return { dias, pernoites };
};

// Calcula o total da diária, dobrando somente nos fins de semana ou feriados
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

    // avança 1 dia
    current.setDate(current.getDate() + 1);
  }
  return total;
};


  // Atualiza os totais de diária e pernoite
  const updateTotals = (trip) => {
    const { pernoites } = calculateDays(trip.saida, trip.retorno, trip.comPernoite);
    const diariaValor = parseFloat(trip.diaria) || 0;
    const pernoiteValor = trip.comPernoite ? parseFloat(trip.pernoite) || 0 : 0;
    return {
      totalDiaria: calculateTotalDiaria(trip.saida, trip.retorno, diariaValor),
      totalPernoite: pernoiteValor * pernoites,
    };
  };

  // Manipula mudanças nos campos
  const handleChange = (e, tripIndex, field) => {
    const updatedTrips = [...form.trips];
    if (tripIndex !== undefined) {
      if (field === 'comPernoite') {
        updatedTrips[tripIndex][field] = e.target.checked;
        if (!e.target.checked) {
          updatedTrips[tripIndex].retorno = updatedTrips[tripIndex].saida; // Define retorno igual a saida
          updatedTrips[tripIndex].pernoite = ''; // Limpa pernoite
        }
      } else if (e.target.type === 'checkbox') {
        updatedTrips[tripIndex][field] = e.target.checked;
      } else {
        updatedTrips[tripIndex][field] = e.target.value;
        // Atualiza retorno se comPernoite for false e o campo for saida
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

  // Adiciona uma nova viagem
  const addTrip = () => {
    setForm({
      ...form,
      trips: [
        ...form.trips,
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
  };

  // Valida o formulário
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

  // Gera o PDF
  const gerarPDF = () => {
    if (!pdfMake || isLoading) return;
    if (!validateForm()) return;

    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = hoje.toLocaleString('pt-BR', { month: 'long' });
    const ano = hoje.getFullYear();

    const content = [
      { text: 'PROPOSTA DE CONCESSÃO E PAGAMENTO DE DIÁRIA', style: 'header', alignment: 'center' },
      { text: 'Nos Termos do Decreto n. 56/2025', style: 'subheader', alignment: 'center', margin: [0, 0, 0, 20] },
      { text: 'A) IDENTIFICAÇÃO DO SERVIDOR', style: 'section' },
      { text: `Servidor: ${form.servidor}   Cargo: ${form.cargo}`, margin: [0, 5, 0, 0] },
      { text: `Matrícula: ${form.matricula}   Grupo de Diária: ${form.grupo}`, margin: [0, 5, 0, 10] },
    ];

    form.trips.forEach((trip, i) => {
      const diaria = trip.totalDiaria;
      const pernoite = trip.totalPernoite;
      const valorTotal = diaria + pernoite;

      content.push({ text: `B) DESTINO E PERÍODO DE AFASTAMENTO `, style: 'section' });
      content.push({ text: `Destino: ${trip.destino}    Distância: ${trip.distancia}`, margin: [0, 5, 0, 0] });
      content.push({ text: `Data de Saída: ${formatDate(trip.saida)}   Hora de Saída: ${trip.horaSaida}`, margin: [0, 5, 0, 0] });

      if (trip.retorno || trip.horaRetorno) {
        content.push({
          text: `Data de Retorno: ${formatDate(trip.retorno || trip.saida)}   Hora de Retorno: ${trip.horaRetorno || ''}`,
          margin: [0, 5, 0, 10],
        });
      }

      content.push({ text: 'C) DIÁRIA E PERNOITE', style: 'section' });
      content.push({
        text: '( ) Entre 04 e 08 horas     ( ) Acima de 08 horas\n( ) Outro Estado – Afastamento acima de 08 horas\n( ) Com pernoite',
        margin: [0, 5, 0, 10],
      });

      content.push({ text: 'D) TRANSPORTE', style: 'section' });
      content.push({ text: `${trip.transporte}    Placa: ${trip.placa}`, margin: [0, 5, 0, 10] });

      content.push({ text: 'E) TOTALIZADORES', style: 'section' });
      content.push({
        text: `Diária: R$ ${diaria.toFixed(2)}   Pernoite: R$ ${pernoite.toFixed(2)}   Valor Total: R$ ${valorTotal.toFixed(2)}`,
        margin: [0, 5, 0, 10],
      });

      content.push({ text: 'F) JUSTIFICATIVA DO DESLOCAMENTO', style: 'section' });
      content.push({ text: trip.justificativa, margin: [0, 5, 0, 20] });
    });

    content.push(
      { text: '________________________________________', alignment: 'center' },
      { text: `${form.servidor} – CPF: ${form.cpf}`, alignment: 'center', margin: [0, 0, 0, 20] },
      { text: 'G) AUTORIZAÇÃO', style: 'section' },
      {
        text: 'Autorizo o servidor requerente a afastar-se da sede do município, cumprir os objetivos da missão e perceber as diárias aqui especificadas.',
        margin: [0, 5, 0, 40],
      },
      { text: '________________________________________', alignment: 'center' },
      { text: `Secretaria: ${form.secretaria}`, alignment: 'center' },
      { text: `Secretário(a): ${form.secretario}`, alignment: 'center', margin: [0, 0, 0, 20] },
      { text: `São Ludgero-SC, ${dia} de ${mes} de ${ano}`, alignment: 'right', margin: [0, 20, 0, 20] },
      {
        text: 'Administração Municipal\nCentro Administrativo Municipal\nAv. Monsenhor Frederico Tombrock, 1.300\n(48) 3657-8800',
        alignment: 'center',
        fontSize: 9,
      }
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
      defaultStyle: { fontSize: 10 },
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
                label: 'Distância',
                field: 'distancia',
                type: 'select',
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
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
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
                  />{' '}
                  Entre 04 e 08 horas
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={trip.diariaAcima08}
                    onChange={(e) => handleChange(e, index, 'diariaAcima08')}
                  />{' '}
                  Acima de 08 horas
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={trip.outroEstado}
                    onChange={(e) => handleChange(e, index, 'outroEstado')}
                  />{' '}
                  Outro Estado
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={trip.comPernoite}
                    onChange={(e) => handleChange(e, index, 'comPernoite')}
                  />{' '}
                  Com pernoite
                </label>
              </div>
            </div>

            {[
              { label: 'Data de Saída', field: 'saida', type: 'date' },
              { label: 'Hora de Saída', field: 'horaSaida', type: 'time' },
              { label: 'Data de Retorno', field: 'retorno', type: 'date' },
              { label: 'Hora de Retorno', field: 'horaRetorno', type: 'time' },
              {
                label: 'Transporte',
                field: 'transporte',
                type: 'select',
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
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
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
