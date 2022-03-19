// eslint-disable-next-line eslint-comments/disable-enable-pair -- to not have problem
/* eslint-disable jest/no-done-callback -- eslint-comment It is required because */

import '../mock-requests'
import { resetPyYouwolDbs$ } from '../common'

import {
    cd,
    deleteDrive,
    mkDir,
    mkFluxApp,
    purgeTrash,
    rm,
    selectItem,
    shell$,
} from './shell'

beforeEach((done) => {
    jest.setTimeout(900 * 1000)
    resetPyYouwolDbs$().subscribe(() => {
        done()
    })
})

// eslint-disable-next-line jest/expect-expect -- eslint-comment there are tests in each step
test('delete drive', (done) => {
    shell$()
        .pipe(cd('..'), cd('..'), selectItem('Default drive'), deleteDrive())
        .subscribe(() => {
            done()
        })
})

// eslint-disable-next-line jest/expect-expect -- eslint-comment there are tests in each step
test('Create, delete, clear trash & purge drive', (done) => {
    const projectName = 'my flux-app'
    shell$()
        .pipe(
            mkDir('test folder'),
            cd('test folder'),
            mkFluxApp(projectName),
            cd('..'),
            rm('test folder'),
            cd('..'),
            cd('Trash'),
            purgeTrash(),
            cd('..'),
            cd('..'),
            selectItem('Default drive'),
            deleteDrive(),
        )
        .subscribe(() => {
            done()
        })
})
