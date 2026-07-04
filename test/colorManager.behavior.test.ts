import Mock from 'openrct2-mocks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialize } from '../src/colorManager';
import { ShopItem } from '../src/recolorLogic';

// Contract tests for the plugin's one job: recolor a managed stall when the game tells us one appeared or changed. These drive the real subscription through OpenRCT2-Mocks (context/map stubs) and assert the resulting `ridesetappearance` actions — the thing the pure seam can verify the ingredients of but never the actual side effect. Kept deliberately few and framed as the plugin's promises, not its internal wiring. NOTE: whether `ride.object.shopItem` is populated at ridecreate execute time is unmockable here (we hand-feed the object) — that timing truth is the manual openrct2-probe live bridge's job.

// The plugin reads only these two fields off `ride.object`; a partial stand-in is enough.
function stall(id: number, type: number, shopItem: number, shopItemSecondary = 255): Ride {
    return Mock.ride({ id, type, object: { shopItem, shopItemSecondary } as never });
}

// Fire the plugin's `action.execute` handler the way the game would, by invoking the callback the plugin registered on the mocked context.
function dispatch(context: ReturnType<typeof Mock.context>, event: object): void {
    const subscription = context.subscriptions.find((s) => s.hook === 'action.execute');
    expect(subscription, 'plugin should have subscribed to action.execute').toBeDefined();
    subscription!.callback(event);
}

describe('recolor-on-action behavior', () => {
    let executeAction: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Pin the RNG so the random-colour body action has a deterministic value (managed items default to random=on).
        vi.spyOn(Math, 'random').mockReturnValue(0);
        executeAction = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    function arm(rides: Ride[]): ReturnType<typeof Mock.context> {
        const context = Mock.context({ executeAction });
        vi.stubGlobal('context', context);
        vi.stubGlobal('map', Mock.map({ rides }));
        initialize();
        return context;
    }

    it('recolors a newly-built managed stall (ridecreate → two ridesetappearance actions)', () => {
        // The permanent 0001-class guard: a stall built (ridecreate) must actually get recolored.
        const context = arm([stall(5, 32, ShopItem.HAT)]);

        dispatch(context, { action: 'ridecreate', result: { ride: 5 } });

        expect(executeAction).toHaveBeenCalledTimes(2);
        expect(executeAction).toHaveBeenNthCalledWith(1, 'ridesetappearance', {
            ride: 5,
            type: 0,
            value: 0,
            index: 0,
        });
        expect(executeAction).toHaveBeenNthCalledWith(2, 'ridesetappearance', {
            ride: 5,
            type: 8,
            value: 1,
            index: 0,
        });
    });

    it('leaves a non-managed ride type alone on ridecreate', () => {
        const context = arm([stall(5, 7, ShopItem.HAT)]);

        dispatch(context, { action: 'ridecreate', result: { ride: 5 } });

        expect(executeAction).not.toHaveBeenCalled();
    });

    it('also recolors on ridesetsetting for a managed stall (price change, etc.)', () => {
        const context = arm([stall(5, 32, ShopItem.HAT)]);

        dispatch(context, { action: 'ridesetsetting', args: { ride: 5 } });

        expect(executeAction).toHaveBeenCalledTimes(2);
    });
});
