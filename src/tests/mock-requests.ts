import { RootRouter } from '@youwol/http-clients'
import 'isomorphic-fetch'
import { getPyYouwolBasePath } from './common'
;(window as unknown)['@youwol/cdn-client'] = {}

if (!globalThis.fetch) {
    globalThis.fetch = fetch
    globalThis.Headers = Headers
    globalThis.Request = Request
    globalThis.Response = Response
}
RootRouter.HostName = getPyYouwolBasePath()
RootRouter.Headers = { 'py-youwol-local-only': 'true' }
