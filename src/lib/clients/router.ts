import { Observable } from "rxjs";
import { CommandType, RequestMonitoring, NativeRequestOptions, send$ } from "./utils";




export class Router {

    constructor(
        public readonly headers: { [key: string]: string },
        public readonly basePath: string
    ) { }

    static defaultMethodMapping: Record<CommandType, 'GET' | 'POST' | 'PUT' | 'DELETE'> = {
        'upload': 'POST',
        'download': 'GET',
        'query': 'GET',
        'create': 'PUT',
        'update': 'POST',
        'delete': 'DELETE'
    }

    getHeaders(headers = {}) {
        return new Headers({ ...this.headers, ...headers })
    }

    send$<TResponse>({ command, path, requestOptions, monitoring }:
        {
            command: CommandType,
            path: string,
            requestOptions?: NativeRequestOptions,
            monitoring?: RequestMonitoring
        }
    ): Observable<TResponse> {

        requestOptions = requestOptions || {}

        if (!requestOptions.method)
            requestOptions.method = Router.defaultMethodMapping[command]

        let headers = requestOptions.headers || {}

        return send$(
            command,
            `${this.basePath}${path}`,
            { ...requestOptions, headers },
            monitoring
        )
    }
}
