import { attr$, VirtualDOM } from '@youwol/flux-view'
import { BehaviorSubject } from 'rxjs'
import { AssetsGateway } from '@youwol/http-clients'
import { TextEditableView } from '../misc.view'

export class AssetTitleView implements VirtualDOM {
    static ClassSelector = 'asset-title-view'

    public readonly class = `${AssetTitleView.ClassSelector} w-100`
    public readonly asset: AssetsGateway.Asset
    public readonly children: VirtualDOM[]
    public readonly name$: BehaviorSubject<string>

    public readonly forceReadonly: boolean

    constructor(params: {
        name$: BehaviorSubject<string>
        asset: AssetsGateway.Asset
        forceReadonly?: boolean
    }) {
        Object.assign(this, params)

        this.children = [
            this.asset.permissions.write && !this.forceReadonly
                ? new TextEditableView({
                      text$: this.name$,
                      regularView: AssetTitleView.readOnlyView,
                  })
                : AssetTitleView.readOnlyView(this.name$),
        ]
    }

    static readOnlyView(name$: BehaviorSubject<string>) {
        return {
            tag: 'h1',
            class: 'text-center',
            innerText: attr$(name$, (name) => name),
        }
    }
}
