import {attr$, childrenAppendOnly$, Stream$, VirtualDOM} from "@youwol/flux-view";
import {PlatformState} from "./platform.state";
import {PlatformSettingsStore} from "./platform-settings";
import {filter, map} from "rxjs/operators";
import {PlatformBannerView} from "./platform-banner.view";
import {RunningApp} from "./running-app.view";


export class PlatformView implements VirtualDOM {

    public readonly class = 'h-100 w-100 d-flex flex-column fv-text-primary'
    public readonly state = new PlatformState()
    public readonly children: VirtualDOM[]
    public readonly style: Stream$<{ [_key: string]: string }, { [_key: string]: string }>


    constructor() {

        this.style = attr$(
            PlatformSettingsStore.settings$.pipe(map(settings => settings.appearance.desktopStyle)),
            (style: { [_key: string]: string }) => style
        )

        this.children = [
            new PlatformBannerView({state: this.state, class: 'fv-bg-background'} as any),
            {
                class: 'd-flex align-items-center h-100 w-100',

                children: [
                    new RunningAppView({state: this.state})
                ]
            }
        ]
    }
}


export class RunningAppView implements VirtualDOM {

    public readonly class: any
    public readonly state: PlatformState
    public readonly children: any

    cacheRunningAppsView = {}

    constructor(params: { state: PlatformState }) {
        Object.assign(this, params)
        this.class = attr$(
            this.state.runningApplication$,
            (app) => app == undefined ? 'd-none' : 'h-100 flex-grow-1 d-flex'
        )
        this.children = childrenAppendOnly$(
            this.state.runningApplication$.pipe(
                filter(app => app && this.cacheRunningAppsView[app.instanceId] == undefined),
                map(app => [app])
            ),
            (runningApp: RunningApp) => {
                let view = runningApp.view
                this.cacheRunningAppsView[runningApp.instanceId] = view
                return view
            }
        )
    }
}