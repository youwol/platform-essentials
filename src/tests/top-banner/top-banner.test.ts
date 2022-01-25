import '../mock-requests'
import { AssetsGatewayClient } from '../../lib/clients/assets-gateway/assets-gateway.client'

import { getFromDocument, getPyYouwolBasePath, queryFromDocument, resetPyYouwolDbs } from '../common'

AssetsGatewayClient.staticBasePath = `${getPyYouwolBasePath()}/api/assets-gateway`
AssetsGatewayClient.staticHeaders = { 'py-youwol-local-only': true }

import { render, VirtualDOM } from "@youwol/flux-view"
import { BehaviorSubject, of } from "rxjs"


import { LockerBadge } from "../../lib/top-banner/badges"
import { UserMenuView } from "../../lib/top-banner/user-menu.view"
import { YouwolMenuView } from "../../lib/top-banner/youwol-menu.view"
import { YouwolBannerState, YouwolBannerView } from '../../lib/top-banner/top-banner.view'
import { ComboTogglesView, FaIconToggleView } from '../../lib/top-banner/actions.view'
import { defaultUserMenu, defaultYouWolMenu, MenuSection } from '../../lib/top-banner/menu.view'
import { MenuItem } from '../../lib/top-banner/settings-menu.view'
import { take } from 'rxjs/operators'


beforeAll(async (done) => {
    resetPyYouwolDbs().then(() => {
        done()
    })
})


export enum ViewMode {
    renderOnly = 'renderOnly',
    editOnly = 'editOnly',
    simultaneous = 'simultaneous'
}

export class TopBannerState extends YouwolBannerState {

    public readonly viewMode$ = new BehaviorSubject<ViewMode>(ViewMode.renderOnly)
    public readonly readonly = true
    constructor() {
        super()
    }
}

export class CustomActionsView implements VirtualDOM {

    static ClassSelector = "custom-actions-view"
    public readonly state: TopBannerState

    public readonly class = `d-flex justify-content-around my-auto custom-actions-view ${CustomActionsView.ClassSelector}`
    public readonly children: VirtualDOM[]

    static iconsFactory = {
        [ViewMode.simultaneous]: 'fa-columns',
        [ViewMode.editOnly]: 'fa-pen',
        [ViewMode.renderOnly]: 'fa-eye'
    }

    constructor(params: { state: YouwolBannerState }) {

        Object.assign(this, params)
        let viewModeCombo = new ComboTogglesView<ViewMode, YouwolBannerState>({
            selection$: this.state.viewMode$,
            state: this.state,
            values: [ViewMode.simultaneous, ViewMode.editOnly, ViewMode.renderOnly],
            viewFactory: (mode: ViewMode) => {
                return new FaIconToggleView<ViewMode>({
                    value: mode,
                    selection$: this.state.viewMode$,
                    classes: CustomActionsView.iconsFactory[mode] + ` ${mode}`
                })
            }
        })

        this.children = [
            viewModeCombo
        ]
    }
}


export class BannerView extends YouwolBannerView {

    constructor({ state }: { state: TopBannerState }) {
        super({
            state,
            badgesView: new LockerBadge({
                locked$: of(state.readonly)
            }),
            customActionsView: new CustomActionsView({ state }),
            userMenuView: defaultUserMenu(state),
            youwolMenuView: defaultYouWolMenu(state)
        })
    }
}


test('rendering: what should be displayed is displayed', (done) => {

    document.body.innerHTML = ""

    let state = new TopBannerState()
    let bannerView = new BannerView({ state })
    document.body.appendChild(render(bannerView))

    let expectedDisplayed = [
        YouwolBannerView.ClassSelector,
        CustomActionsView.ClassSelector,
        ViewMode.editOnly,
        ViewMode.renderOnly,
        ViewMode.simultaneous,
        YouwolMenuView.ClassSelector,
        LockerBadge.ClassSelector
    ]
    expectedDisplayed.forEach(selector => {

        let elem = document.querySelector("." + selector)
        expect(elem).toBeTruthy()
        done()
    })
})


test('rendering: open user menu', (done) => {

    document.body.innerHTML = ""

    let state = new TopBannerState()
    let bannerView = new BannerView({ state })
    document.body.appendChild(render(bannerView))

    YouwolBannerState.signedIn$.pipe(
        take(1)
    ).subscribe(() => {
        let userMenuView = getFromDocument<UserMenuView>("." + UserMenuView.ClassSelector)

        userMenuView.dispatchEvent(new Event("click", { bubbles: true }))
        let sections = queryFromDocument<MenuSection>("." + MenuSection.ClassSelector)
        expect(sections.length).toEqual(2)

        let burgerItems = queryFromDocument<MenuItem>("." + MenuItem.ClassSelector)

        expect(burgerItems.length).toEqual(3);
        userMenuView.onmouseleave()
        sections = queryFromDocument<MenuSection>("." + MenuSection.ClassSelector)

        expect(sections.length).toEqual(0)
        done()
    })
})


test('rendering: open youwol menu', (done) => {

    document.body.innerHTML = ""

    let state = new TopBannerState()
    let bannerView = new BannerView({ state })
    document.body.appendChild(render(bannerView))

    let youwolMenuView = getFromDocument<YouwolMenuView>("." + YouwolMenuView.ClassSelector)

    youwolMenuView.dispatchEvent(new Event("click", { bubbles: true }))
    let sections = Array.from(document.querySelectorAll("." + MenuSection.ClassSelector))
    expect(sections.length).toEqual(2)

    let burgerItems = queryFromDocument<MenuItem>("." + MenuItem.ClassSelector)

    expect(burgerItems.length).toEqual(3);
    youwolMenuView.onmouseleave()
    sections = queryFromDocument<MenuSection>("." + MenuSection.ClassSelector)

    expect(sections.length).toEqual(0)
    done()
})


test('combo toggle', (done) => {

    document.body.innerHTML = ""

    let state = new TopBannerState()
    let bannerView = new BannerView({ state })
    document.body.appendChild(render(bannerView))

    let toggles = queryFromDocument<FaIconToggleView<ViewMode>>("." + FaIconToggleView.ClassSelector)
    expect(toggles.length).toEqual(3);
    toggles[0].dispatchEvent(new Event('click'))
    state.viewMode$.subscribe(mode => {
        expect(mode).toEqual(toggles[0].value)
        done()
    })
})
