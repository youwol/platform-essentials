// eslint-disable-next-line eslint-comments/disable-enable-pair -- to not have problem
/* eslint-disable jest/no-done-callback -- eslint-comment It is required because */

import '../mock-requests'
import { render } from '@youwol/flux-view'
import { Subject } from 'rxjs'
import { AssetsGateway } from '@youwol/http-clients'
import { createStory, getFromDocument, resetPyYouwolDbs$ } from '../common'

let asset: AssetsGateway.Asset

class AssetCardView {
    static ClassSelector
    constructor(p) {}
}
beforeAll((done) => {
    resetPyYouwolDbs$()
        .pipe(createStory('test'))
        .subscribe((a) => {
            asset = a
            done()
        })
})

test('create asset card view', (done) => {
    const assetOutput$ = new Subject<AssetsGateway.Asset>()
    const view = new AssetCardView({
        asset,
        assetOutput$,
        forceReadonly: true,
    })
    document.body.appendChild(render(view))
    const elem = getFromDocument<AssetCardView>(
        `.${AssetCardView.ClassSelector}`,
    )
    expect(elem).toBeTruthy()
    done()
})
