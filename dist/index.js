/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 332:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 678:
/***/ ((module) => {

module.exports = eval("require")("@actions/exec");


/***/ }),

/***/ 584:
/***/ ((module) => {

module.exports = eval("require")("node-fetch");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// authzbot-action/index.js

const core = __nccwpck_require__(332);
const exec = __nccwpck_require__(678);
const fetch = __nccwpck_require__(584);

// A simple function to validate branch names
function isValidBranchName(branch) {
  // Disallow spaces, tilde, caret, colon, question mark, asterisk, bracket, or backslash
  const forbiddenChars = /[\s~^:?*\[\\]/;
  if (forbiddenChars.test(branch)) {
    return false;
  }
  // Branch must not start or end with a slash
  if (branch.startsWith('/') || branch.endsWith('/')) {
    return false;
  }
  // Disallow consecutive slashes
  if (branch.includes('//')) {
    return false;
  }
  // Disallow branch names that are just . or ..
  if (branch === '.' || branch === '..') {
    return false;
  }
  return true;
}

(async () => {
  try {
    const repo = core.getInput('repo', { required: true });
    const targetBranch = core.getInput('target_branch', { required: true });
    const message = core.getInput('message', { required: true });
    const autoMerge = core.getBooleanInput('auto_merge') || false;
    const commands = core.getInput('commands', { required: true });
    const fpMessage = `AuthzBot: ${message}`;
    const pushId = `${process.env.GITHUB_REPOSITORY}/${process.env.GITHUB_RUN_ID}`;
    const prBranch = core.getInput('pr_branch') || `authzbot/${pushId}`;

    // Validate the branch name
    if (!isValidBranchName(prBranch)) {
      throw new Error(`Invalid branch name: "${prBranch}". Please use a branch name without spaces or forbidden characters.`);
    }

    // Retrieve the OIDC token from GitHub Actions
    let idToken;
    try {
      idToken = await core.getIDToken();
    } catch (error) {
      core.setFailed(
        `Failed to retrieve OIDC token. Please ensure that your workflow job has the "id-token: write" permission enabled. Error: ${error.message}`
      );
      return;
    }

    // Step 1: Get GitHub App installation token
    const response = await fetch('https://api.authz.bot/v1/services/github/tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ repo })
    });
    const data = await response.json();
    if (!response.ok) {
      core.setFailed(`Auth error: ${data.error || response.statusText}`);
      return;
    }
    const token = data.token;

    // Step 2: Clone the repo
    await exec.exec(`git clone --branch ${targetBranch} https://x-access-token:${token}@github.com/${repo}.git`);
    const folder = repo.split('/')[1];
    process.chdir(folder);

    // Step 3: Create new branch
    await exec.exec(`git checkout -b ${prBranch}`);
    await exec.exec('git config user.email "actions@authz.bot"');
    await exec.exec('git config user.name "AuthzBot"');

    // Step 4: Execute user-defined shell commands
    await exec.exec('bash', ['-c', commands]);

    // Step 5: Commit and push
    await exec.exec('git add .');
    await exec.exec('git', ['commit', '-m', fpMessage]);
    await exec.exec(`git push origin ${prBranch}`);

    // Step 6: Create pull request
    const [owner, repoName] = repo.split('/');
    const prBody = {
      title: fpMessage,
      head: prBranch,
      base: targetBranch,
      body: [
        '## Source Info',
        '',
        '| Field         | Value |',
        '|---------------|-------|',
        `| Repo          | ${process.env.GITHUB_REPOSITORY} |`,
        `| Workflow Name | ${process.env.GITHUB_WORKFLOW} |`,
        `| Workflow Run  | [View run](https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}) |`
      ].join('\n')
    };

    const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(prBody)
    });

    const prData = await prResponse.json();

    if (!prResponse.ok) {
      core.setFailed(`Failed to create pull request: ${prData.message}`);
      return;
    }

    core.setOutput('pull_request_url', prData.html_url);

    // Step 7: (optional) Auto-merge pull request
    if (autoMerge) {
      const prNumber = prData.number;
      const mergeResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls/${prNumber}/merge`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({ commit_title: fpMessage })
      });

      if (!mergeResponse.ok) {
        const mergeData = await mergeResponse.json();
        core.warning(`PR created but auto-merge failed: ${mergeData.message}`);
      }
    }

  } catch (err) {
    core.setFailed(err.message);
  }
})();

module.exports = __webpack_exports__;
/******/ })()
;