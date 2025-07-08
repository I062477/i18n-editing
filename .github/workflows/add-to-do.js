const util = require('util')
const exec = util.promisify(require('child_process').exec)
const fs = require('fs')

function isMessageBundleFile (filePath) {
  return filePath.endsWith('messagebundle.properties') || filePath.endsWith('i18n.properties')
}

async function checkUiComments (gitDiff) {
  let error = false

  const modifiedFiles = gitDiff.split('diff --git ')

  for (const fileDiff of modifiedFiles) {
    const lines = fileDiff.split('\n')
    let filePath = null
    let workingContent = ''
    let stagedContent = ''

    for (const line of lines) {
      if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
        filePath = line.slice(6)
        continue
      }

      if (line.startsWith('+') && !line.startsWith('+++')) {
        stagedContent += line + '\n'
      }
    }

    if (!filePath || !stagedContent || !isMessageBundleFile(filePath)) {
      continue
    }

    try {
      const { stdout: content } = await exec(`cat "${filePath}"`, { encoding: 'utf8' })
      workingContent = content
    } catch (error) {
      // If the file is newly added, it may not exist in the working directory.
    }

    const linesToCheck = stagedContent.split('\n')

    for (const line of linesToCheck) {
      if (line.startsWith('+') && line.trim() !== '+' && !line.startsWith('+++') && !line.startsWith('+#')) {
        const lineChanged = line.slice(1)
        workingContent = workingContent.replace(lineChanged, `${lineChanged} # TODO: UA Review`)
      }
    }

    fs.writeFileSync(filePath, workingContent)
  }
}

process.env.DIFF = `diff --git a/i18n/i18n.properties b/i18n/i18n.properties
index 4fb3142..d4f3608 100644
--- a/i18n/i18n.properties
+++ b/i18n/i18n.properties
@@ -1,5 +1,5 @@
#This is a comment in i18n.properties
SAVE=Save Buttonavvvvvadsa
-HELLO=Value
+HELLO=Valuedfdafd
WORLD=Hello World Value da
FOO=Bar`;

(async function () {
  const gitDiff = process.env.DIFF
  await checkUiComments(gitDiff)
})()