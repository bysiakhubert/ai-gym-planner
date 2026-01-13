# Pull Request Workflow Setup Checklist

## Prerequisites

- [ ] Repository is on GitHub
- [ ] Main branch is `master`
- [ ] Node.js version is specified in `.nvmrc`
- [ ] Project has `package.json` with required scripts

## GitHub Configuration

### 1. Create Integration Environment

1. Go to repository **Settings**
2. Click **Environments** in left sidebar
3. Click **New environment**
4. Name it: `integration`
5. Click **Configure environment**

### 2. Add Environment Secrets

In the `integration` environment, add the following secrets:

#### Supabase Configuration
- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_KEY` - Supabase anon/public key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

#### E2E Test User Credentials
- [ ] `E2E_USERNAME_ID` - Test user UUID (from Supabase Auth)
- [ ] `E2E_USERNAME` - Test user email address
- [ ] `E2E_PASSWORD` - Test user password

### 3. Verify Workflow Permissions

1. Go to **Settings > Actions > General**
2. Under **Workflow permissions**, ensure:
   - [ ] "Read and write permissions" is selected
   - [ ] "Allow GitHub Actions to create and approve pull requests" is checked

## Workflow Files

- [ ] `.github/workflows/pull-request.yml` exists
- [ ] `.nvmrc` exists with Node.js version
- [ ] `package.json` has required scripts:
  - [ ] `lint`
  - [ ] `test:coverage`
  - [ ] `test:e2e`

## Testing the Workflow

### 1. Create a Test Branch

```bash
git checkout -b test/workflow-verification
```

### 2. Make a Small Change

```bash
echo "# Test" >> TEST.md
git add TEST.md
git commit -m "test: verify GitHub Actions workflow"
git push origin test/workflow-verification
```

### 3. Create Pull Request

1. Go to GitHub repository
2. Click **Pull requests**
3. Click **New pull request**
4. Select `test/workflow-verification` as source branch
5. Select `master` as target branch
6. Click **Create pull request**

### 4. Verify Workflow Execution

Check that all jobs run successfully:
- [ ] Lint job completes
- [ ] Unit test job completes
- [ ] E2E test job completes
- [ ] Status comment appears on PR

### 5. Check Artifacts

1. Go to the workflow run
2. Scroll to **Artifacts** section
3. Verify artifacts are available:
   - [ ] `unit-test-coverage`
   - [ ] `playwright-report`
   - [ ] `e2e-test-results`

## Troubleshooting

### Workflow doesn't trigger
- Verify `.github/workflows/pull-request.yml` is on `master` branch
- Check PR is targeting `master` branch
- Review repository Actions settings

### E2E tests fail with authentication errors
- Verify all secrets are set in `integration` environment
- Check secret names match exactly (case-sensitive)
- Ensure test user exists in Supabase Auth

### Status comment not posted
- Check workflow permissions in repository settings
- Verify `pull-requests: write` permission is granted
- Review workflow run logs for errors

### Browser installation fails
- Check Playwright version in `package.json`
- Verify Playwright config specifies correct browsers
- Review system dependencies installation

## Cleanup

After successful verification:

```bash
# Switch back to master
git checkout master

# Delete test branch locally
git branch -D test/workflow-verification

# Delete test branch remotely
git push origin --delete test/workflow-verification
```

Close the test PR on GitHub.

## Maintenance

### Regular Updates

Check for action updates quarterly:

```bash
# Check latest versions
curl -s https://api.github.com/repos/actions/checkout/releases/latest | grep tag_name
curl -s https://api.github.com/repos/actions/setup-node/releases/latest | grep tag_name
curl -s https://api.github.com/repos/actions/upload-artifact/releases/latest | grep tag_name
curl -s https://api.github.com/repos/actions/download-artifact/releases/latest | grep tag_name
curl -s https://api.github.com/repos/actions/github-script/releases/latest | grep tag_name
```

### Monitor Workflow Performance

Track metrics:
- Average workflow duration
- Success/failure rates
- Artifact sizes
- Action minutes usage

## Support

For issues:
1. Review workflow logs in GitHub Actions
2. Check documentation: `.ai/github-actions-workflow.md`
3. Test locally with same commands
4. Review GitHub Actions status page
