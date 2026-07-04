import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    buildShopItemMap,
    decideRecolorActions,
    findManagedItem,
    getRandomColor,
    isManagedStallType,
    isShopItem,
    recoloredRideId,
    ShopItem,
} from '../src/recolorLogic';
import type { ShopItemMap } from '../src/recolorLogic';

// The pure decision seam — everything testable with no game API, no mocks. This is the bulk of the suite and the module held to the 100% coverage floor. `recoloredRideId` gets special attention: it's the seam that encodes the 0001 fix (a `ridecreate` must yield the new ride's id, not be ignored).

describe('isShopItem', () => {
    it('accepts each managed shop-item id', () => {
        expect(isShopItem(ShopItem.BALLOON)).toBe(true);
        expect(isShopItem(ShopItem.UMBRELLA)).toBe(true);
        expect(isShopItem(ShopItem.HAT)).toBe(true);
        expect(isShopItem(ShopItem.TSHIRT)).toBe(true);
    });
    it('rejects a non-managed id and the 255 "no item" sentinel', () => {
        expect(isShopItem(1)).toBe(false);
        expect(isShopItem(255)).toBe(false);
    });
});

describe('findManagedItem', () => {
    it('prefers the secondary item when both slots are managed (dual-item stall rule)', () => {
        // The Information Kiosk case: the colored item lives in the secondary slot, so it must win even when the primary is also one of ours.
        expect(findManagedItem(ShopItem.BALLOON, ShopItem.UMBRELLA)).toBe(ShopItem.UMBRELLA);
    });
    it('prefers the secondary even when the primary is an unmanaged item (e.g. map + umbrella)', () => {
        expect(findManagedItem(30, ShopItem.UMBRELLA)).toBe(ShopItem.UMBRELLA);
    });
    it('falls back to the primary when the secondary is not managed', () => {
        expect(findManagedItem(ShopItem.HAT, 255)).toBe(ShopItem.HAT);
    });
    it('returns undefined when neither slot is managed', () => {
        expect(findManagedItem(255, 255)).toBeUndefined();
    });
});

describe('isManagedStallType', () => {
    it('accepts the managed stall ride-type ids', () => {
        expect(isManagedStallType(32)).toBe(true);
        expect(isManagedStallType(35)).toBe(true);
    });
    it('rejects other ride types', () => {
        expect(isManagedStallType(0)).toBe(false);
        expect(isManagedStallType(31)).toBe(false);
        expect(isManagedStallType(36)).toBe(false);
    });
});

describe('buildShopItemMap', () => {
    it('builds a record keyed by every managed shop item', () => {
        const map = buildShopItemMap((item) => item.defaultColor);
        expect(map).toEqual({
            [ShopItem.HAT]: 28,
            [ShopItem.TSHIRT]: 28,
            [ShopItem.UMBRELLA]: 28,
            [ShopItem.BALLOON]: 7,
        });
    });
});

describe('getRandomColor', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('maps the RNG floor to colour 0', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        expect(getRandomColor()).toBe(0);
    });
    it('maps the RNG ceiling to colour 31 (range is [0, 32))', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.999999);
        expect(getRandomColor()).toBe(31);
    });
});

describe('decideRecolorActions', () => {
    const colors: ShopItemMap<number> = buildShopItemMap(() => 12);
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('uses the injected RNG and flags "random" on when the item is random', () => {
        const randomness = buildShopItemMap(() => true);
        const actions = decideRecolorActions(ShopItem.HAT, colors, randomness, () => 5);
        expect(actions).toEqual([
            { type: 0, value: 5, index: 0 },
            { type: 8, value: 1, index: 0 },
        ]);
    });

    it('uses the configured colour and flags "random" off when the item is fixed', () => {
        const randomness = buildShopItemMap(() => false);
        const actions = decideRecolorActions(ShopItem.HAT, colors, randomness);
        expect(actions).toEqual([
            { type: 0, value: 12, index: 0 },
            { type: 8, value: 0, index: 0 },
        ]);
    });

    it('defaults the RNG to getRandomColor (real Math.random) when none is injected', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const randomness = buildShopItemMap(() => true);
        const actions = decideRecolorActions(ShopItem.HAT, colors, randomness);
        expect(actions[0]).toEqual({ type: 0, value: 0, index: 0 });
    });
});

describe('recoloredRideId', () => {
    // The 0001 regression seam: a ridecreate must surface the new ride's id (from the result) rather than be ignored, which was the whole bug.
    it('reads the new ride id from the result on ridecreate (the 0001 fix)', () => {
        expect(recoloredRideId({ action: 'ridecreate', result: { ride: 7 } } as never)).toBe(7);
    });
    it('reads the ride id from the args on ridesetsetting', () => {
        expect(recoloredRideId({ action: 'ridesetsetting', args: { ride: 9 } } as never)).toBe(9);
    });
    it('ignores any other action', () => {
        expect(recoloredRideId({ action: 'ridesetprice', args: { ride: 3 } } as never)).toBeUndefined();
    });
});
