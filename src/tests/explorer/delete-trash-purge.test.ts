import '../mock-requests'
import { AssetsGatewayClient } from '../../lib/clients/assets-gateway/assets-gateway.client'

import { getPyYouwolBasePath, resetPyYouwolDbs } from '../common'

AssetsGatewayClient.staticBasePath = `${getPyYouwolBasePath()}/api/assets-gateway`
AssetsGatewayClient.staticHeaders = { 'py-youwol-local-only': true }

import { cd, deleteDrive, mkDir, mkFluxApp, purgeTrash, rm, selectItem, shell$ } from './shell'


beforeEach(async (done) => {

    jest.setTimeout(900 * 1000)
    resetPyYouwolDbs().then(() => {
        done()
    })
})


test('delete drive', (done) => {

    shell$().pipe(
        cd('..'),
        cd('..'),
        selectItem('Default drive'),
        deleteDrive()
    ).subscribe(() => {
        done()
    })
})


test('Create, delete, clear trash & purge drive', (done) => {

    let projectName = 'my flux-app'
    shell$().pipe(
        mkDir("test folder"),
        cd('test folder'),
        mkFluxApp(projectName),
        cd('..'),
        rm("test folder"),
        cd('..'),
        cd('Trash'),
        purgeTrash(),
        cd('..'),
        cd('..'),
        selectItem('Default drive'),
        deleteDrive()
    ).subscribe(() => {
        done()
    })
})

