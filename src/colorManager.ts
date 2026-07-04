import { MOD_NAME } from './pluginMeta';
import {
    buildShopItemMap,
    decideRecolorActions,
    findManagedItem,
    isManagedStallType,
    MANAGED_ITEMS,
    recoloredRideId,
} from './recolorLogic';
import type { ShopItemMap } from './recolorLogic';

// The game-coupled glue for the plugin: the mutable per-item state, the recolor side effect (which calls `context.executeAction`), the settings window, and the `action.execute` subscription. The pure decisions this leans on live in recolorLogic.ts. This module isn't in the coverage allowlist — it's exercised additively by the contract tests (test/colorManager.behavior.test.ts) and, for the window/UI parts, by the manual openrct2-probe live bridge.

const colors: ShopItemMap<number> = buildShopItemMap((i) => i.defaultColor);
const randomness: ShopItemMap<boolean> = buildShopItemMap(() => true);

export const pluginName = MOD_NAME;
export let pluginEnabled = true;

let pluginWindow: Window | undefined;
let actionSubscription: IDisposable | undefined;

function recolorStall(ride: Ride): void {
    const managed = findManagedItem(ride.object.shopItem, ride.object.shopItemSecondary);
    if (managed === undefined) return;

    for (const action of decideRecolorActions(managed, colors, randomness)) {
        context.executeAction('ridesetappearance', { ride: ride.id, ...action });
    }
}

function isWindowOpen(w: Window | undefined): w is Window {
    return w !== undefined && w.title !== '';
}

function refreshWindowState(): void {
    if (!isWindowOpen(pluginWindow)) return;
    for (const item of MANAGED_ITEMS) {
        pluginWindow.findWidget<ColourPickerWidget>(`${item.widgetPrefix}_picker`).colour = colors[item.shopItem];
        pluginWindow.findWidget<CheckboxWidget>(`${item.widgetPrefix}_random`).isChecked = randomness[item.shopItem];
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
        if (isManagedStallType(ride.type)) {
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
                onChange: (c: number) => {
                    colors[item.shopItem] = c;
                },
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
                onChange: (checked: boolean) => {
                    randomness[item.shopItem] = checked;
                },
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
        const rideId = recoloredRideId(e);
        if (rideId === undefined) return;
        const ride = map.getRide(rideId);
        if (!ride || !isManagedStallType(ride.type)) return;
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
