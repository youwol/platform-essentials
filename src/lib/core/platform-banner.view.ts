import { child$, VirtualDOM } from '@youwol/flux-view'
import { defaultUserMenu, YouwolBannerView } from '../top-banner'
import { PlatformState } from './platform.state'
import { RunningApp } from './running-app.view'
import { TopBanner } from '..'

/**
 * Regular top banner of the application (no application running)
 */
class RegularBannerView extends YouwolBannerView {
    constructor(state: PlatformState) {
        super({
            state: state.topBannerState,
            customActionsView: {},
            userMenuView: defaultUserMenu(state.topBannerState),
            youwolMenuView: new TopBanner.ApplicationsLaunchPad({ state }),
        })
    }
}

class RunningAppTitleView implements VirtualDOM {
    public readonly class =
        'd-flex align-items-center mx-3 px-2 py-1 rounded fv-border-primary my-auto'
    public readonly style = {
        height: 'fit-content',
    }
    public readonly children: VirtualDOM[]

    constructor(state: PlatformState, app: RunningApp) {
        const baseClass = 'fas my-auto fv-pointer fv-hover-text-secondary mx-1'

        this.children = [
            {
                class: 'd-flex align-items-center',
                children: [
                    child$(
                        app.appMetadata$,
                        (appInfo) => appInfo.graphics.appIcon,
                    ),
                    { class: 'mx-1' },
                    child$(app.header$, (view) => view),
                ],
            },
            {
                class: 'd-flex align-items-center',
                children: [
                    {
                        class: `${baseClass} fa-minus-square`,
                        onclick: () => state.minimize(app.instanceId),
                    },
                    {
                        class: `${baseClass} fa-external-link-alt`,
                        onclick: () => state.expand(app.instanceId),
                    },
                    {
                        class: `${baseClass} fa-times`,
                        onclick: () => state.close(app.instanceId),
                    },
                ],
            },
        ]
    }
}

/**
 * Top banner when an application is running
 */
class RunningAppBannerView extends YouwolBannerView {
    constructor(state: PlatformState, app: RunningApp) {
        super({
            state: state.topBannerState,
            applicationName: app.cdnPackage,
            customActionsView: {
                class: 'my-auto d-flex justify-content-between flex-grow-1',
                style: { minWidth: '0px' },
                children: [
                    new RunningAppTitleView(state, app),
                    {
                        class: 'flex-grow-1 my-auto',
                        style: { minWidth: '0px' },
                        children: [
                            child$(app.topBannerActions$, (vDOM) => {
                                return vDOM
                            }),
                        ],
                    },
                ],
            },
            userMenuView: child$(app.topBannerUserMenu$, (vDOM) => {
                return vDOM
            }),
            youwolMenuView: new TopBanner.ApplicationsLaunchPad({ state }),
        })
    }
}

export class PlatformBannerView implements VirtualDOM {
    public readonly state: PlatformState
    public readonly children: VirtualDOM[]

    constructor(params: { state: PlatformState; [key: string]: unknown }) {
        Object.assign(this, params)
        this.children = [
            child$(this.state.runningApplication$, (app) =>
                app == undefined
                    ? new RegularBannerView(this.state)
                    : new RunningAppBannerView(this.state, app),
            ),
        ]
    }
}
