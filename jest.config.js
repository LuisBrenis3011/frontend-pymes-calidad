export default {
    testEnvironment: 'jsdom',
    transform: {
        '^.+\\.(js|jsx)$': 'babel-jest',
    },
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    },
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
    testEnvironmentOptions: {
        customExportConditions: [''],
    },
    collectCoverageFrom: [
        'src/**/*.{js,jsx}',
        '!src/main.jsx',
        '!src/**/*.test.{js,jsx}',
        '!src/**/__tests__/**',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
    extensionsToTreatAsEsm: ['.jsx'],
    moduleFileExtensions: ['js', 'jsx'],
    testMatch: [
        '**/__tests__/**/*.[jt]s?(x)',
        '**/?(*.)+(spec|test).[jt]s?(x)'
    ],
};