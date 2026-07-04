// Pure recolor-decision logic for the Colors Manager plugin. Everything here can be decided WITHOUT touching the OpenRCT2 API — the managed-item table, the item-matching rule, the action→ride-id mapping, and the colour/randomness decision. It calls no game globals (it references ambient *types* only, which erase at runtime), so it imports and unit-tests cleanly under Node with no mocks. The game-coupled glue that actually calls `context`/`map`/`ui` lives in colorManager.ts.

const ShopItem = {
    BALLOON: 0,
    UMBRELLA: 4,
    HAT: 18,
    TSHIRT: 20,
} as const;
type ShopItem = (typeof ShopItem)[keyof typeof ShopItem];

// OpenRCT2 ride-type IDs for the stalls whose items we recolor.
// Matches the upstream RIDE_TYPE_* enum.
const MANAGED_STALL_RIDE_TYPES: readonly number[] = [32, 35];

// `args.type` values for the 'ridesetappearance' game action. See
// RideSetAppearanceType in OpenRCT2's RideSetAppearanceAction.h.
const APPEARANCE_BODY_COLOR = 0;
const APPEARANCE_SELLING_ITEM_COLOR_IS_RANDOM = 8;

interface ManagedItem {
    readonly shopItem: ShopItem;
    readonly label: string;
    readonly widgetPrefix: string;
    readonly defaultColor: number;
}

const MANAGED_ITEMS: readonly ManagedItem[] = [
    { shopItem: ShopItem.HAT, label: 'HATS:', widgetPrefix: 'hat', defaultColor: 28 },
    { shopItem: ShopItem.TSHIRT, label: 'T-SHIRTS:', widgetPrefix: 'ts', defaultColor: 28 },
    { shopItem: ShopItem.UMBRELLA, label: 'UMBRELLAS:', widgetPrefix: 'umb', defaultColor: 28 },
    { shopItem: ShopItem.BALLOON, label: 'BALLOONS:', widgetPrefix: 'bal', defaultColor: 7 },
];

type ShopItemMap<T> = Record<ShopItem, T>;

function buildShopItemMap<T>(value: (item: ManagedItem) => T): ShopItemMap<T> {
    const out = {} as ShopItemMap<T>;
    for (const item of MANAGED_ITEMS) {
        out[item.shopItem] = value(item);
    }
    return out;
}

function isShopItem(id: number): id is ShopItem {
    for (const item of MANAGED_ITEMS) {
        if (item.shopItem === id) return true;
    }
    return false;
}

function getRandomColor(): number {
    return Math.floor(Math.random() * 32);
}

// A stall has a primary `shopItem` and optional `shopItemSecondary` (255 if none). Either may be one of our managed items; the secondary takes priority because dual-item stalls (e.g. the Information Kiosk's map + umbrella) are the case where the secondary is the colored one.
function findManagedItem(item1Id: number, item2Id: number): ShopItem | undefined {
    if (isShopItem(item2Id)) return item2Id;
    if (isShopItem(item1Id)) return item1Id;
    return undefined;
}

function isManagedStallType(rideType: number): boolean {
    return MANAGED_STALL_RIDE_TYPES.indexOf(rideType) !== -1;
}

// The args for one 'ridesetappearance' game action, minus the ride id (which the caller fills in). `index` is always 0 for these stall appearances.
interface AppearanceAction {
    readonly type: number;
    readonly value: number;
    readonly index: 0;
}

// Decide the two 'ridesetappearance' actions for a managed item: the body colour (a random draw when the item is set to random, otherwise the configured colour) and the "colour is random" flag. The RNG is injected so callers/tests can make it deterministic; it defaults to the real `getRandomColor`.
function decideRecolorActions(
    managed: ShopItem,
    colors: ShopItemMap<number>,
    randomness: ShopItemMap<boolean>,
    rng: () => number = getRandomColor,
): AppearanceAction[] {
    const isRandom = randomness[managed];
    const colorValue = isRandom ? rng() : colors[managed];
    return [
        { type: APPEARANCE_BODY_COLOR, value: colorValue, index: 0 },
        { type: APPEARANCE_SELLING_ITEM_COLOR_IS_RANDOM, value: isRandom ? 1 : 0, index: 0 },
    ];
}

// The ride we recolor comes from a different place depending on the action: `ridecreate` (a stall was just built) reports the new ride's id only in its result, whereas `ridesetsetting` (an existing stall's setting changed) carries it in the args. Any other action isn't ours to react to.
function recoloredRideId(e: GameActionEventArgs): number | undefined {
    if (e.action === 'ridecreate') return (e.result as RideCreateActionResult).ride;
    if (e.action === 'ridesetsetting') return (e.args as RideSetSettingArgs).ride;
    return undefined;
}

export {
    ShopItem,
    MANAGED_ITEMS,
    buildShopItemMap,
    isShopItem,
    getRandomColor,
    findManagedItem,
    isManagedStallType,
    decideRecolorActions,
    recoloredRideId,
};
export type { ManagedItem, ShopItemMap, AppearanceAction };
