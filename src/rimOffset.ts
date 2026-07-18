export interface RimOffsetDimensions {
  flangeDistanceLeft: number;
  flangeDistanceRight: number;
  rimOffset: number;
}

export type RimOffsetAssessment =
  | { kind: 'none' }
  | { kind: 'directionIndeterminate' }
  | {
    kind: 'worsensAsymmetry';
    originalDifference: number;
    effectiveDifference: number;
  };

const COMPARISON_TOLERANCE_MM = 1e-9;

export const getEffectiveFlangeDistances = (
  dimensions: RimOffsetDimensions,
): { left: number; right: number } => {
  const { flangeDistanceLeft, flangeDistanceRight, rimOffset } = dimensions;

  if (flangeDistanceLeft > flangeDistanceRight) {
    return {
      left: flangeDistanceLeft - rimOffset,
      right: flangeDistanceRight + rimOffset,
    };
  }

  if (flangeDistanceRight > flangeDistanceLeft) {
    return {
      left: flangeDistanceLeft + rimOffset,
      right: flangeDistanceRight - rimOffset,
    };
  }

  return {
    left: flangeDistanceLeft,
    right: flangeDistanceRight,
  };
};

export const assessRimOffset = (dimensions: RimOffsetDimensions): RimOffsetAssessment => {
  const { flangeDistanceLeft, flangeDistanceRight, rimOffset } = dimensions;

  if (rimOffset <= 0) {
    return { kind: 'none' };
  }

  const originalDifference = Math.abs(flangeDistanceLeft - flangeDistanceRight);

  if (originalDifference === 0) {
    return { kind: 'directionIndeterminate' };
  }

  const effectiveDistances = getEffectiveFlangeDistances(dimensions);
  const effectiveDifference = Math.abs(effectiveDistances.left - effectiveDistances.right);

  if (effectiveDifference - originalDifference > COMPARISON_TOLERANCE_MM) {
    return {
      kind: 'worsensAsymmetry',
      originalDifference,
      effectiveDifference,
    };
  }

  return { kind: 'none' };
};
