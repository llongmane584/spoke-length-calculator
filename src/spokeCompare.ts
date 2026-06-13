export const SPOKE_TOLERANCE_MM = 1;

export interface WheelSpec {
  label: string;
  leftLength: number;
  rightLength: number;
  spokeCount: number;
}

export interface BuyItem {
  length: number;
  count: number;
  side: 'left' | 'right';
}

export interface CompareResult {
  totalNeeded: number;
  reuseCount: number;
  leftoverCount: number;
  buyItems: BuyItem[];
  combinable: boolean;
}

export function compareWheels(
  current: WheelSpec,
  target: WheelSpec,
  toleranceMm = SPOKE_TOLERANCE_MM,
): CompareResult {
  const perSideCurrent = current.spokeCount / 2;
  const perSideTarget = target.spokeCount / 2;

  // Supply pool: [leftLength x perSideCurrent, rightLength x perSideCurrent]
  const supply = [
    { length: current.leftLength, count: perSideCurrent },
    { length: current.rightLength, count: perSideCurrent },
  ];

  // Demand groups: left and right of target wheel
  const demands: { length: number; count: number; side: 'left' | 'right' }[] = [
    { length: target.leftLength, count: perSideTarget, side: 'left' },
    { length: target.rightLength, count: perSideTarget, side: 'right' },
  ];

  const canReuse = (supplyLength: number, demandLength: number): boolean =>
    Math.abs(supplyLength - demandLength) <= toleranceMm;

  // Try all orderings of demand groups; pick the one that maximises reuse
  let bestReuse = -1;
  let bestSupplyAfter: { length: number; count: number }[] = [];
  let bestDemandShortfall: { length: number; count: number; side: 'left' | 'right' }[] = [];

  const orders = [
    [0, 1],
    [1, 0],
  ];

  for (const order of orders) {
    const localSupply = supply.map(s => ({ ...s }));
    const shortfalls: { length: number; count: number; side: 'left' | 'right' }[] = [];
    let totalReuse = 0;

    for (const di of order) {
      const demand = demands[di];
      let remaining = demand.count;

      for (const s of localSupply) {
        if (remaining <= 0) break;
        if (!canReuse(s.length, demand.length)) continue;
        const used = Math.min(s.count, remaining);
        s.count -= used;
        remaining -= used;
        totalReuse += used;
      }

      if (remaining > 0) {
        shortfalls.push({ length: demand.length, count: remaining, side: demand.side });
      }
    }

    if (totalReuse > bestReuse) {
      bestReuse = totalReuse;
      bestSupplyAfter = localSupply;
      bestDemandShortfall = shortfalls;
    }
  }

  const totalNeeded = target.spokeCount;
  const reuseCount = bestReuse;
  const leftoverCount = bestSupplyAfter.reduce((sum, s) => sum + s.count, 0);
  const buyItems: BuyItem[] = bestDemandShortfall
    .filter(s => s.count > 0)
    .map(s => ({ length: s.length, count: s.count, side: s.side }));

  const combinable = Math.abs(target.leftLength - target.rightLength) <= toleranceMm;

  return { totalNeeded, reuseCount, leftoverCount, buyItems, combinable };
}
