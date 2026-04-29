import config from './config';

const ShopItem = {
    BALLOON: 0,
    UMBRELLA: 4,
    HAT: 18,
    TSHIRT: 20,
} as const;
type ShopItem = typeof ShopItem[keyof typeof ShopItem];

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
    { shopItem: ShopItem.HAT,      label: 'HATS:',      widgetPrefix: 'hat', defaultColor: 28 },
    { shopItem: ShopItem.TSHIRT,   label: 'T-SHIRTS:',  widgetPrefix: 'ts',  defaultColor: 28 },
    { shopItem: ShopItem.UMBRELLA, label: 'UMBRELLAS:', widgetPrefix: 'umb', defaultColor: 28 },
    { shopItem: ShopItem.BALLOON,  label: 'BALLOONS:',  widgetPrefix: 'bal', defaultColor: 7  },
];

type ShopItemMap<T> = Record<ShopItem, T>;

function buildShopItemMap<T>(value: (item: ManagedItem) => T): ShopItemMap<T> {
    const out = {} as ShopItemMap<T>;
    for (const item of MANAGED_ITEMS) {
        out[item.shopItem] = value(item);
    }
    return out;
}

const colors: ShopItemMap<number> = buildShopItemMap((i) => i.defaultColor);
const randomness: ShopItemMap<boolean> = buildShopItemMap(() => true);

export const pluginName = config.getString('MOD_NAME');
export let pluginEnabled = true;

let pluginWindow: Window | undefined;
let actionSubscription: IDisposable | undefined;

function isShopItem(id: number): id is ShopItem {
    for (const item of MANAGED_ITEMS) {
        if (item.shopItem === id) return true;
    }
    return false;
}

function getRandomColor(): number {
    return Math.floor(Math.random() * 32);
}

// A stall has a primary `shopItem` and optional `shopItemSecondary` (255 if
// none). Either may be one of our managed items; the secondary takes priority
// because dual-item stalls (e.g. the Information Kiosk's map + umbrella) are
// the case where the secondary is the colored one.
function findManagedItem(item1Id: number, item2Id: number): ShopItem | undefined {
    if (isShopItem(item2Id)) return item2Id;
    if (isShopItem(item1Id)) return item1Id;
    return undefined;
}

function recolorStall(ride: Ride): void {
    const managed = findManagedItem(ride.object.shopItem, ride.object.shopItemSecondary);
    if (managed === undefined) return;

    const isRandom = randomness[managed];
    const colorValue = isRandom ? getRandomColor() : colors[managed];

    context.executeAction('ridesetappearance', {
        ride: ride.id,
        type: APPEARANCE_BODY_COLOR,
        value: colorValue,
        index: 0,
    });
    context.executeAction('ridesetappearance', {
        ride: ride.id,
        type: APPEARANCE_SELLING_ITEM_COLOR_IS_RANDOM,
        value: isRandom ? 1 : 0,
        index: 0,
    });
}

function isWindowOpen(w: Window | undefined): w is Window {
    return w !== undefined && w.title !== '';
}

function refreshWindowState(): void {
    if (!isWindowOpen(pluginWindow)) return;
    for (const item of MANAGED_ITEMS) {
        pluginWindow.findWidget<ColourPickerWidget>(`${item.widgetPrefix}_picker`).colour =
            colors[item.shopItem];
        pluginWindow.findWidget<CheckboxWidget>(`${item.widgetPrefix}_random`).isChecked =
            randomness[item.shopItem];
    }
}

function setEnabled(enabled: boolean): void {
    pluginEnabled = enabled;
    if (pluginEnabled) {
        if (actionSubscription === undefined) initialize();
    } else {
        destroy();
    }
}

function applyToAllExistingStalls(): void {
    for (const ride of map.rides) {
        if (MANAGED_STALL_RIDE_TYPES.indexOf(ride.type) !== -1) {
            recolorStall(ride);
        }
    }
}

function buildWidgets(): WidgetDesc[] {
    const widgets: WidgetDesc[] = [
        {
            type: 'checkbox',
            name: 'manage',
            x: 10,
            y: 20,
            width: 300,
            height: 20,
            isChecked: pluginEnabled,
            text: 'Manage item colors for all new stalls',
            onChange: setEnabled,
        },
    ];

    for (let i = 0; i < MANAGED_ITEMS.length; i += 1) {
        const item = MANAGED_ITEMS[i];
        const y = 53 + i * 20;
        widgets.push(
            {
                type: 'label',
                name: `${item.widgetPrefix}_label`,
                x: 15,
                y,
                width: 80,
                height: 20,
                text: item.label,
            },
            {
                type: 'colourpicker',
                name: `${item.widgetPrefix}_picker`,
                x: 100,
                y,
                width: 20,
                height: 20,
                colour: colors[item.shopItem],
                onChange: (c: number) => { colors[item.shopItem] = c; },
            },
            {
                type: 'checkbox',
                name: `${item.widgetPrefix}_random`,
                x: 130,
                y: y - 3,
                width: 170,
                height: 20,
                isChecked: randomness[item.shopItem],
                text: 'Random for every stall',
                onChange: (checked: boolean) => { randomness[item.shopItem] = checked; },
            },
        );
    }

    widgets.push({
        type: 'button',
        name: 'apply_all',
        x: 50,
        y: 150,
        width: 200,
        height: 20,
        text: 'Apply to all existing stalls',
        onClick: applyToAllExistingStalls,
    });

    return widgets;
}

export function openMainWindow(): void {
    if (pluginWindow !== undefined) {
        pluginWindow.close();
    }
    pluginWindow = ui.openWindow({
        classification: pluginName,
        title: pluginName,
        width: 300,
        height: 190,
        widgets: buildWidgets(),
    });
}

export function initialize(): void {
    actionSubscription = context.subscribe('action.execute', (e) => {
        if (e.action !== 'ridesetsetting') return;
        const args = e.args as RideSetSettingArgs;
        const ride = map.getRide(args.ride);
        if (!ride || MANAGED_STALL_RIDE_TYPES.indexOf(ride.type) === -1) return;
        recolorStall(ride);
        refreshWindowState();
    });
}

function destroy(): void {
    actionSubscription?.dispose();
    actionSubscription = undefined;
    if (pluginWindow !== undefined) {
        refreshWindowState();
        pluginWindow.close();
    }
}
