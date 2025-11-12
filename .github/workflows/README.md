# GitHub Actions Workflows

This directory contains GitHub Actions workflows for continuous integration and deployment.

## Workflows

### Build and Test (`build.yml`)

This workflow runs on every push to any branch and every pull request to any branch.

#### Jobs

**1. build-and-test**
- Runs on: `ubuntu-latest`
- Node.js version: 22.x
- Steps:
  1. **Type check** - Validates TypeScript types
  2. **Lint** - Runs ESLint
  3. **Build application** - Builds Next.js production bundle
  4. **Run tests** - Executes Jest test suite (only if build succeeds)
  5. **Upload coverage** - Uploads test coverage report as artifact

**2. docker-build**
- Runs on: `ubuntu-latest`
- Depends on: `build-and-test` job
- Steps:
  1. **Build Docker image** - Builds production Docker image
  2. **Test Docker image** - Verifies image was built correctly
  3. **Save Docker image** - Saves image as artifact (main branch only)
  4. **Upload Docker image** - Uploads image artifact (main branch only)

#### Triggers

- **Push**: Runs on push to any branch (`**`)
- **Pull Request**: Runs on PR to any branch (`**`)

#### Environment Variables

The workflow requires these environment variables for building:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | `test-secret-for-ci-builds-only` | JWT secret for authentication |
| `FINNHUB_API_KEY` | Yes | `test-key` | Finnhub API key for stock prices |
| `COINGECKO_API_KEY` | No | `''` | CoinGecko API key (optional) |

**Note**: Default values are provided for CI builds. Set GitHub Secrets for production use.

#### Setting GitHub Secrets

To set up secrets for the workflow:

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:
   - `JWT_SECRET`: Generate with `openssl rand -base64 32`
   - `FINNHUB_API_KEY`: Your Finnhub API key
   - `COINGECKO_API_KEY`: Your CoinGecko API key (optional)

#### Artifacts

The workflow produces two types of artifacts:

**1. Coverage Report**
- Name: `coverage-report`
- Retention: 7 days
- Contents: Jest test coverage HTML report
- Available on: All runs where tests complete

**2. Docker Image** (main branch only)
- Name: `docker-image`
- Retention: 7 days
- Contents: Compressed Docker image (`portyfoul-image.tar.gz`)
- Available on: Pushes to `main` branch

#### Workflow Behavior

**Build Success:**
```
✓ Type check
✓ Lint
✓ Build application
✓ Run tests (123 tests)
✓ Upload coverage
✓ Build Docker image
✓ Test Docker image
```

**Build Failure:**
```
✓ Type check
✓ Lint
✗ Build application (FAILED)
⊘ Run tests (SKIPPED)
⊘ Upload coverage (SKIPPED)
⊘ Build Docker image (SKIPPED)
```

The workflow will fail early if:
- Type checking fails
- Linting fails
- Build fails

Tests only run if the build succeeds.

#### Viewing Results

**On Pull Requests:**
- Workflow status appears as a check on the PR
- Click "Details" to view full logs
- Coverage reports available in "Artifacts" section

**On Pushes:**
- View in Actions tab: `https://github.com/YOUR_USERNAME/portyfoul/actions`
- Click on a workflow run to see detailed logs
- Download artifacts from the workflow run page

#### Local Testing

Test the workflow locally before pushing:

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build

# Run tests with coverage
npm test -- --coverage

# Build Docker image
docker build \
  --build-arg JWT_SECRET=test-secret \
  --build-arg FINNHUB_API_KEY=test-key \
  -t portyfoul:test .

# Test Docker image
docker run --rm portyfoul:test node --version
```

#### Troubleshooting

**Build fails with "JWT_SECRET is required"**
- Solution: Add `JWT_SECRET` to repository secrets or use default value

**Tests fail in CI but pass locally**
- Check Node.js version (CI uses 22.x)
- Verify all dependencies are in `package.json`
- Check for environment-specific issues

**Docker build fails**
- Verify Dockerfile syntax
- Check build arguments are provided
- Ensure `.dockerignore` is not excluding required files

**Out of disk space**
- Docker images are cleaned up automatically
- Coverage reports are deleted after 7 days
- Consider reducing artifact retention time

#### Performance

Typical execution times:
- Type check: ~10-15 seconds
- Lint: ~5-10 seconds
- Build: ~30-60 seconds
- Tests: ~10-20 seconds
- Docker build: ~60-120 seconds

Total workflow time: ~2-4 minutes

#### Optimization Tips

1. **Use caching**: npm cache is enabled via `actions/setup-node@v4`
2. **Parallel jobs**: Docker build runs in parallel after main build
3. **Fail fast**: `continue-on-error: false` stops on first failure
4. **Conditional steps**: Tests only run if build succeeds

## Best Practices

1. **Always run locally first**: Test changes before pushing
2. **Keep secrets secure**: Never commit secrets to repository
3. **Review workflow logs**: Check for warnings and deprecations
4. **Update regularly**: Keep actions and dependencies up to date
5. **Monitor artifacts**: Clean up old artifacts if storage is limited

## Future Enhancements

Potential improvements for this workflow:

- [ ] Add deployment job for production
- [ ] Publish Docker image to registry (Docker Hub, GitHub Container Registry)
- [ ] Add security scanning (Snyk, Trivy)
- [ ] Add performance testing
- [ ] Add integration tests
- [ ] Add matrix testing (multiple Node.js versions)
- [ ] Add automatic PR comments with test results
- [ ] Add code quality metrics (SonarQube, CodeClimate)
