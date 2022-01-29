import {child$, HTMLElement$, render, VirtualDOM} from "@youwol/flux-view"
import {Modal} from "@youwol/fv-group"
import {combineLatest, from, merge} from "rxjs"
import {ywSpinnerView} from "../misc-views/youwol-spinner.view"
import {install} from '@youwol/cdn-client'
import {YouwolBannerState} from "./top-banner.view"
import {PlatformSettingsStore} from "../core/platform-settings"
import js_beautify from 'js-beautify'

/**
 * Base class of item in the menu
 */
export class MenuItem implements VirtualDOM {

    static ClassSelector = "menu-item"

    public readonly class = `row align-items-center fv-pointer fv-hover-text-focus px-3 ${MenuItem.ClassSelector} `

    constructor({ withClasses }: { withClasses: string }) {

        this.class += withClasses
    }
}


/**
 * Preferences burger item
 */
export class SettingsMenuItem extends MenuItem {

    static ClassSelector = "settings-menu-item"

    children = [
        {
            class: "col-sm",
            innerText: "Settings"
        }
    ]

    onclick: () => void


    constructor(params: { state: YouwolBannerState }) {
        super({ withClasses: SettingsMenuItem.ClassSelector })

        this.onclick = () => {
            modalView(params.state)
        }
    }
}

function fetchCDN$() {
    const urls = [
        'codemirror#5.52.0~mode/javascript.min.js',
        'js-beautify#1.14.0~lang/html.min.js',
    ]
    return from(
        install(
            {
                modules: ['codemirror', 'js-beautify'], scripts: urls,
                css: [
                    "codemirror#5.52.0~codemirror.min.css",
                    "codemirror#5.52.0~theme/blackboard.min.css"
                ]
            },
            window,
        ),
    )
}


export function modalView(state: YouwolBannerState) {

    let configurationCodeMirror = {
        value: "",
        mode: 'javascript',
        lineNumbers: false,
        theme: 'blackboard',
        lineWrapping: true,
        indentUnit: 4
    }

    let modalState = new Modal.State()
    let view = new Modal.View({
        state: modalState,
        contentView: () => {
            return {
                class: 'p-3 rounded fv-color-focus fv-bg-background fv-text-primary',
                style: { width: '75vw', height: '50vh' },
                children: [
                    child$(
                        combineLatest([PlatformSettingsStore.settings$, fetchCDN$()]),
                        ([settings]) => ({
                            class: 'h-100 w-100',
                            connectedCallback: (elem: HTMLDivElement & HTMLElement$) => {

                                let value = js_beautify(JSON.stringify(settings))
                                let config = {
                                    configurationCodeMirror,
                                    value
                                }
                                let editor = window['CodeMirror'](elem, config)
                                let sub = merge(...[modalState.cancel$, modalState.ok$]).subscribe(() => {
                                    state.setSettings(editor.getValue())
                                    modalDiv.remove()
                                })
                                elem.ownSubscriptions(sub)
                            }
                        }),
                        {
                            untilFirst: ywSpinnerView({ classes: 'mx-auto', size: '50px', duration: 1.5 }) as any
                        }
                    ),
                ]
            }
        }
    } as any)
    let modalDiv = render(view)
    document.querySelector("body").appendChild(modalDiv)
    return view
}


