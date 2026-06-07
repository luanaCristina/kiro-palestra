import { getHolidaysForState, isHoliday, getHolidaysForMonth } from '../../src/modules/holidays';

describe('holidays module', () => {
  describe('getHolidaysForState', () => {
    it('returns national + PE state holidays for PE', () => {
      const holidays = getHolidaysForState('PE');

      // Should include all 12 national holidays
      const nationalHolidays = holidays.filter(h => h.type === 'national');
      expect(nationalHolidays).toHaveLength(12);

      // Should include PE-specific state holidays
      const stateHolidays = holidays.filter(h => h.type === 'state');
      expect(stateHolidays.length).toBeGreaterThan(0);

      // Verify specific PE holidays are present
      const peHolidayNames = stateHolidays.map(h => h.name);
      expect(peHolidayNames).toContain('Revolução Pernambucana de 1817');
      expect(peHolidayNames).toContain('São João');
    });
  });

  describe('isHoliday', () => {
    it('returns Confraternização Universal for 2026-01-01 in any state', () => {
      const result = isHoliday('2026-01-01', 'SP');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Confraternização Universal');
      expect(result!.type).toBe('national');
    });

    it('returns Aniversário de São Paulo for 2026-01-25 in SP', () => {
      const result = isHoliday('2026-01-25', 'SP');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Aniversário de São Paulo');
      expect(result!.type).toBe('state');
    });

    it('returns null for 2026-01-25 in RJ (not a holiday there)', () => {
      const result = isHoliday('2026-01-25', 'RJ');

      expect(result).toBeNull();
    });

    it('returns null for 2026-03-10 (not a holiday in any state)', () => {
      const result = isHoliday('2026-03-10', 'SP');

      expect(result).toBeNull();
    });
  });

  describe('getHolidaysForMonth', () => {
    it('returns January holidays for SP including national and state holidays', () => {
      const holidays = getHolidaysForMonth(2026, 1, 'SP');

      expect(holidays.length).toBeGreaterThan(0);

      // Should include Confraternização Universal (01-01)
      const newYear = holidays.find(h => h.holiday.name === 'Confraternização Universal');
      expect(newYear).toBeDefined();
      expect(newYear!.date).toBe('2026-01-01');

      // Should include Aniversário de São Paulo (01-25)
      const spBirthday = holidays.find(h => h.holiday.name === 'Aniversário de São Paulo');
      expect(spBirthday).toBeDefined();
      expect(spBirthday!.date).toBe('2026-01-25');
    });
  });
});
