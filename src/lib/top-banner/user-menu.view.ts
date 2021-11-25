import { child$, VirtualDOM } from "@youwol/flux-view"
import { BehaviorSubject } from "rxjs"
import { ExpandableMenu } from "./menu.view"
import { Settings, YouwolBannerState } from "./top-banner.view"



/**
 * Define the burger menu of [[YouwolBannerView]]
 */
export class UserMenuView implements VirtualDOM {

    static ClassSelector = "user-menu-view"

    public readonly state: YouwolBannerState
    public readonly showMenu$ = new BehaviorSubject(false)

    public readonly class = `my-auto burger-menu-icon-view ${UserMenuView.ClassSelector}`
    public readonly style = {
        zIndex: 10
    }
    children: VirtualDOM[]

    onclick: () => void
    onmouseleave: () => void

    public readonly contentView: VirtualDOM
    /**
     * 
     * @param parameters Constructor's parameters
     * @param parameters.contentView View displayed when the burger menu is expanded (see [[BurgerMenu]])
     * 
     */
    constructor(parameters: { state: YouwolBannerState, contentView: VirtualDOM }) {

        Object.assign(this, parameters)

        let expandableMenu = new ExpandableMenu({
            contentView: this.contentView,
            style: {
                top: '0px',
                right: '0px'
            }
        })
        this.onclick = () => expandableMenu.showMenu$.next(!expandableMenu.showMenu$.getValue())
        this.onmouseleave = () => expandableMenu.showMenu$.next(false)

        this.children = [
            {
                class: 'd-flex align-items-center fv-pointer',
                children: [
                    child$(
                        this.state.settings$,
                        (settings: { parsed: Settings }) => settings.parsed.you.avatar
                    ),
                    {
                        class: 'd-flex flex-column h-100 px-1 fv-text-secondary',
                        children: [
                            {
                                class: 'fas fa-caret-down h-50', style: { opacity: '0' }
                            },
                            {
                                class: 'fas fa-caret-down h-50'
                            }
                        ]
                    }
                ]
            },
            expandableMenu
        ]
    }
}
