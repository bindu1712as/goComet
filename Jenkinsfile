pipeline {

    agent any

    tools {
        // Uses the globally configured Jenkins Node.js tool named "Node22".
        nodejs 'Node22'
    }

    parameters {
        // Select which project to execute in this run.
        choice(
            name: 'FRAMEWORK',
            choices: ['UI', 'API'],
            description: 'Select framework to run'
        )

        // Optional Playwright spec path to run a targeted test.
        string(
            name: 'TEST_FILE',
            defaultValue: '',
            description: 'Optional test file (example: tests/search.spec.ts)'
        )
    }

    stages {

        stage('Checkout') {
            steps {
                // Always checkout the canonical repository main branch.
                git branch: 'main',
                url: 'https://github.com/bindu1712as/goComet.git'
            }
        }

        stage('Run Tests') {
            steps {
                script {

                    // Run UI suite from goCometUI when FRAMEWORK=UI.
                    if (params.FRAMEWORK == 'UI') {

                        dir('goCometUI') {

                            bat 'npm install'
                            bat 'npx playwright install'

                            // If TEST_FILE is provided, run only that spec.
                            if (params.TEST_FILE?.trim()) {
                                bat "npx playwright test ${params.TEST_FILE}"
                            } else {
                                // Default: run complete UI test suite.
                                bat 'npx playwright test'
                            }
                        }

                    } else {

                        // Run API suite from goCometAPI when FRAMEWORK=API.
                        dir('goCometAPI') {

                            bat 'npm install'
                            bat 'npx playwright install'

                            // If TEST_FILE is provided, run only that spec.
                            if (params.TEST_FILE?.trim()) {
                                bat "npx playwright test ${params.TEST_FILE}"
                            } else {
                                // Default: run complete API test suite.
                                bat 'npx playwright test'
                            }
                        }
                    }
                }
            }
        }
    }

    post {

        always {

            // Publish UI Playwright HTML report if generated.
            publishHTML([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'goCometUI/playwright-report',
                reportFiles: 'index.html',
                reportName: 'UI Report'
            ])

            // Publish API Playwright HTML report if generated.
            publishHTML([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'goCometAPI/playwright-report',
                reportFiles: 'index.html',
                reportName: 'API Report'
            ])
        }
    }
}
