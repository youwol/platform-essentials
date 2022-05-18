import { DockableTabs } from '@youwol/fv-tabs'
import { GroupsTab, GroupTab, MySpaceTab } from './side-nav-tabs.view'
import { BehaviorSubject } from 'rxjs'
import { map, shareReplay } from 'rxjs/operators'
import { ExplorerState } from '../../explorer.state'
import { getFavoritesSingleton } from '../../../core'

export class SideNavState extends DockableTabs.State {
    public readonly explorerState: ExplorerState

    constructor(params: { explorerState: ExplorerState }) {
        const selectedTabGroup$ = new BehaviorSubject<string>('MySpace')

        const userDriveTab = new MySpaceTab({
            state: params.explorerState,
            selectedTab$: selectedTabGroup$,
        })
        const groupsTab = new GroupsTab({
            state: params.explorerState,
            selectedTab$: selectedTabGroup$,
        })

        const tabs$ = getFavoritesSingleton()
            .getGroups$()
            .pipe(
                map((groups) => {
                    return [
                        userDriveTab,
                        ...groups.map((group) => {
                            if (!groupTabsCached[group.id]) {
                                groupTabsCached[group.id] = new GroupTab({
                                    state: this.explorerState,
                                    group,
                                    selectedTab$: selectedTabGroup$,
                                })
                            }
                            return groupTabsCached[group.id]
                        }),
                        groupsTab,
                    ]
                }),
                shareReplay({ bufferSize: 1, refCount: true }),
            )

        super({
            disposition: 'left',
            viewState$: new BehaviorSubject<DockableTabs.DisplayMode>('pined'),
            tabs$: tabs$,
            selected$: selectedTabGroup$,
            persistTabsView: true,
        })
        Object.assign(this, params)

        let groupTabsCached = {}
    }
}

export class SideNavView extends DockableTabs.View {
    constructor(params: { state: ExplorerState }) {
        super({
            state: new SideNavState({
                explorerState: params.state,
            }),
        })
    }
}
