module.exports = {
    root: true,
    env: {
        node: true,
        es6: true
    },
    rules: {
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'indent': [
            'warn',
            4,
            {'SwitchCase': 1}
        ],
        'linebreak-style': [
            'error',
            'unix'
        ],
        'no-multi-spaces': 'warn',
        'arrow-body-style': 'warn',
        'space-in-parens': 'warn',
        'no-var': "warn",
        'rest-spread-spacing': 'error',
        'no-spaced-func': 'error',
        'space-before-function-paren': 'warn',
        'quotes': [
            'warn',
            'single',
            {'allowTemplateLiterals': true}
        ],
        'semi': [
            'warn',
            'never'
        ],
        'no-console': [
            'warn'
        ]
    },
    parserOptions: {
        parser: 'babel-eslint',
        'ecmaVersion': 2017
    }
}