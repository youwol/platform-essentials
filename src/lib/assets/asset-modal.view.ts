import { HTMLElement$, render, VirtualDOM } from '@youwol/flux-view'
import { Modal } from '@youwol/fv-group'
import { merge, ReplaySubject } from 'rxjs'
import { take } from 'rxjs/operators'
import { Asset } from '../clients/assets-gateway'
import { AssetCardView } from './asset-card/asset-card.view'

/**
 *
 * @param parameters
 * @param parameters.asset$ observable on asset
 * @returns
 */
export function popupAssetModalView(parameters: {
    asset: Asset
    actionsFactory: (asset: Asset) => VirtualDOM
    withTabs?: { [key: string]: VirtualDOM }
    forceReadonly?: boolean
}) {
    const modalState = new Modal.State()
    const assetOutput$ = new ReplaySubject<Asset>(1)

    const view = new Modal.View({
        state: modalState,
        contentView: () => new AssetCardView({ ...parameters, assetOutput$ }),
        connectedCallback: (elem: HTMLDivElement & HTMLElement$) => {
            elem.children[0].classList.add('w-100')
            // https://stackoverflow.com/questions/63719149/merge-deprecation-warning-confusion
            merge(...[modalState.cancel$, modalState.ok$])
                .pipe(take(1))
                .subscribe(() => {
                    modalDiv.remove()
                })
        },
    } as any)
    const modalDiv = render(view)
    document.querySelector('body').appendChild(modalDiv)
    return assetOutput$
}
