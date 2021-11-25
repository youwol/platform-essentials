import { VirtualDOM } from "@youwol/flux-view"
import { ExpandableMenu } from "./menu.view"



/**
 * Encapsulates YouWol's logo with optional badges & YouWol menu.
 */
export class YouwolMenuView implements VirtualDOM {

    static ClassSelector = "youwol-menu-view"

    static url = '/api/assets-gateway/raw/package/QHlvdXdvbC9mbHV4LXlvdXdvbC1lc3NlbnRpYWxz/latest/assets/images/logo_YouWol_Platform_white.png'

    public readonly class = `d-flex my-auto  fv-pointer ${YouwolMenuView.ClassSelector}`

    public readonly children: VirtualDOM[]
    public readonly badgesView?: VirtualDOM
    public readonly youwolMenuView?: VirtualDOM

    onclick: () => void
    onmouseleave: () => void
    /**
     * 
     * @param parameters Constructor's parameters
     * @param parameters.badgesView if provided, insert the virtual DOM as badge view (see [[BadgeView]] for helpers)
     * @param parameters.youwolMenuView  if provided, add a Youwol menu to the logo 
     */
    constructor(parameters: {
        badgesView?: VirtualDOM,
        youwolMenuView: VirtualDOM
    }) {
        Object.assign(this, parameters)
        let expandableMenu = new ExpandableMenu({ contentView: this.youwolMenuView })
        this.onclick = () => expandableMenu.showMenu$.next(!expandableMenu.showMenu$.getValue())
        this.onmouseleave = () => expandableMenu.showMenu$.next(false)
        this.children = [
            {
                style: {
                    width: '30px',
                    overflow: 'hidden'
                },
                children: [
                    {
                        innerHTML: `<svg id="" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 109.58 121.1">
                        <defs></defs>
                        <title>logo_YouWol_white</title>
                        <polygon class="fv-fill-primary" points="109.58 94.68 109.58 84.14 91.39 73.64 109.58 63.14 109.58 42.06 63.95 68.41 63.94 68.41 63.94 121.1 82.2 110.56 82.2 89.41 100.52 99.99 109.58 94.76 109.58 94.68"/>
                        <polygon class="fv-fill-primary" points="54.8 52.69 9.17 26.35 27.42 15.81 45.61 26.31 45.61 5.31 54.73 0.04 54.8 0 63.86 5.23 63.86 26.39 82.18 15.81 100.43 26.35 54.8 52.7 54.8 52.69"/>
                        <polygon class="fv-fill-primary" points="0.07 94.72 9.2 99.99 27.38 89.49 27.38 110.56 45.64 121.1 45.64 68.41 45.64 68.41 0.01 42.06 0.01 63.14 18.33 73.64 0 84.22 0 94.68 0.07 94.72"/>
                        </svg>
                        `
                    }
                ]
            },
            {
                class: 'd-flex flex-column h-100 px-1 fv-text-secondary',
                children: [
                    this.badgesView || { class: 'fas fa-caret-down h-50', style: { opacity: '0' } },
                    {
                        class: 'fas fa-caret-down h-50'
                    }
                ]
            },
            expandableMenu
        ]
    }
}
