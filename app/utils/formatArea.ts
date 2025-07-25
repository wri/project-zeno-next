/**
 * Formats area values (in km²) with appropriate decimal places and locale formatting
 * - Values < 0.01: 3-4 decimal places (e.g., "0.001", "0.0005")
 * - Values 0.01-0.99: 2 decimal places (e.g., "0.15")
 * - Values 1-99.99: 1 decimal place (e.g., "15.7")
 * - Values >= 100: 0 decimal places (e.g., "1,250")
 */
export function formatArea(areaKm2: number): string {
  if (areaKm2 < 0.01) {
    // For very small areas, show enough decimal places to avoid "0.00"
    return areaKm2.toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 4,
    });
  } else if (areaKm2 < 1) {
    return areaKm2.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else if (areaKm2 < 100) {
    return areaKm2.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  } else {
    return areaKm2.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
}

/**
 * Formats area with units (km²) for display
 */
export function formatAreaWithUnits(areaKm2: number): string {
  return `${formatArea(areaKm2)} km²`;
}
