import {child$, VirtualDOM} from '@youwol/flux-view'
import {RunningApp} from './running-app.view'
import {PlatformState} from './platform.state'
import {defaultUserMenu, YouwolBannerView} from "./top-banner";
import {AppsDockerView} from './platform-docker-bar.view'


class RunningAppView implements VirtualDOM {

    public readonly class = 'd-flex w-100 align-items-center fv-bg-background px-2 fv-text-primary fv-pointer border-bottom fv-hover-bg-secondary'

    public readonly children: VirtualDOM[]

    public readonly onclick: () => void
    constructor(app: RunningApp, state: PlatformState) {
        this.children = [
            {
                class: app.icon
            },
            {
                class: 'mx-1',
                innerText: app.title
            }
        ]
        this.onclick = () => state.focus(app.instanceId)
    }
}

/**
 * Regular top banner of the application (no application running)
 */
class RegularBannerView extends YouwolBannerView {

    constructor(state: PlatformState) {
        super({
            state: state.topBannerState,
            customActionsView: {},
            userMenuView: defaultUserMenu(state.topBannerState),
            //youwolMenuView: defaultYouWolMenu(state.topBannerState)
            youwolMenuView: new AppsDockerView({ state })
        })
    }
}


class RunningAppTitleView implements VirtualDOM {

    public readonly class = 'd-flex align-items-center mx-3'

    public readonly children: VirtualDOM[]

    constructor(state: PlatformState, app: RunningApp) {

        let baseClass = 'fas my-auto fv-pointer fv-hover-text-secondary mx-2'

        this.children = [
            {
                class: 'border-bottom px-1 fv-text-focus',
                style: {
                    fontFamily: 'serif',
                    fontSize: 'x-large'
                },
                innerText: app.title
            },
            {
                class: 'd-flex align-items-center',
                children: [
                    {
                        class: `${baseClass} fa-external-link-alt`,
                        onclick: () => state.expand(app.instanceId),
                    },
                    {
                        class: 'd-flex flex-column align-items-center',
                        children: [
                            {
                                class: `${baseClass} fa-times`,
                                onclick: () => state.close(app.instanceId),
                            },
                            {
                                class: `${baseClass} fa-minus-square`,
                                onclick: () => state.minimize(app.instanceId),
                            }
                        ]
                    }
                ]
            }]
    }
}

/**
 * Top banner when an application is running
 */
class RunningAppBannerView extends YouwolBannerView {

    constructor(state: PlatformState, app: RunningApp) {

        super({
            state: state.topBannerState,
            customActionsView: {
                class: 'my-auto d-flex justify-content-between flex-grow-1',
                style: { minWidth: '0px' },
                children: [
                    new RunningAppTitleView(state, app),
                    {
                        class: 'flex-grow-1 my-auto',
                        style: { minWidth: '0px' },
                        children: [
                            child$(
                                app.topBannerActions$,
                                (vDOM) => {
                                    return vDOM
                                }
                            )
                        ]
                    }
                ]
            },
            userMenuView: child$(
                app.topBannerUserMenu$,
                (vDOM) => {
                    return vDOM
                }
            ),
            youwolMenuView: new AppsDockerView({ state })
            /*
            youwolMenuView: child$(
                app.topBannerYouwolMenu$,
                (vDOM) => {
                    return vDOM
                }
            )*/
        })
    }
}


export class PlatformBannerView implements VirtualDOM {

    public readonly state: PlatformState
    public readonly children: VirtualDOM[]

    constructor(params: { state: PlatformState }) {
        Object.assign(this, params)
        this.children = [
            child$(
                this.state.runningApplication$,
                (app) => app == undefined
                    ? new RegularBannerView(this.state)
                    : new RunningAppBannerView(this.state, app)
            )
        ]
    }
}
