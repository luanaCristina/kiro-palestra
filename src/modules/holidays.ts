/**
 * Brazilian holidays module.
 * Includes national holidays and state-specific holidays.
 */

export interface Holiday {
  date: string; // MM-DD format
  name: string;
  type: 'national' | 'state';
  states?: string[]; // state abbreviations where the holiday applies
}

/**
 * Brazilian national holidays (fixed dates) for 2026.
 * Note: Some holidays like Carnival and Easter vary by year.
 */
const NATIONAL_HOLIDAYS_2026: Holiday[] = [
  { date: '01-01', name: 'Confraternização Universal', type: 'national' },
  { date: '02-16', name: 'Carnaval', type: 'national' }, // 2026
  { date: '02-17', name: 'Carnaval', type: 'national' }, // 2026
  { date: '04-03', name: 'Sexta-feira Santa', type: 'national' }, // 2026
  { date: '04-21', name: 'Tiradentes', type: 'national' },
  { date: '05-01', name: 'Dia do Trabalho', type: 'national' },
  { date: '06-04', name: 'Corpus Christi', type: 'national' }, // 2026
  { date: '09-07', name: 'Independência do Brasil', type: 'national' },
  { date: '10-12', name: 'Nossa Senhora Aparecida', type: 'national' },
  { date: '11-02', name: 'Finados', type: 'national' },
  { date: '11-15', name: 'Proclamação da República', type: 'national' },
  { date: '12-25', name: 'Natal', type: 'national' },
];

/**
 * State-specific holidays in Brazil.
 */
const STATE_HOLIDAYS_2026: Holiday[] = [
  // Pernambuco
  { date: '03-06', name: 'Revolução Pernambucana de 1817', type: 'state', states: ['PE'] },
  { date: '06-24', name: 'São João', type: 'state', states: ['PE', 'AL', 'PB'] },
  // São Paulo
  { date: '01-25', name: 'Aniversário de São Paulo', type: 'state', states: ['SP'] },
  { date: '07-09', name: 'Revolução Constitucionalista', type: 'state', states: ['SP'] },
  // Rio de Janeiro
  { date: '01-20', name: 'Dia de São Sebastião', type: 'state', states: ['RJ'] },
  { date: '04-23', name: 'Dia de São Jorge', type: 'state', states: ['RJ'] },
  { date: '11-20', name: 'Dia da Consciência Negra', type: 'state', states: ['RJ', 'SP', 'MT', 'AM', 'AP'] },
  // Minas Gerais
  { date: '04-21', name: 'Data Magna de Minas Gerais', type: 'state', states: ['MG'] },
  // Bahia
  { date: '06-24', name: 'São João', type: 'state', states: ['BA'] },
  { date: '07-02', name: 'Independência da Bahia', type: 'state', states: ['BA'] },
  // Rio Grande do Sul
  { date: '09-20', name: 'Revolução Farroupilha', type: 'state', states: ['RS'] },
  // Paraná
  { date: '12-19', name: 'Emancipação Política do Paraná', type: 'state', states: ['PR'] },
  // Alagoas
  { date: '09-16', name: 'Emancipação Política de Alagoas', type: 'state', states: ['AL'] },
  { date: '11-20', name: 'Dia da Consciência Negra', type: 'state', states: ['AL'] },
  // Ceará
  { date: '03-25', name: 'Data Magna do Ceará', type: 'state', states: ['CE'] },
  // Maranhão
  { date: '07-28', name: 'Adesão do Maranhão à Independência', type: 'state', states: ['MA'] },
  // Pará
  { date: '08-15', name: 'Adesão do Grão-Pará à Independência', type: 'state', states: ['PA'] },
  // Paraíba
  { date: '08-05', name: 'Fundação do Estado da Paraíba', type: 'state', states: ['PB'] },
  // Piauí
  { date: '10-19', name: 'Dia do Piauí', type: 'state', states: ['PI'] },
  // Sergipe
  { date: '07-08', name: 'Emancipação Política de Sergipe', type: 'state', states: ['SE'] },
  // Tocantins
  { date: '10-05', name: 'Criação do Estado de Tocantins', type: 'state', states: ['TO'] },
  // Amazonas
  { date: '09-05', name: 'Elevação do Amazonas à Categoria de Província', type: 'state', states: ['AM'] },
  // Acre
  { date: '01-23', name: 'Dia do Evangélico', type: 'state', states: ['AC'] },
  { date: '06-15', name: 'Aniversário do Acre', type: 'state', states: ['AC'] },
  // Goiás
  { date: '10-24', name: 'Pedra Fundamental de Goiânia', type: 'state', states: ['GO'] },
  // Mato Grosso
  { date: '11-20', name: 'Dia da Consciência Negra', type: 'state', states: ['MT'] },
  // Mato Grosso do Sul
  { date: '10-11', name: 'Criação do Estado de Mato Grosso do Sul', type: 'state', states: ['MS'] },
  // Distrito Federal
  { date: '04-21', name: 'Fundação de Brasília', type: 'state', states: ['DF'] },
  { date: '11-30', name: 'Dia do Evangélico', type: 'state', states: ['DF'] },
];

/**
 * Brazilian states list.
 */
export const BRAZILIAN_STATES = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'PR', name: 'Paraná' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'TO', name: 'Tocantins' },
] as const;

export type StateCode = typeof BRAZILIAN_STATES[number]['code'];

/**
 * Gets all holidays (national + state-specific) for a given state.
 */
export function getHolidaysForState(stateCode: string): Holiday[] {
  const nationalHolidays = NATIONAL_HOLIDAYS_2026;
  const stateHolidays = STATE_HOLIDAYS_2026.filter(
    h => h.states?.includes(stateCode.toUpperCase())
  );
  return [...nationalHolidays, ...stateHolidays];
}

/**
 * Checks if a specific date (YYYY-MM-DD) is a holiday for a given state.
 * Returns the holiday info if found, null otherwise.
 */
export function isHoliday(dateStr: string, stateCode: string): Holiday | null {
  const mmdd = dateStr.slice(5); // Extract MM-DD from YYYY-MM-DD
  const holidays = getHolidaysForState(stateCode);
  return holidays.find(h => h.date === mmdd) || null;
}

/**
 * Gets all holidays for a given month and state.
 */
export function getHolidaysForMonth(year: number, month: number, stateCode: string): { date: string; holiday: Holiday }[] {
  const holidays = getHolidaysForState(stateCode);
  const result: { date: string; holiday: Holiday }[] = [];

  for (const holiday of holidays) {
    const [hMonth] = holiday.date.split('-').map(Number);
    if (hMonth === month) {
      const fullDate = `${year}-${holiday.date}`;
      result.push({ date: fullDate, holiday });
    }
  }

  return result;
}
