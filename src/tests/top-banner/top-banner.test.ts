// eslint-disable-next-line eslint-comments/disable-enable-pair -- to not have problem
/* eslint-disable jest/no-done-callback -- eslint-comment It is required because */

import '../mock-requests'
import { render, VirtualDOM } from '@youwol/flux-view'
import { BehaviorSubject, of } from 'rxjs'
import { take } from 'rxjs/operators'
import {
    ComboTogglesView,
    defaultUserMenu,
    defaultYouWolMenu,
    FaIconToggleView,
    LockerBadge,
    MenuItem,
    MenuSection,
    UserMenuView,
    YouwolBannerState,
    YouwolBannerView,
    YouwolMenuView,
} from '../../lib/top-banner'

import {
    getFromDocument,
    queryFromDocument,
    resetPyYouwolDbs$,
} from '../common'

beforeAll(async (done) => {
    resetPyYouwolDbs$().subscribe(() => {
        done()
    })
})

enum ViewMode {
    renderOnly = 'renderOnly',
    editOnly = 'editOnly',
    simultaneous = 'simultaneous',
}

class TopBannerState extends YouwolBannerState {
    public readonly viewMode$ = new BehaviorSubject<ViewMode>(
        ViewMode.renderOnly,
    )
    public readonly readonly = true

    constructor() {
        super()
    }
}

class CustomActionsView implements VirtualDOM {
    static ClassSelector = 'custom-actions-view'
    public readonly state: TopBannerState

    public readonly class = `d-flex justify-content-around my-auto custom-actions-view ${CustomActionsView.ClassSelector}`
    public readonly children: VirtualDOM[]

    static iconsFactory = {
        [ViewMode.simultaneous]: 'fa-columns',
        [ViewMode.editOnly]: 'fa-pen',
        [ViewMode.renderOnly]: 'fa-eye',
    }

    constructor(params: { state: YouwolBannerState }) {
        Object.assign(this, params)
        const viewModeCombo = new ComboTogglesView<ViewMode, YouwolBannerState>(
            {
                selection$: this.state.viewMode$,
                state: this.state,
                values: [
                    ViewMode.simultaneous,
                    ViewMode.editOnly,
                    ViewMode.renderOnly,
                ],
                viewFactory: (mode: ViewMode) => {
                    return new FaIconToggleView<ViewMode>({
                        value: mode,
                        selection$: this.state.viewMode$,
                        classes:
                            CustomActionsView.iconsFactory[mode] + ` ${mode}`,
                    })
                },
            },
        )

        this.children = [viewModeCombo]
    }
}

class BannerView extends YouwolBannerView {
    constructor({ state }: { state: TopBannerState }) {
        super({
            state,
            badgesView: new LockerBadge({
                locked$: of(state.readonly),
            }),
            customActionsView: new CustomActionsView({ state }),
            userMenuView: defaultUserMenu(state),
            youwolMenuView: defaultYouWolMenu(state),
        })
    }
}

test('rendering: what should be displayed is displayed', (done) => {
    document.body.innerHTML = ''

    const state = new TopBannerState()
    const bannerView = new BannerView({ state })
    document.body.appendChild(render(bannerView))

    const expectedDisplayed = [
        YouwolBannerView.ClassSelector,
        CustomActionsView.ClassSelector,
        ViewMode.editOnly,
        ViewMode.renderOnly,
        ViewMode.simultaneous,
        YouwolMenuView.ClassSelector,
        LockerBadge.ClassSelector,
    ]
    expectedDisplayed.forEach((selector) => {
        const elem = document.querySelector('.' + selector)
        expect(elem).toBeTruthy()
        done()
    })
})

test('rendering: open user menu', (done) => {
    document.body.innerHTML = ''

    const state = new TopBannerState()
    const bannerView = new BannerView({ state })
    document.body.appendChild(render(bannerView))

    YouwolBannerState.signedIn$.pipe(take(1)).subscribe(() => {
        const userMenuView = getFromDocument<UserMenuView>(
            '.' + UserMenuView.ClassSelector,
        )

        userMenuView.dispatchEvent(new Event('click', { bubbles: true }))
        let sections = queryFromDocument<MenuSection>(
            '.' + MenuSection.ClassSelector,
        )
        expect(sections).toHaveLength(2)

        const burgerItems = queryFromDocument<MenuItem>(
            '.' + MenuItem.ClassSelector,
        )

        expect(burgerItems).toHaveLength(3)
        userMenuView.onmouseleave()
        sections = queryFromDocument<MenuSection>(
            '.' + MenuSection.ClassSelector,
        )

        expect(sections).toHaveLength(0)
        done()
    })
})

test('rendering: open youwol menu', (done) => {
    document.body.innerHTML = ''

    const state = new TopBannerState()
    const bannerView = new BannerView({ state })
    document.body.appendChild(render(bannerView))

    const youwolMenuView = getFromDocument<YouwolMenuView>(
        '.' + YouwolMenuView.ClassSelector,
    )

    youwolMenuView.dispatchEvent(new Event('click', { bubbles: true }))
    let sections = Array.from(
        document.querySelectorAll('.' + MenuSection.ClassSelector),
    )
    expect(sections).toHaveLength(2)

    const burgerItems = queryFromDocument<MenuItem>(
        '.' + MenuItem.ClassSelector,
    )

    expect(burgerItems).toHaveLength(3)
    youwolMenuView.onmouseleave()
    sections = queryFromDocument<MenuSection>('.' + MenuSection.ClassSelector)

    expect(sections).toHaveLength(0)
    done()
})

test('combo toggle', (done) => {
    document.body.innerHTML = ''

    const state = new TopBannerState()
    const bannerView = new BannerView({ state })
    document.body.appendChild(render(bannerView))

    const toggles = queryFromDocument<FaIconToggleView<ViewMode>>(
        '.' + FaIconToggleView.ClassSelector,
    )
    expect(toggles).toHaveLength(3)
    toggles[0].dispatchEvent(new Event('click'))
    state.viewMode$.subscribe((mode) => {
        expect(mode).toEqual(toggles[0].value)
        done()
    })
})
