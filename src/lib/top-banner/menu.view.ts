/**
 * # Menu
 * 
 * Factorized style for menu, usually can be expanded by a click (see [[ExpandableMenu]]).
 * 
 * Based on [[MenuItem]] and [[MenuSection]]
 * 
 * @module lib/top-banner/burger-menu.view
 */

import { child$, VirtualDOM } from "@youwol/flux-view"
import { BehaviorSubject } from "rxjs"
import { SettingsMenuItem, YouwolBannerState } from "."

/**
 * Base class of item in the menu
 */
export class MenuItem implements VirtualDOM {

    static ClassSelector = "menu-item"

    public readonly class = `row align-items-center fv-pointer fv-hover-text-focus px-3 ${MenuItem.ClassSelector} `

    constructor({ withClasses }: { withClasses: string }) {

        this.class += withClasses
    }
}

/**
 * YouWol's exhibition halls link
 */
export class ExhibitionHallLink extends MenuItem {

    static ClassSelector = "exhibition-hall-link"

    tag = "a"
    href = "/ui/exhibition-hall"
    children = [
        {
            class: "col-sm",
            innerText: "Exhibition Halls"
        }
    ]

    constructor() {
        super({ withClasses: ExhibitionHallLink.ClassSelector })
    }
}

/**
 * YouWol's workspace link
 */
export class WorkspaceLink extends MenuItem {

    static ClassSelector = "workspace-link"

    tag = "a"
    href = "/ui/workspace-explorer"
    children = [
        {
            class: "col-sm",
            innerText: "Workspace"
        }
    ]

    constructor() {
        super({ withClasses: WorkspaceLink.ClassSelector })
    }
}


/**
 * Py-youwol download link
 */
export class PyYouwolDownload extends MenuItem {

    static ClassSelector = "py-youwol-download"

    tag = "a"
    href = "https://github.com/youwol/py-youwol"
    children = [
        {
            class: "col-sm",
            innerText: "Py YouWol"
        }
    ]

    constructor() {
        super({ withClasses: PyYouwolDownload.ClassSelector })
    }
}


/**
 * User settings
 */
export class UserSettings extends MenuItem {

    static ClassSelector = "user-settings"

    children = [
        {
            tag: 'a',
            href: 'https://gc.auth.youwol.com/auth/realms/youwol/account/',
            class: "col-sm",
            innerText: "Profile"
        }
    ]

    constructor() {
        super({ withClasses: UserSettings.ClassSelector })
    }
}


/**
 * Sign-out burgers item
 */
export class SignOut extends MenuItem {

    static ClassSelector = "sign-out"

    children = [
        {
            tag: 'a',
            href: 'https://gc.auth.youwol.com/auth/realms/youwol/protocol/openid-connect/logout?redirect=https://gc.platform.youwol.com/ui/dashboard-user/v3',
            class: "col-sm",
            innerText: "Sign-out"
        }
    ]

    constructor() {
        super({ withClasses: SignOut.ClassSelector })
    }
}

/**
 * A section in the burger menu
 */
export class MenuSection implements VirtualDOM {

    static ClassSelector = "menu-section"
    public readonly class = `${MenuSection.ClassSelector}`

    public readonly children: VirtualDOM[]

    /**
     * @param parameters Constructor's parameters
     * @param parameters.items List of items in the section 
     */
    constructor(parameters: {
        items: MenuItem[]
    }) {
        Object.assign(this, parameters)
        this.children = parameters.items
    }
}

/**
 * Menu of [[YouwolBannerView]]
 */
export class Menu implements VirtualDOM {

    static ClassSelector = "menu"

    public readonly id: string
    public readonly class = `py-3 px-1 ${Menu.ClassSelector} fv-bg-primary fv-text-on-primary `
    public readonly style = {
        whiteSpace: 'nowrap'
    }
    public readonly children: VirtualDOM[]

    static separation = {
        tag: 'hr',
        class: 'w-100 fv-color-on-primary'
    }
    /**
     * @param parameters Constructor's parameters
     * @param parameters.sections List of sections in the menu
     */
    constructor(parameters: {
        id: string,
        sections: MenuSection[]
    }) {
        Object.assign(this, parameters)
        this.children = parameters.sections.map(section => {
            return [section, Menu.separation]
        })
            .flat()
            .slice(0, -1)
    }
}


export class ExpandableMenu implements VirtualDOM {

    public readonly showMenu$ = new BehaviorSubject(false)
    public readonly class = `position-absolute content-container`

    public readonly style = {
        left: '0px',
        top: '0%',
        zIndex: 10
    }

    contentView: VirtualDOM
    children: VirtualDOM[]

    constructor(params: { contentView: VirtualDOM, style?: { [key: string]: string } }) {

        Object.assign(this, params)
        this.children = [
            child$(
                this.showMenu$,
                (visible) => {
                    return visible
                        ? {
                            style: {
                                marginTop: '50px'
                            },
                            class: 'h-100 w-100 d-flex flex-column p-2 rounded border fv-color-primary fv-bg-background-alt',
                            children: [
                                this.contentView
                            ]
                        }
                        : {}
                }
            )
        ]
    }
}


export function defaultUserMenu(state: YouwolBannerState): VirtualDOM {

    return new Menu({
        id: 'expandable-user-menu',
        sections: [
            new MenuSection({
                items: [
                    new UserSettings(),
                    new SettingsMenuItem({ state })
                ]
            }),
            new MenuSection({
                items: [
                    new SignOut()
                ]
            }),
        ]
    })
}

export function defaultYouWolMenu(state: YouwolBannerState): VirtualDOM {

    return new Menu({
        id: 'expandable-youwol-menu',
        sections: [
            new MenuSection({
                items: [
                    new WorkspaceLink(),
                    new ExhibitionHallLink(),
                ]
            }),
            new MenuSection({
                items: [
                    new PyYouwolDownload()
                ]
            })
        ]
    })
}
