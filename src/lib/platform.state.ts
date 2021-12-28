import { uuidv4 } from '@youwol/flux-core'
import { BehaviorSubject, of } from "rxjs"
import { RunningApp } from './running-app.view'
import { VirtualDOM } from '@youwol/flux-view'
import { YouwolBannerState } from './top-banner'



export class PlatformState {

    public readonly topBannerState = new YouwolBannerState()

    public readonly runningApplication$ = new BehaviorSubject<RunningApp>(undefined)
    public readonly runningApplications$ = new BehaviorSubject<RunningApp[]>([])

    static instance: PlatformState
    static setInstance(instance: PlatformState) {
        PlatformState.instance = instance
    }

    static getInstance() {
        return parent['@youwol/platform-essentials']?.PlatformState.instance || PlatformState.instance
    }

    constructor() {

        PlatformState.setInstance(this)
        this.createInstance({
            icon: "fas fa-shopping-cart",
            title: "Exhibition halls",
            appURL: `/applications/@youwol/exhibition-halls/latest?`
        })
        this.createInstance({
            icon: "fas fa-file-code",
            title: "Dev. portal",
            appURL: `/applications/@youwol/developer-portal/latest?`
        })

        this.createInstance({
            icon: "fas fa-folder",
            title: "Explorer",
            appURL: `/applications/@youwol/explorer/latest?`
        })
    }


    createInstance(appData: {
        icon: string,
        title: string,
        appURL: string
    }) {
        let instanceId = uuidv4()
        let url = appData.appURL.endsWith('/')
            ? appData.appURL + "?instance-id=" + instanceId
            : appData.appURL + "&instance-id=" + instanceId
        let app = new RunningApp({
            state: this,
            instanceId,
            icon: appData.icon,
            title: appData.title,
            appURL$: of(url)
        })
        this.runningApplications$.next([...this.runningApplications$.getValue(), app])
        return app
    }


    focus(app: RunningApp) {
        this.runningApplication$.next(app)
    }

    toggleNavigationMode() {
        this.runningApplication$.next(undefined)
    }

    setTopBannerViews(
        appId: string,
        { actionsView, badgesView, youwolMenuView, userMenuView }: {
            actionsView: VirtualDOM,
            badgesView: VirtualDOM,
            youwolMenuView: VirtualDOM,
            userMenuView: VirtualDOM
        }) {
        let app = this.runningApplications$.getValue().find(app => app.instanceId === appId)
        app.topBannerActions$.next(actionsView)
        app.topBannerUserMenu$.next(userMenuView)
        app.topBannerYouwolMenu$.next(youwolMenuView)
    }

    close(app: RunningApp) {
        app.terminateInstance()
        this.runningApplications$.next(this.runningApplications$.getValue().filter(d => d != app))
        this.runningApplication$.next(undefined)
    }

    minimize(preview: RunningApp) {

        this.runningApplication$.next(undefined)
        if (this.runningApplications$.getValue().includes(preview))
            return
        this.runningApplications$.next([...this.runningApplications$.getValue(), preview])
    }
}



