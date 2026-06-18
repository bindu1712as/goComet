pipeline {

```
agent any

tools {
    nodejs 'Node22'
}

stages {

    stage('Checkout') {
        steps {
            git branch: 'main',
            url: 'https://github.com/bindu1712as/goComet.git'
        }
    }

    stage('UI Tests') {
        steps {
            dir('goCometUI') {
                bat 'npm ci'
                bat 'npx playwright install'
                bat 'npx playwright test'
            }
        }
    }

    stage('API Tests') {
        steps {
            dir('goCometAPI') {
                bat 'npm ci'
                bat 'npx playwright test'
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
```

}
