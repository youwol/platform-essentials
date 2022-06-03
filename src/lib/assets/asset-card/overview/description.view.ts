import { install, LoadingScreenView } from '@youwol/cdn-client'
import { attr$, child$, HTMLElement$, VirtualDOM } from '@youwol/flux-view'
import { BehaviorSubject, from, Observable } from 'rxjs'
import { AssetWithPermissions } from '../models'
import { tap } from 'rxjs/operators'

export class AssetDescriptionView implements VirtualDOM {
    static ClassSelector = 'asset-description-view'

    public readonly class = `${AssetDescriptionView.ClassSelector} w-100 border rounded`
    public readonly style = {
        position: 'relative',
    }
    public readonly children: VirtualDOM[]
    public readonly description$: BehaviorSubject<string>
    public readonly asset: AssetWithPermissions
    public readonly forceReadonly: boolean
    public readonly onclick = (event) => {
        event.stopPropagation()
    }

    constructor(params: {
        description$: BehaviorSubject<string>
        asset: AssetWithPermissions
        outsideClick$: Observable<MouseEvent>
        forceReadonly?: boolean
    }) {
        Object.assign(this, params)
        this.children = [
            {
                class: 'fv-bg-background fv-xx-lighter h-100 w-100',
                style: { opacity: '0.5', position: 'absolute', zIndex: '-1' },
            },
            this.asset.permissions.write && !this.forceReadonly
                ? new DescriptionEditableView({
                      description$: this.description$,
                      outsideClick$: params.outsideClick$,
                  })
                : AssetDescriptionView.readOnlyView(this.description$),
        ]
    }

    static readOnlyView(
        description$: BehaviorSubject<string>,
        params: { [k: string]: unknown } = {},
    ) {
        return {
            class: 'p-2',
            children: [
                {
                    innerHTML: attr$(description$, (d) => window['marked'](d)),
                    ...params,
                },
            ],
        }
    }
}

function fetchDependencies$(
    loadingScreenContainer: HTMLDivElement,
): Observable<Window> {
    const loadingScreen = new LoadingScreenView({
        container: loadingScreenContainer,
        logo: `<div style='font-size:x-large'>Markdown</div>`,
        wrapperStyle: {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            'font-weight': 'bolder',
        },
    })
    loadingScreen.render()

    return from(
        install(
            {
                modules: ['codemirror'],
                scripts: [
                    'codemirror#5.52.0~mode/javascript.min.js',
                    'codemirror#5.52.0~mode/markdown.min.js',
                    'codemirror#5.52.0~mode/css.min.js',
                    'codemirror#5.52.0~mode/xml.min.js',
                    'codemirror#5.52.0~mode/htmlmixed.min.js',
                    'codemirror#5.52.0~mode/gfm.min.js',
                ],
                css: [
                    'codemirror#5.52.0~codemirror.min.css',
                    'codemirror#5.52.0~theme/blackboard.min.css',
                ],
            },
            {
                onEvent: (ev) => {
                    loadingScreen.next(ev)
                },
            },
        ),
    ).pipe(
        tap(() => {
            loadingScreen.done()
        }),
    )
}

class DescriptionEditableView implements VirtualDOM {
    static ClassSelector = 'description-editable-view'
    public readonly class = `${DescriptionEditableView.ClassSelector} `
    public readonly children: VirtualDOM[]
    public readonly editionMode$ = new BehaviorSubject(false)

    public readonly description$: BehaviorSubject<string>

    public readonly outsideClick$: Observable<MouseEvent>

    public readonly configurationCodeMirror = {
        value: '',
        mode: 'markdown',
        lineNumbers: false,
        theme: 'blackboard',
        lineWrapping: true,
        indentUnit: 4,
    }
    editor

    constructor(params: {
        description$: BehaviorSubject<string>
        outsideClick$: Observable<MouseEvent>
    }) {
        Object.assign(this, params)

        this.children = [
            child$(
                this.editionMode$ /*.pipe(
                    mergeMap((editionMode) =>
                        editionMode
                            ? fetchDependencies$().pipe(mapTo(editionMode))
                            : of(editionMode),
                    ),
                )*/,
                (editionMode) => {
                    return editionMode
                        ? {
                              class: 'w-100',
                              style: {
                                  height: '300px',
                              },
                              connectedCallback: (
                                  elem: HTMLDivElement & HTMLElement$,
                              ) => {
                                  fetchDependencies$(elem).subscribe(() => {
                                      const config = {
                                          ...this.configurationCodeMirror,
                                          value: this.description$.getValue(),
                                      }
                                      this.editor = window['CodeMirror'](
                                          elem,
                                          config,
                                      )
                                  })
                                  elem.ownSubscriptions(
                                      this.outsideClick$.subscribe(() => {
                                          this.editionMode$.next(false)
                                          this.description$.next(
                                              this.editor.getValue(),
                                          )
                                      }),
                                  )
                              },
                          }
                        : AssetDescriptionView.readOnlyView(this.description$, {
                              ondblclick: () => this.editionMode$.next(true),
                          })
                },
            ),
        ]
    }
}
