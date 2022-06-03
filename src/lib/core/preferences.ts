import { RequestsExecutor } from './requests-executot'
import { getEnvironmentSingleton, Preferences } from './environment'
import { from, ReplaySubject } from 'rxjs'
import { map, mergeMap } from 'rxjs/operators'
import * as cdnClient from '@youwol/cdn-client'
import * as httpClients from '@youwol/http-clients'
import * as rxjs from 'rxjs'
import * as fluxView from '@youwol/flux-view'

export class PreferencesFacade {
    static defaultBg =
        "<svg xmlns='http://www.w3.org/2000/svg'  width='200' height='200' viewBox='0 0 200 200'><rect fill='#487346' width='200' height='200'/><g fill-opacity='1'><polygon  fill='#4c8e43' points='100 57.1 64 93.1 71.5 100.6 100 72.1'/><polygon  fill='#6aac5f' points='100 57.1 100 72.1 128.6 100.6 136.1 93.1'/><polygon  fill='#4c8e43' points='100 163.2 100 178.2 170.7 107.5 170.8 92.4'/><polygon  fill='#6aac5f' points='100 163.2 29.2 92.5 29.2 107.5 100 178.2'/><path  fill='#89CC7C' d='M100 21.8L29.2 92.5l70.7 70.7l70.7-70.7L100 21.8z M100 127.9L64.6 92.5L100 57.1l35.4 35.4L100 127.9z'/><polygon  fill='#768c3a' points='0 157.1 0 172.1 28.6 200.6 36.1 193.1'/><polygon  fill='#96ac58' points='70.7 200 70.8 192.4 63.2 200'/><polygon  fill='#B6CC76' points='27.8 200 63.2 200 70.7 192.5 0 121.8 0 157.2 35.3 192.5'/><polygon  fill='#96ac58' points='200 157.1 164 193.1 171.5 200.6 200 172.1'/><polygon  fill='#768c3a' points='136.7 200 129.2 192.5 129.2 200'/><polygon  fill='#B6CC76' points='172.1 200 164.6 192.5 200 157.1 200 157.2 200 121.8 200 121.8 129.2 192.5 136.7 200'/><polygon  fill='#768c3a' points='129.2 0 129.2 7.5 200 78.2 200 63.2 136.7 0'/><polygon  fill='#B6CC76' points='200 27.8 200 27.9 172.1 0 136.7 0 200 63.2 200 63.2'/><polygon  fill='#96ac58' points='63.2 0 0 63.2 0 78.2 70.7 7.5 70.7 0'/><polygon  fill='#B6CC76' points='0 63.2 63.2 0 27.8 0 0 27.8'/></g></svg>"

    static defaultTsSrcSettings = `
import {Preferences} from './environment'

async function preferences({fluxView, cdnClient, httpClients, rxjs}) : Promise<Preferences> {
    
    return {
        cssTheme: 'not used for now',
        profile:{
            avatar:{
                class:'fas fa-user fa-2x'
            }
        },
        desktop:{
            // from https://www.svgbackgrounds.com/
            backgroundView: {
                style:{
                    backgroundColor: '#487346',
                    backgroundImage: \`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cg %3E%3Cpolygon fill='%234c8e43' points='100 57.1 64 93.1 71.5 100.6 100 72.1'/%3E%3Cpolygon fill='%236aac5f' points='100 57.1 100 72.1 128.6 100.6 136.1 93.1'/%3E%3Cpolygon fill='%234c8e43' points='100 163.2 100 178.2 170.7 107.5 170.8 92.4'/%3E%3Cpolygon fill='%236aac5f' points='100 163.2 29.2 92.5 29.2 107.5 100 178.2'/%3E%3Cpath fill='%2389CC7C' d='M100 21.8L29.2 92.5l70.7 70.7l70.7-70.7L100 21.8z M100 127.9L64.6 92.5L100 57.1l35.4 35.4L100 127.9z'/%3E%3Cpolygon fill='%23768c3a' points='0 157.1 0 172.1 28.6 200.6 36.1 193.1'/%3E%3Cpolygon fill='%2396ac58' points='70.7 200 70.8 192.4 63.2 200'/%3E%3Cpolygon fill='%23B6CC76' points='27.8 200 63.2 200 70.7 192.5 0 121.8 0 157.2 35.3 192.5'/%3E%3Cpolygon fill='%2396ac58' points='200 157.1 164 193.1 171.5 200.6 200 172.1'/%3E%3Cpolygon fill='%23768c3a' points='136.7 200 129.2 192.5 129.2 200'/%3E%3Cpolygon fill='%23B6CC76' points='172.1 200 164.6 192.5 200 157.1 200 157.2 200 121.8 200 121.8 129.2 192.5 136.7 200'/%3E%3Cpolygon fill='%23768c3a' points='129.2 0 129.2 7.5 200 78.2 200 63.2 136.7 0'/%3E%3Cpolygon fill='%23B6CC76' points='200 27.8 200 27.9 172.1 0 136.7 0 200 63.2 200 63.2'/%3E%3Cpolygon fill='%2396ac58' points='63.2 0 0 63.2 0 78.2 70.7 7.5 70.7 0'/%3E%3Cpolygon fill='%23B6CC76' points='0 63.2 63.2 0 27.8 0 0 27.8'/%3E%3C/g%3E%3C/svg%3E")\`
                }
            },            
            topBannerView: {}
        }
    }
}
return preferences`

    static defaultJsSrcSettings = `
async function preferences({fluxView, cdnClient, httpClients, rxjs}){
    
    return {
        cssTheme: 'not used for now',
        profile:{
            avatar:{
                class:'fas fa-user fa-2x'
            }
        },
        desktop:{
            backgroundView: {
                style:{
                    backgroundColor: '#487346',
                    backgroundImage: \`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cg %3E%3Cpolygon fill='%234c8e43' points='100 57.1 64 93.1 71.5 100.6 100 72.1'/%3E%3Cpolygon fill='%236aac5f' points='100 57.1 100 72.1 128.6 100.6 136.1 93.1'/%3E%3Cpolygon fill='%234c8e43' points='100 163.2 100 178.2 170.7 107.5 170.8 92.4'/%3E%3Cpolygon fill='%236aac5f' points='100 163.2 29.2 92.5 29.2 107.5 100 178.2'/%3E%3Cpath fill='%2389CC7C' d='M100 21.8L29.2 92.5l70.7 70.7l70.7-70.7L100 21.8z M100 127.9L64.6 92.5L100 57.1l35.4 35.4L100 127.9z'/%3E%3Cpolygon fill='%23768c3a' points='0 157.1 0 172.1 28.6 200.6 36.1 193.1'/%3E%3Cpolygon fill='%2396ac58' points='70.7 200 70.8 192.4 63.2 200'/%3E%3Cpolygon fill='%23B6CC76' points='27.8 200 63.2 200 70.7 192.5 0 121.8 0 157.2 35.3 192.5'/%3E%3Cpolygon fill='%2396ac58' points='200 157.1 164 193.1 171.5 200.6 200 172.1'/%3E%3Cpolygon fill='%23768c3a' points='136.7 200 129.2 192.5 129.2 200'/%3E%3Cpolygon fill='%23B6CC76' points='172.1 200 164.6 192.5 200 157.1 200 157.2 200 121.8 200 121.8 129.2 192.5 136.7 200'/%3E%3Cpolygon fill='%23768c3a' points='129.2 0 129.2 7.5 200 78.2 200 63.2 136.7 0'/%3E%3Cpolygon fill='%23B6CC76' points='200 27.8 200 27.9 172.1 0 136.7 0 200 63.2 200 63.2'/%3E%3Cpolygon fill='%2396ac58' points='63.2 0 0 63.2 0 78.2 70.7 7.5 70.7 0'/%3E%3Cpolygon fill='%23B6CC76' points='0 63.2 63.2 0 27.8 0 0 27.8'/%3E%3C/g%3E%3C/svg%3E")\`
                }
            },
            topBannerView: {}
        }
    }
}

return preferences`

    static setPreferencesScript({
        tsSrc,
        jsSrc,
    }: {
        tsSrc: string
        jsSrc: string
    }) {
        RequestsExecutor.savePreferencesScript({ tsSrc, jsSrc }).subscribe()
        new Function(jsSrc)()({ rxjs, cdnClient, httpClients, fluxView }).then(
            (preferences: Preferences) => {
                PreferencesFacade.getPreferences$().next(preferences)
            },
        )
    }

    static getPreferences$() {
        if (getEnvironmentSingleton().preferences$) {
            return getEnvironmentSingleton().preferences$
        }
        getEnvironmentSingleton().preferences$ = new ReplaySubject<Preferences>(
            1,
        )

        RequestsExecutor.getPreferencesScript()
            .pipe(
                map(({ jsSrc }) =>
                    jsSrc
                        ? { jsSrc }
                        : {
                              jsSrc: PreferencesFacade.defaultJsSrcSettings,
                          },
                ),
                mergeMap(({ jsSrc }) =>
                    from(
                        Function(jsSrc)()({
                            rxjs,
                            cdnClient,
                            httpClients,
                            fluxView,
                        }),
                    ),
                ),
            )
            .subscribe((preferences: Preferences) => {
                console.log('preferences', preferences)
                getEnvironmentSingleton().preferences$.next(preferences)
            })
        return getEnvironmentSingleton().preferences$
    }

    static getPreferencesScript$() {
        return RequestsExecutor.getPreferencesScript().pipe(
            map(({ jsSrc, tsSrc }) =>
                jsSrc
                    ? { jsSrc, tsSrc }
                    : {
                          jsSrc: PreferencesFacade.defaultJsSrcSettings,
                          tsSrc: PreferencesFacade.defaultTsSrcSettings,
                      },
            ),
        )
    }
}
