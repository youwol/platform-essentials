import { child$, VirtualDOM } from '@youwol/flux-view'
import { Button } from '@youwol/fv-button'
import { ReplaySubject } from 'rxjs'
import { ExplorerState } from '../../explorer.state'
import { Action } from '../../actions.factory'
import { AnyFolderNode, AnyItemNode, DriveNode, GroupNode } from '../../nodes'
import { ChildApplicationAPI, IPlatformHandler } from '../../../platform.state'


export class ButtonView extends Button.View {

    class = 'fv-btn fv-bg-secondary-alt fv-hover-bg-secondary'

    constructor({ name, icon, withClass, enabled }: { name: string, icon: string, withClass: string, enabled: boolean }) {
        super({
            state: new Button.State(),
            contentView: () => ({
                class: 'd-flex align-items-center',
                children: [
                    { class: icon },
                    {
                        class: 'ml-1',
                        innerText: name
                    }
                ]
            }),
            disabled: !enabled
        } as any)
        this.class = `${this.class} ${withClass}`
    }
}

export class ActionsView implements VirtualDOM {

    static ClassSelector = "actions-view"

    public readonly class = `${ActionsView.ClassSelector} d-flex flex-column p-2 fv-bg-background-alt border-top h-100`
    public readonly style = {
        minWidth: '200px'
    }
    public readonly children: VirtualDOM[]

    public readonly state: ExplorerState

    public readonly platformHandler: IPlatformHandler

    public readonly displayedActions$: ReplaySubject<{
        item: AnyItemNode,
        folder: AnyFolderNode | DriveNode | GroupNode,
        actions: Action[]
    }>

    constructor(params: { state: ExplorerState }) {
        Object.assign(this, params)

        this.platformHandler = ChildApplicationAPI.getOsInstance()
        this.displayedActions$ = new ReplaySubject<{ item: AnyItemNode, folder: AnyFolderNode, actions: Action[] }>(1)
        let actions$ = this.state.actions$
        this.children = [
            child$(
                actions$,
                ({ item, folder, actions }) => {
                    return {
                        class: 'w-100',
                        children: actions.map(action => {
                            return new ActionBtnView({ action })
                        }),
                        connectedCallback: () => {
                            this.displayedActions$.next({ item, folder, actions })
                        }
                    }
                }
            )
        ]
    }
}

export class ActionBtnView extends ButtonView {

    static ClassSelector = "action-btn-view"

    public readonly action: Action

    constructor(params: { action: Action }) {
        super({
            name: params.action.name,
            icon: params.action.icon,
            withClass: `${ActionBtnView.ClassSelector} my-1 fv-border-primary w-100`,
            enabled: params.action.enable
        })
        Object.assign(this, params)
        this.state.click$.subscribe(() => this.action.exe())
    }
}

