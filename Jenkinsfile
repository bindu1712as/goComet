pipeline {

    agent any

    tools {
        nodejs 'Node22'
    }

    parameters {
        choice(
            name: 'FRAMEWORK',
            choices: ['UI', 'API'],
            description: 'Select framework to run'
        )

        string(
            name: 'TEST_FILE',
            defaultValue: '',
            description: 'Optional test file (example: tests/search.spec.ts)'
        )
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main',
                url: 'https://github.com/bindu1712as/goComet.git'
            }
        }

        stage('Run Tests') {
            steps {
                script {

                    if (params.FRAMEWORK == 'UI') {

                        dir('goCometUI') {

                            bat 'npm ci'
                            bat 'npx playwright install'

                            if (params.TEST_FILE?.trim()) {
                                bat "npx playwright test ${params.TEST_FILE}"
                            } else {
                                bat 'npx playwright test'
                            }
                        }

                    } else {

                        dir('goCometAPI') {

                            bat 'npm ci'

                            if (params.TEST_FILE?.trim()) {
                                bat "npx playwright test ${params.TEST_FILE}"
                            } else {
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

            publishHTML([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'goCometUI/playwright-report',
                reportFiles: 'index.html',
                reportName: 'UI Report'
            ])

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