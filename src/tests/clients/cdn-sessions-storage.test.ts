import {
    CdnSessionsStorageClient,
    HealthzResponse,
} from '../../lib/clients/cdn-sessions-storage'

import { resetPyYouwolDbs$ } from '../common'
import '../mock-requests'

const storage = new CdnSessionsStorageClient()

beforeAll(async (done) => {
    resetPyYouwolDbs$().subscribe(() => {
        done()
    })
})

const testData = {
    content: 'some content',
}

test('query healthz', (done) => {
    storage.getHealthz().subscribe((resp: HealthzResponse) => {
        expect(resp.status).toBe('cdn-sessions-storage ok')
        done()
    })
})

test('get data', (done) => {
    storage.applications
        .getData('@youwol/platform-essentials', 'integration-tests')
        .subscribe((resp: any) => {
            expect(resp).toEqual({})
            done()
        })
})

test('post data', (done) => {
    storage.applications
        .postData('@youwol/platform-essentials', 'integration-tests', testData)
        .subscribe((resp: {}) => {
            expect(resp).toEqual({})
            done()
        })
})

test('get data', (done) => {
    storage.applications
        .getData('@youwol/platform-essentials', 'integration-tests')
        .subscribe((resp: any) => {
            expect(resp).toEqual(testData)
            done()
        })
})
