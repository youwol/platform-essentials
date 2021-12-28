import { install } from "@youwol/cdn-client";
import { child$, VirtualDOM } from "@youwol/flux-view";
import { Button } from "@youwol/fv-button";
import { BehaviorSubject, from, Observable, of, ReplaySubject } from "rxjs";
import { map, mergeMap, tap } from "rxjs/operators";
import { fetchCodeMirror$ } from "../explorer/utils";
import { PlatformState } from "../platform.state";
import { ExpandableMenu, UserSettings } from "./menu.view";
import { UserMenuView } from "./user-menu.view";
import { YouwolMenuView } from "./youwol-menu.view";





export interface Settings {

    you: { avatar: string },
    appearance: { theme: string },
    defaultApplications: { name: string, canOpen: (asset) => boolean, applicationURL: (asset) => string }[]
}


export class YouwolBannerState {

    static signedIn$ = from(fetch(new Request("/api/assets-gateway/healthz"))).pipe(
        map(resp => resp.status == 200)
    )
    static defaultBg = "<svg xmlns='http://www.w3.org/2000/svg'  width='200' height='200' viewBox='0 0 200 200'><rect fill='%23487346' width='200' height='200'/><g fill-opacity='1'><polygon  fill='%234c8e43' points='100 57.1 64 93.1 71.5 100.6 100 72.1'/><polygon  fill='%236aac5f' points='100 57.1 100 72.1 128.6 100.6 136.1 93.1'/><polygon  fill='%234c8e43' points='100 163.2 100 178.2 170.7 107.5 170.8 92.4'/><polygon  fill='%236aac5f' points='100 163.2 29.2 92.5 29.2 107.5 100 178.2'/><path  fill='%2389CC7C' d='M100 21.8L29.2 92.5l70.7 70.7l70.7-70.7L100 21.8z M100 127.9L64.6 92.5L100 57.1l35.4 35.4L100 127.9z'/><polygon  fill='%23768c3a' points='0 157.1 0 172.1 28.6 200.6 36.1 193.1'/><polygon  fill='%2396ac58' points='70.7 200 70.8 192.4 63.2 200'/><polygon  fill='%23B6CC76' points='27.8 200 63.2 200 70.7 192.5 0 121.8 0 157.2 35.3 192.5'/><polygon  fill='%2396ac58' points='200 157.1 164 193.1 171.5 200.6 200 172.1'/><polygon  fill='%23768c3a' points='136.7 200 129.2 192.5 129.2 200'/><polygon  fill='%23B6CC76' points='172.1 200 164.6 192.5 200 157.1 200 157.2 200 121.8 200 121.8 129.2 192.5 136.7 200'/><polygon  fill='%23768c3a' points='129.2 0 129.2 7.5 200 78.2 200 63.2 136.7 0'/><polygon  fill='%23B6CC76' points='200 27.8 200 27.9 172.1 0 136.7 0 200 63.2 200 63.2'/><polygon  fill='%2396ac58' points='63.2 0 0 63.2 0 78.2 70.7 7.5 70.7 0'/><polygon  fill='%23B6CC76' points='0 63.2 63.2 0 27.8 0 0 27.8'/></g></svg>"
    static defaultSettings = `
    return () => ({
        you:{
            "avatar": {
                class: 'rounded-circle fv-color-secondary fv-bg-primary text-center fv-text-on-primary d-flex flex-column',
                style: {
                    width: '35px',
                    height: '35px',
                    userSelect: 'none'
                },
                children: [
                    {
                        class: "m-auto",
                        innerText:'🦎'
                    }
                ]
            }
        },
        appearance:{
            "theme":'@youwol/fv-widgets#latest~assets/styles/style.youwol.css',
            "backgroundImage": 'url("data:image/svg+xml;utf8,${YouwolBannerState.defaultBg}")'
        },
        defaultApplications: [
            {
                name: "Flux-runner",
                canOpen: (asset) => asset.kind == "flux-project",
                applicationURL: (asset) => {
                    return \`/applications/@youwol/flux-runner/latest?id=\${asset.rawId}\`
                }
            },
           {
                name: "Flux-builder",
                canOpen: (asset) => asset.kind == "flux-project",
                applicationURL: (asset) => {
                    return \`/applications/@youwol/flux-builder/latest?id=\${asset.rawId}\`
                }
            },
           {
                name: "Story",
                canOpen: (asset) => asset.kind == "story",
                applicationURL: (asset) => {
                    return \`/applications/@youwol/stories/latest?id=\${asset.rawId}\`
                }
            },
        ]
    })
    `

    cmEditorModule$: Observable<any> = fetchCodeMirror$()

    /*
    {
        name: "Visualization 3D",
        canOpen: (asset) => asset.kind == "data" && asset.name.endsWith('.ts'),
        applicationURL: (asset) => {
            let encoded = encodeURI(JSON.stringify(asset))
            return \`/applications/@youwol/flux-runner/?id=81cfdf74-56ec-4202-bd23-d2049d6d96ab&asset=\${encoded}\`
        }
    }
    */
    static getSettingsFromLocalStorage() {
        if (!localStorage.getItem("settings")) {
            localStorage.setItem("settings", YouwolBannerState.defaultSettings)
        }
        let saved = localStorage.getItem("settings")
        let settings = new Function(saved)()()
        return { parsed: settings, text: localStorage.getItem("settings") }
    }
    settings$ = new BehaviorSubject<{ parsed: Settings, text: string }>(YouwolBannerState.getSettingsFromLocalStorage())

    constructor(params: { cmEditorModule$?: Observable<any> } = {}) {
        Object.assign(this, params)
    }

    setSettings(settingsTxt: string) {
        localStorage.setItem("settings", settingsTxt)
        getSettings$().pipe(
            tap((settings: Settings) => install({ css: [settings.appearance.theme] }).then())
        )
            .subscribe((settings) => this.settings$.next({ parsed: settings, text: settingsTxt }))
    }
}

export function getSettings$(): Observable<Settings> {

    let settings = new Function(localStorage.getItem("settings"))()()
    return of(settings)
}

/**
 * The YouWol top banner
 * 
 * YouWol top banner includes 3 parts, from left to right:
 * *    the YouWol logo with some optional badges ([[BadgeView]])
 * *    a main content: the actions the consuming application wants to expose (some helpers e.g. [[ComboTogglesView]])
 * *    a burger menu with common actions ([[BurgerMenu]])
 * 
 */
export class YouwolBannerView implements VirtualDOM {

    static ClassSelector = "youwol-banner-view"

    public readonly class = `w-100 position-relative fv-text-primary justify-content-between align-self-center  px-3  border-bottom ${YouwolBannerView.ClassSelector}`
    public readonly style = {
        minHeight: '50px',
        display: 'd-flex'
    }
    public readonly children: Array<VirtualDOM>

    public readonly badgesView?: VirtualDOM
    public readonly customActionsView: VirtualDOM = {}
    public readonly userMenuView?: VirtualDOM
    public readonly youwolMenuView?: VirtualDOM

    public readonly state: YouwolBannerState

    /**
     * @params params Parameters
     * @param params.badgesView definition of the badges, see [[BadgeView]]
     * @param params.customActionsView definition of the custom actions of the app
     * @param params.userMenuView definition of the user's menu
     * @param params.youwolMenuView definition of the youwol's menu
     */
    constructor(params: {
        state: YouwolBannerState,
        badgesView?: VirtualDOM,
        customActionsView?: VirtualDOM,
        userMenuView?: VirtualDOM,
        youwolMenuView?: VirtualDOM
    }) {
        Object.assign(this, params)
        let instanceId = new URLSearchParams(window.location.search).get("instance-id")
        let youwolOS = PlatformState.getInstance()
        if (youwolOS && instanceId) {
            youwolOS.setTopBannerViews(
                instanceId,
                {
                    actionsView: this.customActionsView,
                    badgesView: this.badgesView,
                    youwolMenuView: this.youwolMenuView,
                    userMenuView: this.userMenuView
                }
            )
            this.class += " d-none"
            return
        }
        this.class += " d-flex"
        this.children = [
            this.youwolMenuView ? new YouwolMenuView({ badgesView: this.badgesView, youwolMenuView: this.youwolMenuView }) : {},
            this.customActionsView,
            this.userMenuView
                ? child$(
                    YouwolBannerState.signedIn$,
                    (result) => {
                        return result
                            ? new UserMenuView({ state: this.state, contentView: this.userMenuView })
                            : new LoginView()
                    })
                : {}
        ]
    }
}

export class LoginView implements VirtualDOM {

    static ClassSelector = "login-view"
    class = `${LoginView.ClassSelector}`
    children = [
        new ButtonView('login', 'mx-2 fv-text-primary'),
        new ButtonView('register', 'mx-2 fv-text-primary')
    ]
    style = { maxWidth: '250px' }

    constructor() { }
}


export class ButtonView extends Button.View {

    class = 'fv-btn fv-bg-secondary-alt fv-hover-bg-secondary'

    constructor(name: string, withClass: string = "") {
        super({ state: new Button.State(), contentView: () => ({ innerText: name }) })
        this.class = `${this.class} ${withClass}`
    }
}
