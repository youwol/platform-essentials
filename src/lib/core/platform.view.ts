import {
    attr$,
    childrenAppendOnly$,
    Stream$,
    VirtualDOM,
} from '@youwol/flux-view'
import { filter, map } from 'rxjs/operators'
import { PlatformBannerView } from './platform-banner.view'
import { PlatformSettingsStore } from './platform-settings'
import { PlatformState } from './platform.state'
import { RunningApp } from './running-app.view'

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

                children: [new RunningAppView({ state: this.state })],
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
