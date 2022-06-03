import { VirtualDOM } from '@youwol/flux-view'
import { Core } from '..'

/**
 * The YouWol top banner
 *
 * YouWol top banner includes 3 parts, from left to right:
 * *    the YouWol logo with some optional badges ([[BadgeView]])
 * *    a main content: the actions the consuming application wants to expose (some helpers e.g. [[ComboTogglesView]])
 * *    a burger menu with common actions ([[BurgerMenu]])
 *
 */
export class TopBannerView implements VirtualDOM {
    static ClassSelector = 'top-banner-view'
    static baseClass = `w-100 position-relative fv-bg-background d-flex fv-text-primary justify-content-between align-self-center  border-bottom ${TopBannerView.ClassSelector}`
    public readonly class: string
    public readonly style = {
        minHeight: '50px',
        display: 'd-flex',
    }
    public readonly children: Array<VirtualDOM>
    public readonly innerView: VirtualDOM = {}

    /**
     * @params params Parameters
     * @param params.badgesView definition of the badges, see [[BadgeView]]
     * @param params.customActionsView definition of the custom actions of the app
     * @param params.userMenuView definition of the user's menu
     * @param params.youwolMenuView definition of the youwol’s menu
     */
    constructor(params: { innerView?: VirtualDOM }) {
        Object.assign(this, params)
        const instanceId = Core.ChildApplicationAPI.getAppInstanceId()
        const youwolOS = Core.ChildApplicationAPI.getOsInstance()

        if (instanceId && Core.isPlatformInstance(youwolOS)) {
            youwolOS.setTopBannerViews(instanceId, {
                actionsView: this.innerView,
                youwolMenuView: {},
                userMenuView: {},
            })
            this.class = 'd-none'
            return
        }
        this.class = TopBannerView.baseClass
        this.children = [params.innerView]
    }
}
