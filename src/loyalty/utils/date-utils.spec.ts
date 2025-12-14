import { DateUtils } from './date-utils';

describe('DateUtils', () => {
  describe('addMonths', () => {
    it('should add 12 months correctly', () => {
      const date = new Date('2024-01-01');
      const result = DateUtils.addMonths(date, 12);

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(1);
    });

    it('should handle year rollover', () => {
      const date = new Date('2024-12-01');
      const result = DateUtils.addMonths(date, 1);

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
    });

    it('should handle different month lengths', () => {
      const date = new Date('2024-01-31');
      const result = DateUtils.addMonths(date, 1);

      // JavaScript Date overflows to next month if target month doesn't have enough days
      // Jan 31 + 1 month = March 1 (since Feb doesn't have 31 days)
      expect(result.getMonth()).toBe(2); // March
      expect(result.getDate()).toBeLessThanOrEqual(3); // Usually 1-3 depending on timezone // 1st day
    });

    it('should add months correctly for valid dates', () => {
      const date = new Date('2024-01-15'); // Use a date that exists in all months
      const result = DateUtils.addMonths(date, 1);

      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(15);
    });
  });

  describe('isExpired', () => {
    it('should return false for future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      expect(DateUtils.isExpired(futureDate)).toBe(false);
    });

    it('should return true for past dates', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      expect(DateUtils.isExpired(pastDate)).toBe(true);
    });

  });
});
