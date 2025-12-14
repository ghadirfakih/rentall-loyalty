export const loyaltyConfig = {
  pointsPerDay: parseInt(process.env.POINTS_PER_DAY || '20', 10),
  pointsPerMile: parseFloat(process.env.POINTS_PER_MILE || '0.2'),
  expirationMonths: parseInt(process.env.POINTS_EXPIRATION_MONTHS || '12', 10),
  tierThresholds: {
    BRONZE: parseInt(process.env.TIER_BRONZE_MIN || '0', 10),
    SILVER: parseInt(process.env.TIER_SILVER_MIN || '1000', 10),
    GOLD: parseInt(process.env.TIER_GOLD_MIN || '5000', 10),
    PLATINUM: parseInt(process.env.TIER_PLATINUM_MIN || '10000', 10),
  },
  tierMultipliers: {
    BRONZE: 1.0,
    SILVER: 1.25,
    GOLD: 1.5,
    PLATINUM: 2.0,
  },
};