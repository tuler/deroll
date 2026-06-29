import { defineConfig } from 'vocs/config';

export default defineConfig({
    title: 'node-libcmt',
    description:
        'Node.js bindings for libcmt, the Cartesi Machine guest rollup library',
    // pages live in docs/pages (srcDir 'docs' + default pagesDir 'pages')
    srcDir: 'docs',
    // static HTML output (dist/public) so the site can be hosted on GitHub
    // Pages; BASE_PATH is set by CI to the Pages subpath (/<repo-name>)
    renderStrategy: 'full-static',
    ...(process.env.BASE_PATH ? { basePath: process.env.BASE_PATH } : {}),
    socials: [
        {
            icon: 'github',
            link: 'https://github.com/tuler/libcmt-node',
        },
    ],
    sidebar: [
        {
            text: 'Introduction',
            link: '/',
        },
        {
            text: 'Getting Started',
            link: '/getting-started',
        },
        {
            text: 'User Guide',
            items: [
                { text: 'Handling Requests', link: '/guide/handling-requests' },
                { text: 'Emitting Outputs', link: '/guide/emitting-outputs' },
                { text: 'Testing on the Host', link: '/guide/testing' },
                { text: 'Running in the Cartesi Machine', link: '/guide/cartesi-machine' },
            ],
        },
        {
            text: 'Reference',
            items: [
                { text: 'new Rollup()', link: '/reference/rollup' },
                { text: 'run', link: '/reference/run' },
                { text: 'finish', link: '/reference/finish' },
                { text: 'emitVoucher', link: '/reference/emit-voucher' },
                { text: 'emitDelegateCallVoucher', link: '/reference/emit-delegate-call-voucher' },
                { text: 'emitNotice', link: '/reference/emit-notice' },
                { text: 'emitReport', link: '/reference/emit-report' },
                { text: 'emitException', link: '/reference/emit-exception' },
                { text: 'progress', link: '/reference/progress' },
                { text: 'gio', link: '/reference/gio' },
                { text: 'Merkle persistence', link: '/reference/merkle' },
                { text: 'close', link: '/reference/close' },
                { text: 'Types & Constants', link: '/reference/types' },
            ],
        },
    ],
});
