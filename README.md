# Create GitHub PR Action

A GitHub Action that automates the process of pushing changes to a repository and creating pull requests using the AuthzBot GitHub App.

## Features

- Push changes to any repository that AuthzBot has been granted access to
- Run custom shell commands in the target repository
- Automatically create pull requests
- Optionally auto-merge pull requests
- Secure authentication using GitHub's OIDC tokens

## Usage

This action is particularly useful for updating configuration in one repository based on changes in another. For example, updating environment configuration when a new version is released:

```yaml
name: Update Stage Environment
on:
  release:
    types: [published]

jobs:
  update-config:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for OIDC token authentication
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Update Stage Environment
        uses: authzbot/create-github-pr@v1
        with:
          repo: 'myorg/environment-config'  # Repository containing environment configs
          target_branch: 'main'
          commands: |
            # Update the version in the stage environment config
            sed -i "s/version: .*/version: ${{ github.event.release.tag_name }}/" stage.yaml
          message: 'Update Stage environment to version ${{ github.event.release.tag_name }}'
          auto_merge: 'true'  # Auto-merge if tests pass
```

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `repo` | Yes | Target repository in the format `owner/repository` |
| `target_branch` | Yes | The branch to target for changes |
| `pr_branch` | No | Custom branch name for the PR. Defaults to `authzbot/source_repo/action_id` |
| `commands` | Yes | Multiline shell commands to run in the target repository |
| `message` | Yes | Message to use for commit and PR |
| `auto_merge` | No | Whether to automatically merge the PR. Defaults to `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `pull_request_url` | URL of the created pull request |

## Authentication

This action uses GitHub's OIDC tokens for secure authentication. Make sure to:

1. Enable the `id-token: write` permission in your workflow
2. Have the AuthzBot GitHub App installed on the target repository

## Example Use Cases

- Automated dependency updates
- Configuration file updates
- Documentation updates
- Automated code formatting
- Scheduled maintenance tasks

## Security

- Uses GitHub's OIDC tokens for secure authentication
- Validates branch names for security
- Runs in an isolated environment
- Requires explicit permissions

## License

[MIT](LICENSE) 
