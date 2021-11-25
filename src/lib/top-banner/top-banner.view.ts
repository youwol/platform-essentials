import { install } from "@youwol/cdn-client";
import { child$, VirtualDOM } from "@youwol/flux-view";
import { Button } from "@youwol/fv-button";
import { BehaviorSubject, from, Observable, of, ReplaySubject } from "rxjs";
import { mergeMap, tap } from "rxjs/operators";
import { ExpandableMenu, UserSettings } from "./menu.view";
import { UserMenuView } from "./user-menu.view";
import { YouwolMenuView } from "./youwol-menu.view";





export interface Settings {

    you: { avatar: string },
    appearance: { theme: string },
    defaultApplications: { name: string, canOpen: (asset) => boolean, applicationURL: (asset) => string }[]
}


export class YouwolBannerState {

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
            "theme":'@youwol/fv-widgets#latest~assets/styles/style.youwol.css'
        },
        defaultApplications: [
        ]
    })
    `

    cmEditorModule$: Observable<any>

    /*
    {
        name: "Visualization 3D",
        canOpen: (asset) => asset.kind == "data" && asset.name.endsWith('.ts'),
        applicationURL: (asset) => {
            let encoded = encodeURI(JSON.stringify(asset))
            return \`/ui/flux-runner/?id=81cfdf74-56ec-4202-bd23-d2049d6d96ab&asset=\${encoded}\`
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

    constructor(params: { cmEditorModule$: Observable<any> }) {
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
    public readonly customActionsView?: VirtualDOM
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
        customActionsView: VirtualDOM,
        userMenuView?: VirtualDOM,
        youwolMenuView?: VirtualDOM,
        signedIn$: Observable<boolean>
    }) {
        Object.assign(this, params)
        let instanceId = new URLSearchParams(window.location.search).get("instance-id")
        if (parent.window['@youwol/os'] && instanceId) {
            parent.window['@youwol/os'].setTopBannerViews(
                instanceId,
                {
                    actionsView: this.customActionsView,
                    badgesView: this.badgesView
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
                    params.signedIn$,
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
