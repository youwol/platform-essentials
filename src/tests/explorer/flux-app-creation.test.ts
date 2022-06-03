// eslint-disable-next-line eslint-comments/disable-enable-pair -- to not have problem
/* eslint-disable jest/no-done-callback -- eslint-comment It is required because */

import '../mock-requests'
import { ItemNode } from '../../lib/explorer'
import { resetPyYouwolDbs$ } from '../common'
import {
    expectSnapshot,
    mkFluxApp,
    popupInfo,
    rm,
    selectItem,
    shell$,
} from './shell'

export class FluxProjectNode extends ItemNode<any> {}

beforeEach((done) => {
    resetPyYouwolDbs$().subscribe(() => {
        done()
    })
})

test('Create, info & delete flux application', (done) => {
    const projectName = 'my flux-app'
    shell$()
        .pipe(
            mkFluxApp(projectName),
            expectSnapshot({
                items: (items) => {
                    expect(items).toHaveLength(1)
                    const fluxNode = items[0] as FluxProjectNode
                    expect(fluxNode.kind).toBe('flux-project')
                    expect(fluxNode.name).toEqual(projectName)
                },
            }),
            selectItem(projectName),
            popupInfo(),
            expectSnapshot({
                assetCardView: (assetCardView) => {
                    expect(assetCardView).toBeTruthy()
                    expect(assetCardView.withTabs.Permissions).toBeTruthy()
                    expect(assetCardView.withTabs.Dependencies).toBeTruthy()
                    expect(assetCardView.asset.kind).toBe('flux-project')
                    expect(assetCardView.asset.name).toEqual(projectName)
                },
            }),
            rm('my flux-app'),
            expectSnapshot({
                items: (items) => {
                    expect(items).toHaveLength(0)
                },
            }),
        )
        .subscribe(() => {
            done()
        })
})
