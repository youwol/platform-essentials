import { child$, VirtualDOM } from '@youwol/flux-view'
import { Button } from '@youwol/fv-button'
import { map, shareReplay } from 'rxjs/operators'
import { AssetsGateway, HTTPError } from '@youwol/http-clients'
import { ChildApplicationAPI, isPlatformInstance } from '../core/platform.state'
import { UserMenuView } from './user-menu.view'
import { YouwolMenuView } from './youwol-menu.view'
import { PlatformSettingsStore } from '../core/platform-settings'

export class YouwolBannerState {
    static signedIn$ = new AssetsGateway.AssetsGatewayClient()
        .getHealthz$()
        .pipe(
            map(
                (resp) =>
                    !(resp instanceof HTTPError) &&
                    resp.status == 'assets-gateway ok',
            ),
            shareReplay(1),
        )

    constructor(params = {}) {
        Object.assign(this, params)
    }

    setSettings(settingsTxt: string) {
        const settings = JSON.parse(settingsTxt)
        PlatformSettingsStore.save(settings)
    }
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
    static ClassSelector = 'youwol-banner-view'

    public readonly class = `w-100 position-relative fv-text-primary justify-content-between align-self-center  border-bottom ${YouwolBannerView.ClassSelector}`
    public readonly style = {
        minHeight: '50px',
        display: 'd-flex',
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
     * @param params.youwolMenuView definition of the youwol’s menu
     */
    constructor(params: {
        state: YouwolBannerState
        badgesView?: VirtualDOM
        customActionsView?: VirtualDOM
        userMenuView?: VirtualDOM
        youwolMenuView?: VirtualDOM
    }) {
        Object.assign(this, params)
        const instanceId = ChildApplicationAPI.getAppInstanceId()
        const youwolOS = ChildApplicationAPI.getOsInstance()

        if (instanceId && isPlatformInstance(youwolOS)) {
            youwolOS.setTopBannerViews(instanceId, {
                actionsView: this.customActionsView,
                youwolMenuView: this.youwolMenuView,
                userMenuView: this.userMenuView,
            })
            this.class += ' d-none'
            return
        }
        this.class += ' d-flex'
        this.children = [
            this.youwolMenuView
                ? new YouwolMenuView({
                      badgesView: this.badgesView,
                      youwolMenuView: this.youwolMenuView,
                  })
                : {},
            this.customActionsView,
            this.userMenuView
                ? child$(YouwolBannerState.signedIn$, (result) => {
                      return result
                          ? new UserMenuView({
                                state: this.state,
                                contentView: this.userMenuView,
                            })
                          : new LoginView()
                  })
                : {},
        ]
    }
}

export class LoginView implements VirtualDOM {
    static ClassSelector = 'login-view'
    class = `${LoginView.ClassSelector}`
    children = [
        new ButtonView('login', 'mx-2 fv-text-primary'),
        new ButtonView('register', 'mx-2 fv-text-primary'),
    ]
    style = { maxWidth: '250px' }
}

export class ButtonView extends Button.View {
    class = 'fv-btn fv-bg-secondary-alt fv-hover-bg-secondary'

    constructor(name: string, withClass = '') {
        super({
            state: new Button.State(),
            contentView: () => ({ innerText: name }),
        })
        this.class = `${this.class} ${withClass}`
    }
}
