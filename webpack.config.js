/*** Code Review
 * Library
    * webpack-node-externals : 외부모듈을 번들링에서 제외시킬 수 있는 라이브러리
    * tsconfig-paths-webpack-plugin : Typescript 에서 별칭을 (경로 단축) 사용하면, 번들링하는 웹펙에서도 이를 인지 할 수 있도록 해줘야한다. 이를 지원.
 * 개선사항 TODO
    * 
*/

const path = require('path');
const nodeExternals = require('webpack-node-externals');
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

module.exports = {
    // webpack은 해당 타겟을 커스텀하게 주게되면, 해당 환경에 맞는 변수들이 번들에 포함된다.
    target: 'node14.16',
    // 외부모듈 전부 번들에서 제외
    externals: [nodeExternals()],
    // 모듈을 해석하는데에 상세한 옵션을 조정할수있다. ( 흔히 우리가 사용하는 path.resolve 랑 비슷하다고 보면 될듯 )
    resolve : {
        // 특정 node_modules 를 지정할수 있다. 여기서는 그냥 기본 모듈 선택
        modules: ['node_modules'], 
        // 해당 확장자들을 가진 모듈을 해석하라고 명령.
        extensions: ['.mjs', '.js', '.jsx', '.json', '.ts', '.tsx'], 
        // 경롣 단축 TS 라이브러리 적용
        plugins: [new TsconfigPathsPlugin()],
    },
    //
    module: {
        rules: [
            // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
            {
                test: /\.(ts|tsx)$/,
                loader: 'ts-loader',
                options: {
                    transpileOnly: true,
                },
            },
        ],
    },
    entry: './src/server.ts',
    devtool : 'inline-source-map',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'build')
    },
}