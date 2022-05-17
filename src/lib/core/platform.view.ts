import {
    attr$,
    child$,
    children$,
    childrenAppendOnly$,
    Stream$,
    VirtualDOM,
} from '@youwol/flux-view'
import { filter, map } from 'rxjs/operators'
import { PlatformBannerView } from './platform-banner.view'
import { PlatformSettingsStore } from './platform-settings'
import { PlatformState } from './platform.state'
import { RunningApp } from './running-app.view'
import {
    ApplicationInfo,
    defaultOpeningApp$,
    tryOpenWithDefault$,
} from './installer'
import { Favorites } from './favorites'
import { TreedbBackend } from '@youwol/http-clients'
import { AnyItemNode, ItemNode } from '../explorer'

export class PlatformView implements VirtualDOM {
    public readonly class = 'h-100 w-100 d-flex flex-column fv-text-primary'
    public readonly state = new PlatformState()
    public readonly children: VirtualDOM[]
    public readonly style: Stream$<
        { [_key: string]: string },
        { [_key: string]: string }
    >

    constructor() {
        this.style = attr$(
            PlatformSettingsStore.settings$.pipe(
                map((settings) => settings.appearance.desktopStyle),
            ),
            (style: { [_key: string]: string }) => style,
        )

        this.children = [
            new PlatformBannerView({
                state: this.state,
                class: 'fv-bg-background',
                style: {
                    background:
                        'linear-gradient(rgba(0,0,0,0.9), rgba(0,0,0,0.7))',
                    zIndex: 0,
                },
            }),
            {
                class: 'd-flex align-items-center h-100 w-100',
                children: [
                    new RunningAppView({ state: this.state }),
                    child$(this.state.runningApplication$, (runningApp) => {
                        return runningApp ? {} : new DesktopFavoritesView()
                    }),
                ],
            },
        ]
    }
}

export class RunningAppView implements VirtualDOM {
    public readonly class: Stream$<RunningApp, string>
    public readonly state: PlatformState
    public readonly children

    cacheRunningAppsView = {}

    constructor(params: { state: PlatformState }) {
        Object.assign(this, params)
        this.class = attr$(this.state.runningApplication$, (app) =>
            app == undefined ? 'd-none' : 'h-100 flex-grow-1 d-flex',
        )
        this.children = childrenAppendOnly$(
            this.state.runningApplication$.pipe(
                filter(
                    (app) =>
                        app &&
                        this.cacheRunningAppsView[app.instanceId] == undefined,
                ),
                map((app) => [app]),
            ),
            (runningApp: RunningApp) => {
                const view = runningApp.view
                this.cacheRunningAppsView[runningApp.instanceId] = view
                return view
            },
        )
    }
}

export class DesktopFavoritesView implements VirtualDOM {
    public readonly class = 'w-100 h-100 p-2'
    public readonly children: VirtualDOM[]

    constructor() {
        this.children = [
            {
                class: 'w-100 h-100 d-flex flex-wrap',
                children: children$(Favorites.getDesktopItems$(), (items) => {
                    return items.map((item) => {
                        return new DesktopFavoriteView({
                            entityResponse: item,
                        })
                    })
                }),
            },
        ]
    }
}

export class DesktopFavoriteView implements VirtualDOM {
    public readonly class =
        'rounded p-2 d-flex flex-column align-items-center fv-pointer fv-hover-border-focus'
    public readonly style = {
        width: 'fit-content',
        height: 'fit-content',
        backgroundColor: 'rgba(0,0,0,0.5)',
    }
    public readonly itemNode: AnyItemNode
    public readonly entityResponse: TreedbBackend.GetEntityResponse
    public readonly children: VirtualDOM[]
    public readonly defaultOpeningApp$
    public readonly ondblclick = () => {
        tryOpenWithDefault$(this.itemNode).subscribe()
    }
    constructor(params: { entityResponse: TreedbBackend.GetEntityResponse }) {
        Object.assign(this, params)
        const itemResponse = this.entityResponse
            .entity as TreedbBackend.GetItemResponse
        this.itemNode = ItemNode.fromTreedbResponse(itemResponse)
        this.defaultOpeningApp$ = defaultOpeningApp$(this.itemNode)
        this.children = [
            child$(
                this.defaultOpeningApp$,
                (defaultResp: { appInfo: ApplicationInfo } | undefined) => {
                    if (!defaultResp) {
                        return { class: 'fas fa-file fa-2x' }
                    }
                    return defaultResp.appInfo.graphics.appIcon
                },
            ),
            {
                innerText: this.entityResponse.entity.name,
            },
        ]
    }
}
