export class DateUtils {
    static addMonths(date: Date, months: number): Date {
      const result = new Date(date);
      result.setMonth(result.getMonth() + months);
      return result;
    }
  
    static isExpired(expirationDate: Date | null): boolean {
      if (!expirationDate) return false;
      return expirationDate < new Date();
    }
  }