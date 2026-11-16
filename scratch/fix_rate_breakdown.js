const fs = require('fs');
const path = require('path');

const posFile = path.resolve(__dirname, '../src/app/pos.ts');
let content = fs.readFileSync(posFile, 'utf8');

// Replace getCarBaseRate down to calculateEffectiveDiscount
const oldBlockStart = '  getCarBaseRate(carOrRental?: any): number {';
const oldBlockEnd = '  onDiscountMasterChange(type: \'NONE\' | \'DISABILITY_50\' | \'CUSTOM\') {';

const newBlock = `  getCarBaseRate(carOrRental?: any): number {
    const target = carOrRental || this.selectedCar();
    if (!target) return 1.000;

    const match = this.getMatchingRateObject(target);
    if (match && match.amount !== undefined && match.amount !== null) {
      const amt = Number(match.amount);
      if (!isNaN(amt) && amt > 0) {
        return amt;
      }
    }

    // Fallback if DB rate record not yet loaded: Double Seater is 2 KD, Single Seater is 1 KD
    const r = this.getActiveRental(target);
    const modelName = String(target.model || r?.model || '').trim().toLowerCase();
    const isDouble = modelName.includes('double');
    return isDouble ? 2.000 : 1.000;
  }

  /**
   * Retrieves half-hour rate from Database (Requirement 3):
   * Single Seater: 0.500 KD (from DB rates table where duration = 30)
   * Double Seater: 1.000 KD (from DB rates table where duration = 30)
   */
  getCarHalfHourRate(carOrRental?: any): number {
    const target = carOrRental || this.selectedCar();
    if (!target) return 0.500;

    const activeRates = this.rates().filter(r => r.status === 'ACTIVE' || !r.status);
    const r = this.getActiveRental(target);
    const modelId = target.model_id || target.modelId || r?.model_id || r?.modelId;
    const modelName = String(target.model || r?.model || '').trim().toLowerCase();

    // 1. Match by modelId and duration 30
    let match = activeRates.find(rt => 
      modelId && (rt.model_id === modelId || rt.modelId === modelId) && Number(rt.duration) === 30
    );

    // 2. Match by exact model name and duration 30
    if (!match && modelName) {
      match = activeRates.find(rt => 
        rt.model && String(rt.model).trim().toLowerCase() === modelName && Number(rt.duration) === 30
      );
    }

    // 3. Match by double vs single and duration 30
    if (!match) {
      const isDouble = modelName.includes('double');
      match = activeRates.find(rt => {
        const m = String(rt.model || '').toLowerCase();
        return (isDouble ? m.includes('double') : m.includes('single')) && Number(rt.duration) === 30;
      });
    }

    if (match && match.amount !== undefined && match.amount !== null) {
      const amt = Number(match.amount);
      if (!isNaN(amt) && amt > 0) return amt;
    }

    // Fallback: 50% of base rate
    return this.getCarBaseRate(target) * 0.5;
  }

  /**
   * Pricing Calculation based on Database Rates (Requirements 2 & 3):
   * - Within grace period: 0.000 KD
   * - First hour (up to 60 minutes + grace period): Base rate from DB (1.000 for Single, 2.000 for Double)
   * - Any additional usage within next half-hour billing period:
   *   Single car: KWD 0.500 per half-hour
   *   Double car: KWD 1.000 per half-hour
   */
  calculateRate(): number {
    const car = this.selectedCar();
    if (!car) return 0;
    const r = this.getActiveRental(car);
    if (!r) return 0;

    const start = new Date(r.start_time || r.startTime).getTime();
    const elapsedMins = Math.max(0, Math.floor((this.currentTime.getTime() - start) / 60000));
    const grace = Number(this.gracePeriodMinutes() || 10);

    // Rule 1: Within initial grace period -> 0 KD
    if (elapsedMins <= grace) {
      return 0.000;
    }

    const baseRate = this.getCarBaseRate(car);
    const halfHourRate = this.getCarHalfHourRate(car);

    // Rule 2: First hour (up to 60 minutes + grace period) -> Base rate from DB
    if (elapsedMins <= 60 + grace) {
      return baseRate;
    }

    // Rule 3: Any additional usage within the next half-hour billing period
    const extraMins = elapsedMins - 60 - grace;
    const extraHalfHours = Math.ceil(extraMins / 30);
    return baseRate + (extraHalfHours * halfHourRate);
  }

  /**
   * Detailed rate breakdown for UI display (Database rates driven)
   */
  getRateBreakdown(): { base: number; extra: number; halfHourRate: number; extraHalfHours: number; isWithinGrace: boolean; graceMins: number } {
    const car = this.selectedCar();
    const defaultGrace = Number(this.gracePeriodMinutes() || 10);
    if (!car) return { base: 0, extra: 0, halfHourRate: 0.500, extraHalfHours: 0, isWithinGrace: false, graceMins: defaultGrace };
    const r = this.getActiveRental(car);
    if (!r) return { base: 0, extra: 0, halfHourRate: 0.500, extraHalfHours: 0, isWithinGrace: false, graceMins: defaultGrace };

    const start = new Date(r.start_time || r.startTime).getTime();
    const elapsedMins = Math.max(0, Math.floor((this.currentTime.getTime() - start) / 60000));
    const grace = defaultGrace;

    const baseRate = this.getCarBaseRate(car);
    const halfHourRate = this.getCarHalfHourRate(car);

    if (elapsedMins <= grace) {
      return { base: baseRate, extra: 0, halfHourRate, extraHalfHours: 0, isWithinGrace: true, graceMins: grace };
    }

    if (elapsedMins <= 60 + grace) {
      return { base: baseRate, extra: 0, halfHourRate, extraHalfHours: 0, isWithinGrace: false, graceMins: grace };
    }

    const extraMins = elapsedMins - 60 - grace;
    const extraHalfHours = Math.ceil(extraMins / 30);
    return {
      base: baseRate,
      extra: extraHalfHours * halfHourRate,
      halfHourRate: halfHourRate,
      extraHalfHours: extraHalfHours,
      isWithinGrace: false,
      graceMins: grace
    };
  }

  `;

const startIdx = content.indexOf(oldBlockStart);
const endIdx = content.indexOf(oldBlockEnd);

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + newBlock + content.substring(endIdx);
  console.log('Successfully replaced rate breakdown and half hour rate');
} else {
  console.error('Could not find slice indices:', startIdx, endIdx);
}

fs.writeFileSync(posFile, content, 'utf8');
console.log('Successfully updated pos.ts');
