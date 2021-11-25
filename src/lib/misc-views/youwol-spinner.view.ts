

export function ywSpinnerView({ classes, size, duration }: { classes: string, size: string, duration: number }) {
    let logoUrl = '/api/assets-gateway/raw/package/QHlvdXdvbC9mbHV4LXlvdXdvbC1lc3NlbnRpYWxz/latest/assets/images/logo_YouWol_white.png'

    return {
        class: classes,
        style: {
            width: size,
            height: size,
        },
        children: [
            {
                tag: 'div',
                class: `my-auto image`,
                innerHTML: ` <svg id="" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 109.58 121.1" style="transform:translate(0px,-4px)">
                <defs></defs>
                <title>logo_YouWol_white</title>
                <polygon class="fv-fill-primary" points="109.58 94.68 109.58 84.14 91.39 73.64 109.58 63.14 109.58 42.06 63.95 68.41 63.94 68.41 63.94 121.1 82.2 110.56 82.2 89.41 100.52 99.99 109.58 94.76 109.58 94.68"/>
                <polygon class="fv-fill-primary" points="54.8 52.69 9.17 26.35 27.42 15.81 45.61 26.31 45.61 5.31 54.73 0.04 54.8 0 63.86 5.23 63.86 26.39 82.18 15.81 100.43 26.35 54.8 52.7 54.8 52.69"/>
                <polygon class="fv-fill-primary" points="0.07 94.72 9.2 99.99 27.38 89.49 27.38 110.56 45.64 121.1 45.64 68.41 45.64 68.41 0.01 42.06 0.01 63.14 18.33 73.64 0 84.22 0 94.68 0.07 94.72"/>
                </svg>`,
                //src: logoUrl,
                style: {
                    position: 'absolute',
                    width: size,
                    height: size,
                    animation: `spin ${duration}s linear infinite`,
                }
            }
        ]
    }
}
